// src/lib/intelligence/memory/memoryStore.ts
import fs from "fs";
import path from "path";
import { getPool } from "@/lib/db/queries";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type {
  AgentRunRecord,
  AgentEventRecord,
  AgentDecisionRecord,
  AgentFeedbackRecord,
  AgentFailureRecord,
  AgentEvaluationRecord,
  AgentLessonRecord,
  AgentStrategyRecord,
  AgentExperimentRecord,
  BusinessMemoryItem,
  MemoryRecordKind,
  TenantMemoryRecord,
} from "./memoryTypes";

export function redactSecretsInString(str: string): string {
  if (!str || typeof str !== "string") return str;
  return str
    .replace(/AIzaSy[A-Za-z0-9_-]{10,}/g, "[REDACTED_API_KEY]")
    .replace(/sk-[a-zA-Z0-9_-]{10,}/g, "[REDACTED_TOKEN]")
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{10,}/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/(api[_-]?key|secret|password|token)\s*[:=]\s*['"]?[^\s,'"}]+/gi, "$1=[REDACTED]");
}

export function redactSecretsInObject<T>(obj: T): T {
  if (!obj || typeof obj !== "object") {
    if (typeof obj === "string") return redactSecretsInString(obj) as any;
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(redactSecretsInObject) as any;

  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (/^(api[_-]?key|secret|password|token|auth_token|private_key)$/i.test(key)) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "string") {
      result[key] = redactSecretsInString(value);
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactSecretsInObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function isExplicitInMemoryMode(): boolean {
  if (process.env.MEMORY_STORE_IN_MEMORY_ONLY === "true") {
    return true;
  }
  if (process.env.NODE_ENV === "test" && process.env.MEMORY_STORE_USE_REAL_DB !== "true") {
    return true;
  }
  return false;
}

export function resolveTrustedTenant(tenantId?: string | null, candidateObj?: any): string {
  const isExplicitTest =
    process.env.MEMORY_STORE_ALLOW_TEST_TENANT === "true" ||
    process.env.NODE_ENV === "test";

  const explicitTenant =
    typeof tenantId === "string" && tenantId.trim().length > 0
      ? tenantId.trim()
      : null;

  const candidateTenant =
    (typeof candidateObj?.tenantId === "string" && candidateObj.tenantId.trim().length > 0
      ? candidateObj.tenantId.trim()
      : null) ||
    (typeof candidateObj?.metadata?.tenantId === "string" && candidateObj.metadata.tenantId.trim().length > 0
      ? candidateObj.metadata.tenantId.trim()
      : null);

  // If both are present, enforce that they DO NOT CONFLICT
  if (explicitTenant && candidateTenant && explicitTenant !== candidateTenant) {
    throw new Error(
      `Tenant context conflict: payload tenant '${candidateTenant}' does not match trusted tenant context '${explicitTenant}'`
    );
  }

  if (explicitTenant) {
    return explicitTenant;
  }

  // If candidateTenant is present in an explicit test environment:
  if (isExplicitTest) {
    if (candidateTenant) return candidateTenant;
    return "test_tenant";
  }

  // In production / live execution:
  // "Do not treat tenant/user IDs supplied inside arbitrary record payloads as authentication."
  // "Reject missing or conflicting tenant identity."
  throw new Error("Trusted tenant context required for private memory access");
}

export class MemoryStore {
  private static instance: MemoryStore;
  private localDir: string;

  // In-memory tenant-scoped records: key is `${tenantId}:${recordKind}:${recordId}`
  private tenantRecords: Map<string, TenantMemoryRecord> = new Map();

  // Quarantined legacy records with unresolved ownership
  private quarantinedRecords: Array<{ recordKind: string; recordId: string; data: unknown }> = [];

  private constructor() {
    this.localDir = path.resolve(process.cwd(), "scratch", "memory");
    this.ensureLocalDir();
    // In accordance with governance rules, hardcoded "verified" strategy seeds have been retired.
    // Active strategies must originate from governed, versioned human approval.
  }

  public static getInstance(): MemoryStore {
    if (!MemoryStore.instance) {
      MemoryStore.instance = new MemoryStore();
    }
    return MemoryStore.instance;
  }

  private ensureLocalDir(): void {
    try {
      if (!fs.existsSync(this.localDir)) {
        fs.mkdirSync(this.localDir, { recursive: true });
      }
    } catch {
      // Read-only filesystem in sandbox or production containers
    }
  }

  private recordKey(tenantId: string, recordKind: MemoryRecordKind, recordId: string): string {
    return `${tenantId}:${recordKind}:${recordId}`;
  }

  private findTestRecordPayload<T>(recordKind: MemoryRecordKind, recordId: string): T | undefined {
    const isExplicitTest =
      process.env.MEMORY_STORE_ALLOW_TEST_TENANT === "true" ||
      process.env.NODE_ENV === "test";
    if (!isExplicitTest) return undefined;
    for (const [k, v] of this.tenantRecords.entries()) {
      if (k.endsWith(`:${recordKind}:${recordId}`)) {
        return v.payload as T;
      }
    }
    return undefined;
  }

  // ─── UNIFIED TENANT-SCORED RECORD STORE (PostgreSQL Authoritative) ───────────

  public async saveRecord<T = unknown>(
    tenantId: string,
    recordKind: MemoryRecordKind,
    recordId: string,
    payload: T,
    expectedRevision?: number
  ): Promise<TenantMemoryRecord<T>> {
    const validTenant = resolveTrustedTenant(tenantId, payload);
    const key = this.recordKey(validTenant, recordKind, recordId);
    const existing = this.tenantRecords.get(key);

    const sanitizedPayload = redactSecretsInObject(payload);

    if (isExplicitInMemoryMode()) {
      if (expectedRevision !== undefined) {
        const currentRev = existing ? existing.revision : 0;
        if (currentRev !== expectedRevision) {
          throw new Error(
            `Optimistic concurrency violation: record '${recordId}' has revision ${currentRev}, expected ${expectedRevision}`
          );
        }
      }

      const nextRevision = (existing ? existing.revision : 0) + 1;
      const now = new Date().toISOString();
      const record: TenantMemoryRecord<T> = {
        tenantId: validTenant,
        recordKind,
        recordId,
        payload: sanitizedPayload,
        revision: nextRevision,
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };

      this.tenantRecords.set(key, record as TenantMemoryRecord);
      return record;
    }

    // Authoritative PostgreSQL persistence
    // MUST fail explicitly when PostgreSQL is unavailable or a write fails.
    // Cache MUST remain unchanged on failed writes or concurrency conflicts.
    const pool = getPool();
    if (!pool) {
      throw new Error(`Database connection pool unavailable; cannot persist memory record '${recordId}' for tenant '${validTenant}'`);
    }

    let savedRow: { revision: number; created_at: any; updated_at: any };

    try {
      if (expectedRevision !== undefined && expectedRevision > 0) {
        const updateRes = await pool.query(
          `UPDATE public.tenant_memory_records
           SET payload = $4, revision = revision + 1, updated_at = NOW()
           WHERE tenant_id = $1 AND record_kind = $2 AND record_id = $3 AND revision = $5
           RETURNING revision, created_at, updated_at`,
          [validTenant, recordKind, recordId, JSON.stringify(sanitizedPayload), expectedRevision]
        );
        if (updateRes.rowCount === 0) {
          throw new Error(
            `Optimistic concurrency conflict on PostgreSQL for record '${recordId}' at revision ${expectedRevision}`
          );
        }
        savedRow = updateRes.rows[0];
      } else if (expectedRevision === 0) {
        const insertRes = await pool.query(
          `INSERT INTO public.tenant_memory_records (tenant_id, record_kind, record_id, payload, revision, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
           RETURNING revision, created_at, updated_at`,
          [validTenant, recordKind, recordId, JSON.stringify(sanitizedPayload)]
        );
        savedRow = insertRes.rows[0];
      } else {
        const upsertRes = await pool.query(
          `INSERT INTO public.tenant_memory_records (tenant_id, record_kind, record_id, payload, revision, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 1, NOW(), NOW())
           ON CONFLICT (tenant_id, record_kind, record_id)
           DO UPDATE SET payload = EXCLUDED.payload, revision = public.tenant_memory_records.revision + 1, updated_at = NOW()
           RETURNING revision, created_at, updated_at`,
          [validTenant, recordKind, recordId, JSON.stringify(sanitizedPayload)]
        );
        savedRow = upsertRes.rows[0];
      }
    } catch (err: any) {
      // Cache remains unchanged on failure or conflict
      throw err;
    }

    // Cache updated ONLY AFTER successful database write
    const finalRecord: TenantMemoryRecord<T> = {
      tenantId: validTenant,
      recordKind,
      recordId,
      payload: sanitizedPayload,
      revision: savedRow.revision,
      createdAt: savedRow.created_at instanceof Date ? savedRow.created_at.toISOString() : String(savedRow.created_at),
      updatedAt: savedRow.updated_at instanceof Date ? savedRow.updated_at.toISOString() : String(savedRow.updated_at),
    };
    this.tenantRecords.set(key, finalRecord as TenantMemoryRecord);
    return finalRecord;
  }

  public async getRecord<T = unknown>(
    tenantId: string,
    recordKind: MemoryRecordKind,
    recordId: string
  ): Promise<TenantMemoryRecord<T> | undefined> {
    const validTenant = resolveTrustedTenant(tenantId);
    const key = this.recordKey(validTenant, recordKind, recordId);

    if (isExplicitInMemoryMode()) {
      return this.tenantRecords.get(key) as TenantMemoryRecord<T> | undefined;
    }

    const pool = getPool();
    if (!pool) {
      throw new Error(`Database connection pool unavailable; cannot read memory record '${recordId}' for tenant '${validTenant}'`);
    }

    const res = await pool.query(
      `SELECT payload, revision, created_at, updated_at
       FROM public.tenant_memory_records
       WHERE tenant_id = $1 AND record_kind = $2 AND record_id = $3`,
      [validTenant, recordKind, recordId]
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const record: TenantMemoryRecord<T> = {
        tenantId: validTenant,
        recordKind,
        recordId,
        payload: row.payload,
        revision: row.revision,
        createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
        updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
      };
      this.tenantRecords.set(key, record as TenantMemoryRecord);
      return record;
    }
    return undefined;
  }

  public async listRecords<T = unknown>(
    tenantId: string,
    recordKind: MemoryRecordKind,
    limit = 50
  ): Promise<TenantMemoryRecord<T>[]> {
    const validTenant = resolveTrustedTenant(tenantId);

    if (isExplicitInMemoryMode()) {
      const prefix = `${validTenant}:${recordKind}:`;
      const results: TenantMemoryRecord<T>[] = [];
      for (const [k, v] of this.tenantRecords.entries()) {
        if (k.startsWith(prefix)) {
          results.push(v as TenantMemoryRecord<T>);
        }
      }
      return results.slice(-limit).reverse();
    }

    const pool = getPool();
    if (!pool) {
      throw new Error(`Database connection pool unavailable; cannot list memory records for tenant '${validTenant}'`);
    }

    const res = await pool.query(
      `SELECT record_id, payload, revision, created_at, updated_at
       FROM public.tenant_memory_records
       WHERE tenant_id = $1 AND record_kind = $2
       ORDER BY updated_at DESC
       LIMIT $3`,
      [validTenant, recordKind, limit]
    );
    return res.rows.map((row) => ({
      tenantId: validTenant,
      recordKind,
      recordId: row.record_id || row.payload?.id || "",
      payload: row.payload,
      revision: row.revision,
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
      updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
    }));
  }

  // ─── LEGACY RECORD QUARANTINE ────────────────────────────────────────────────

  public quarantineLegacyRecord(recordKind: string, recordId: string, data: unknown): void {
    this.quarantinedRecords.push({ recordKind, recordId, data });
  }

  public getQuarantinedRecords(): Array<{ recordKind: string; recordId: string; data: unknown }> {
    return [...this.quarantinedRecords];
  }

  // ─── 1. AGENT RUNS ──────────────────────────────────────────────────────────

  public async saveRun(runOrTenant: string | AgentRunRecord, runData?: AgentRunRecord): Promise<AgentRunRecord> {
    let tenantId: string;
    let run: AgentRunRecord;

    if (typeof runOrTenant === "string") {
      tenantId = runOrTenant;
      run = runData!;
    } else {
      run = runOrTenant;
      tenantId = resolveTrustedTenant(undefined, run);
    }

    const sanitizedRun: AgentRunRecord = {
      ...run,
      objective: run.objective ? redactSecretsInString(run.objective) : run.objective,
      metadata: run.metadata ? redactSecretsInObject(run.metadata) : run.metadata,
      failureReason: run.failureReason ? redactSecretsInString(run.failureReason) : run.failureReason,
    };

    await this.saveRecord(tenantId, "run", sanitizedRun.runId, sanitizedRun);

    // Also persist to legacy agent_runs table for backwards compatibility
    try {
      const pool = getPool();
      const query = `
        INSERT INTO public.agent_runs (
          id, agent_name, session_id, user_id, project_id, status, model_provider, model_name,
          latency_ms, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          latency_ms = EXCLUDED.latency_ms,
          updated_at = EXCLUDED.updated_at
      `;
      const uuid = sanitizedRun.id && sanitizedRun.id.length === 36 ? sanitizedRun.id : undefined;
      if (uuid) {
        await pool.query(query, [
          uuid,
          sanitizedRun.agentId,
          sanitizedRun.sessionId ?? null,
          sanitizedRun.userId ?? null,
          sanitizedRun.projectId ?? null,
          sanitizedRun.status,
          "executive",
          "ceo_brain",
          sanitizedRun.durationMs ?? 0,
          sanitizedRun.createdAt,
          new Date().toISOString(),
        ]);
      }
    } catch {
      // Safe fallback
    }

    return sanitizedRun;
  }

  public async getRun(tenantOrRunId: string, optionalRunId?: string): Promise<AgentRunRecord | undefined> {
    const tenantId = optionalRunId ? tenantOrRunId : null;
    const runId = optionalRunId || tenantOrRunId;
    const validTenant = resolveTrustedTenant(tenantId);

    const rec = await this.getRecord<AgentRunRecord>(validTenant, "run", runId);
    if (rec?.payload) return rec.payload;

    if (!optionalRunId) {
      return this.findTestRecordPayload<AgentRunRecord>("run", runId);
    }
    return undefined;
  }

  public async listRuns(tenantOrLimit?: string | number, limitOrDomain?: number | string, domainFilter?: string): Promise<AgentRunRecord[]> {
    let tenantId: string | null = null;
    let limit = 20;
    let domain: string | undefined = undefined;

    if (typeof tenantOrLimit === "string") {
      tenantId = tenantOrLimit;
      if (typeof limitOrDomain === "number") limit = limitOrDomain;
      if (typeof domainFilter === "string") domain = domainFilter;
      else if (typeof limitOrDomain === "string") domain = limitOrDomain;
    } else {
      if (typeof tenantOrLimit === "number") limit = tenantOrLimit;
      if (typeof limitOrDomain === "string") domain = limitOrDomain;
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const records = await this.listRecords<AgentRunRecord>(validTenant, "run", limit * 2);
    let runs = records.map((r) => r.payload);
    if (domain) {
      runs = runs.filter((r) => r.domain && r.domain.toLowerCase() === domain!.toLowerCase());
    }
    return runs.slice(0, limit);
  }

  // ─── 2. AGENT EVENTS ────────────────────────────────────────────────────────

  public async saveEvent(tenantOrEvent: string | any, eventData?: any): Promise<void> {
    let tenantId: string | undefined;
    let event: any;

    if (typeof tenantOrEvent === "string") {
      tenantId = tenantOrEvent;
      event = eventData;
    } else {
      event = tenantOrEvent;
    }

    const validTenant = resolveTrustedTenant(tenantId, event);
    const evtId = event.eventId || event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record: AgentEventRecord = {
      ...event,
      id: event.id || evtId,
      eventId: evtId,
    };

    await this.saveRecord(validTenant, "event", evtId, record);
  }

  public async getEventsByRunId(tenantOrRunId: string, optionalRunId?: string): Promise<AgentEventRecord[]> {
    const tenantId = optionalRunId ? tenantOrRunId : null;
    const runId = optionalRunId || tenantOrRunId;
    const validTenant = resolveTrustedTenant(tenantId);

    const records = await this.listRecords<AgentEventRecord>(validTenant, "event", 100);
    return records.map((r) => r.payload).filter((e) => e.runId === runId);
  }

  public async listEvents(tenantOrRunId?: string, runId?: string): Promise<AgentEventRecord[]> {
    let tenantId: string | null = null;
    let targetRunId: string | undefined = undefined;

    if (tenantOrRunId && runId) {
      tenantId = tenantOrRunId;
      targetRunId = runId;
    } else if (tenantOrRunId) {
      if (tenantOrRunId.startsWith("usr_") || tenantOrRunId.startsWith("tenant_") || tenantOrRunId.length === 36) {
        tenantId = tenantOrRunId;
      } else {
        targetRunId = tenantOrRunId;
      }
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const records = await this.listRecords<AgentEventRecord>(validTenant, "event", 100);
    let events = records.map((r) => r.payload);
    if (targetRunId) events = events.filter((e) => e.runId === targetRunId);
    return events;
  }

  // ─── 3. AGENT DECISIONS ─────────────────────────────────────────────────────

  public async saveDecision(tenantOrDecision: string | any, decisionData?: any): Promise<void> {
    let tenantId: string;
    let decision: any;

    if (typeof tenantOrDecision === "string") {
      tenantId = tenantOrDecision;
      decision = decisionData;
    } else {
      decision = tenantOrDecision;
      tenantId = resolveTrustedTenant(undefined, decision);
    }

    const decId = decision.decisionId || decision.id || `dec_${Date.now()}`;
    const record: AgentDecisionRecord = {
      ...decision,
      id: decision.id || decId,
      decisionId: decId,
    };

    await this.saveRecord(tenantId, "decision", decId, record);

    try {
      const pool = getPool();
      const query = `
        INSERT INTO public.agent_decisions (
          run_id, agent_name, input_summary, decision_output, confidence_score, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `;
      if (record.runId && record.runId.length === 36) {
        await pool.query(query, [
          record.runId,
          "executive",
          JSON.stringify({ objective: record.objective }),
          JSON.stringify({
            action: record.chosenAction,
            reasoning: record.reasoningSummary,
            alternatives: record.alternativesConsidered,
          }),
          record.confidence,
          JSON.stringify({ evidence: record.evidence }),
        ]);
      }
    } catch {
      // Safe fallback
    }
  }

  public async getDecision(tenantOrId: string, idOrRunId?: string): Promise<AgentDecisionRecord | undefined> {
    const tenantId = idOrRunId ? tenantOrId : null;
    const lookupId = idOrRunId || tenantOrId;
    const validTenant = resolveTrustedTenant(tenantId);

    const rec = await this.getRecord<AgentDecisionRecord>(validTenant, "decision", lookupId);
    if (rec?.payload) return rec.payload;

    const list = await this.listRecords<AgentDecisionRecord>(validTenant, "decision", 100);
    const found = list.map((r) => r.payload).find((d) => d.runId === lookupId);
    if (found) return found;

    if (!idOrRunId) {
      return this.findTestRecordPayload<AgentDecisionRecord>("decision", lookupId);
    }
    return undefined;
  }

  public async getDecisionsByRunId(tenantOrRunId: string, runId?: string): Promise<AgentDecisionRecord[]> {
    const tenantId = runId ? tenantOrRunId : null;
    const targetRunId = runId || tenantOrRunId;
    const validTenant = resolveTrustedTenant(tenantId);

    const list = await this.listRecords<AgentDecisionRecord>(validTenant, "decision", 100);
    return list.map((r) => r.payload).filter((d) => d.runId === targetRunId);
  }

  public async getDecisions(tenantOrOptions?: string | { limit?: number }, options?: { limit?: number }): Promise<AgentDecisionRecord[]> {
    let tenantId: string | null = null;
    let limit = 50;

    if (typeof tenantOrOptions === "string") {
      tenantId = tenantOrOptions;
      if (options?.limit) limit = options.limit;
    } else if (tenantOrOptions?.limit) {
      limit = tenantOrOptions.limit;
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const list = await this.listRecords<AgentDecisionRecord>(validTenant, "decision", limit);
    return list.map((r) => r.payload);
  }

  public async listDecisions(tenantOrLimit?: string | number, limit = 50): Promise<AgentDecisionRecord[]> {
    let tenantId: string | null = null;
    let max = limit;

    if (typeof tenantOrLimit === "string") {
      tenantId = tenantOrLimit;
    } else if (typeof tenantOrLimit === "number") {
      max = tenantOrLimit;
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const list = await this.listRecords<AgentDecisionRecord>(validTenant, "decision", max);
    return list.map((r) => r.payload);
  }

  // ─── 4. AGENT FEEDBACK ──────────────────────────────────────────────────────

  public async saveFeedback(tenantOrFeedback: string | AgentFeedbackRecord, feedbackData?: AgentFeedbackRecord): Promise<void> {
    let tenantId: string | undefined;
    let feedback: AgentFeedbackRecord;

    if (typeof tenantOrFeedback === "string") {
      tenantId = tenantOrFeedback;
      feedback = feedbackData!;
    } else {
      feedback = tenantOrFeedback;
    }

    const validTenant = resolveTrustedTenant(tenantId, feedback);
    await this.saveRecord(validTenant, "feedback", feedback.feedbackId, feedback);
  }

  public async getFeedbackByRunId(tenantOrRunId: string, runId?: string): Promise<AgentFeedbackRecord[]> {
    const tenantId = runId ? tenantOrRunId : null;
    const targetRunId = runId || tenantOrRunId;
    const validTenant = resolveTrustedTenant(tenantId);

    const list = await this.listRecords<AgentFeedbackRecord>(validTenant, "feedback", 100);
    return list.map((r) => r.payload).filter((f) => f.runId === targetRunId);
  }

  public async listFeedback(tenantOrRunId?: string, runId?: string): Promise<AgentFeedbackRecord[]> {
    let tenantId: string | null = null;
    let targetRunId: string | undefined = undefined;

    if (tenantOrRunId && runId) {
      tenantId = tenantOrRunId;
      targetRunId = runId;
    } else if (tenantOrRunId) {
      if (tenantOrRunId.startsWith("usr_") || tenantOrRunId.startsWith("tenant_") || tenantOrRunId.length === 36) {
        tenantId = tenantOrRunId;
      } else {
        targetRunId = tenantOrRunId;
      }
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const list = await this.listRecords<AgentFeedbackRecord>(validTenant, "feedback", 100);
    let feedback = list.map((r) => r.payload);
    if (targetRunId) feedback = feedback.filter((f) => f.runId === targetRunId);
    return feedback;
  }

  // ─── 5. AGENT FAILURES ──────────────────────────────────────────────────────

  public async saveFailure(tenantOrFailure: string | any, failureData?: any): Promise<AgentFailureRecord> {
    let tenantId: string | undefined;
    let failure: any;

    if (typeof tenantOrFailure === "string") {
      tenantId = tenantOrFailure;
      failure = failureData;
    } else {
      failure = tenantOrFailure;
    }

    const validTenant = resolveTrustedTenant(tenantId, failure);
    const rawError = failure.errorMessage || failure.safeErrorMessage || "";
    const safeError = failure.safeErrorMessage || failure.errorMessage || "Unknown error";
    const sanitizedFailure: AgentFailureRecord = {
      ...failure,
      id: failure.id || failure.failureId,
      failureId: failure.failureId || failure.id,
      agentId: failure.agentId || "executive",
      errorCode: failure.errorCode || failure.failureType || "FAILURE",
      attemptedAction: failure.attemptedAction || "execute",
      retryCount: failure.retryCount ?? (failure.occurrences ? failure.occurrences - 1 : 0),
      recovered: failure.recovered ?? false,
      domain: failure.domain || "general",
      safeErrorMessage: redactSecretsInString(sanitizeErrorOutput(safeError)),
      errorMessage: redactSecretsInString(sanitizeErrorOutput(rawError)),
      rootCause: failure.rootCause ? redactSecretsInString(sanitizeErrorOutput(failure.rootCause)) : undefined,
      recoveryStrategy: failure.recoveryStrategy ? redactSecretsInString(sanitizeErrorOutput(failure.recoveryStrategy)) : undefined,
      metadata: failure.metadata ? redactSecretsInObject(failure.metadata) : {},
      createdAt: failure.createdAt || new Date().toISOString(),
    } as any;

    await this.saveRecord(validTenant, "failure", sanitizedFailure.failureId, sanitizedFailure);
    return sanitizedFailure;
  }

  public async listFailures(tenantOrLimit?: string | number, limitOrDomain?: number | string, domainFilter?: string): Promise<AgentFailureRecord[]> {
    let tenantId: string | null = null;
    let limit = 20;
    let domain: string | undefined = undefined;

    if (typeof tenantOrLimit === "string") {
      tenantId = tenantOrLimit;
      if (typeof limitOrDomain === "number") limit = limitOrDomain;
      if (typeof domainFilter === "string") domain = domainFilter;
      else if (typeof limitOrDomain === "string") domain = limitOrDomain;
    } else {
      if (typeof tenantOrLimit === "number") limit = tenantOrLimit;
      if (typeof limitOrDomain === "string") domain = limitOrDomain;
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const records = await this.listRecords<AgentFailureRecord>(validTenant, "failure", limit * 2);
    let failures = records.map((r) => r.payload);
    if (domain) {
      failures = failures.filter((f) => f.domain && f.domain.toLowerCase() === domain!.toLowerCase());
    }
    return failures.slice(0, limit);
  }

  // ─── 6. AGENT EVALUATIONS ───────────────────────────────────────────────────

  public async saveEvaluation(tenantOrEval: string | AgentEvaluationRecord, evalData?: AgentEvaluationRecord): Promise<void> {
    let tenantId: string | undefined;
    let evaluation: AgentEvaluationRecord;

    if (typeof tenantOrEval === "string") {
      tenantId = tenantOrEval;
      evaluation = evalData!;
    } else {
      evaluation = tenantOrEval;
    }

    const validTenant = resolveTrustedTenant(tenantId, evaluation);
    await this.saveRecord(validTenant, "evaluation", evaluation.evaluationId, evaluation);
  }

  public async getEvaluation(tenantOrId: string, idOrRunId?: string): Promise<AgentEvaluationRecord | undefined> {
    const tenantId = idOrRunId ? tenantOrId : null;
    const targetId = idOrRunId || tenantOrId;
    const validTenant = resolveTrustedTenant(tenantId);

    const rec = await this.getRecord<AgentEvaluationRecord>(validTenant, "evaluation", targetId);
    if (rec?.payload) return rec.payload;

    const list = await this.listRecords<AgentEvaluationRecord>(validTenant, "evaluation", 100);
    const found = list.map((r) => r.payload).find((e) => e.runId === targetId);
    if (found) return found;

    if (!idOrRunId) {
      return this.findTestRecordPayload<AgentEvaluationRecord>("evaluation", targetId);
    }
    return undefined;
  }

  public async getEvaluationByRunId(tenantOrRunId: string, runId?: string): Promise<AgentEvaluationRecord | undefined> {
    return this.getEvaluation(tenantOrRunId, runId);
  }

  // ─── 7. AGENT LESSONS ───────────────────────────────────────────────────────

  public async saveLesson(tenantOrLesson: string | AgentLessonRecord, lessonData?: AgentLessonRecord, expectedRevision?: number): Promise<void> {
    let tenantId: string | undefined;
    let lesson: AgentLessonRecord;

    if (typeof tenantOrLesson === "string") {
      tenantId = tenantOrLesson;
      lesson = lessonData!;
    } else {
      lesson = tenantOrLesson;
    }

    const validTenant = resolveTrustedTenant(tenantId, lesson);
    await this.saveRecord(validTenant, "lesson", lesson.lessonId, lesson, expectedRevision);
  }

  public async getLesson(tenantOrId: string, lessonId?: string): Promise<AgentLessonRecord | undefined> {
    const tenantId = lessonId ? tenantOrId : null;
    const targetId = lessonId || tenantOrId;
    const validTenant = resolveTrustedTenant(tenantId);

    const rec = await this.getRecord<AgentLessonRecord>(validTenant, "lesson", targetId);
    if (rec?.payload) return rec.payload;

    if (!lessonId) {
      return this.findTestRecordPayload<AgentLessonRecord>("lesson", targetId);
    }
    return undefined;
  }

  public async listLessons(tenantOrDomain?: string, domainOrStatus?: string, statusFilter?: string): Promise<AgentLessonRecord[]> {
    let tenantId: string | null = null;
    let domain: string | undefined = undefined;
    let status: string | undefined = undefined;

    if (tenantOrDomain && domainOrStatus && statusFilter) {
      tenantId = tenantOrDomain;
      domain = domainOrStatus;
      status = statusFilter;
    } else if (tenantOrDomain && domainOrStatus) {
      tenantId = tenantOrDomain;
      domain = domainOrStatus;
    } else if (tenantOrDomain) {
      if (tenantOrDomain.startsWith("usr_") || tenantOrDomain.startsWith("tenant_") || tenantOrDomain.length === 36) {
        tenantId = tenantOrDomain;
      } else {
        domain = tenantOrDomain;
      }
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const records = await this.listRecords<AgentLessonRecord>(validTenant, "lesson", 100);
    let lessons = records.map((r) => r.payload);
    if (domain) {
      lessons = lessons.filter((l) => l.domain && l.domain.toLowerCase() === domain!.toLowerCase());
    }
    if (status) {
      lessons = lessons.filter((l) => l.status === status);
    }
    return lessons;
  }

  // ─── 8. AGENT STRATEGIES ────────────────────────────────────────────────────

  public async saveStrategy(tenantOrStrategy: string | AgentStrategyRecord, strategyData?: AgentStrategyRecord, expectedRevision?: number): Promise<void> {
    let tenantId: string | undefined;
    let strategy: AgentStrategyRecord;

    if (typeof tenantOrStrategy === "string") {
      tenantId = tenantOrStrategy;
      strategy = strategyData!;
    } else {
      strategy = tenantOrStrategy;
    }

    const validTenant = resolveTrustedTenant(tenantId, strategy);
    strategy.tenantId = validTenant;
    await this.saveRecord(validTenant, "strategy", strategy.strategyId, strategy, expectedRevision);
  }

  public async getStrategy(tenantOrId: string, strategyId?: string): Promise<AgentStrategyRecord | undefined> {
    const tenantId = strategyId ? tenantOrId : null;
    const targetId = strategyId || tenantOrId;
    const validTenant = resolveTrustedTenant(tenantId);

    const rec = await this.getRecord<AgentStrategyRecord>(validTenant, "strategy", targetId);
    if (rec?.payload) return rec.payload;

    if (!strategyId) {
      return this.findTestRecordPayload<AgentStrategyRecord>("strategy", targetId);
    }
    return undefined;
  }

  public async getActiveStrategyForDomain(arg1: string, arg2?: string | null): Promise<AgentStrategyRecord | undefined> {
    let tenantId: string | null = null;
    let domain: string = "general";

    if (arg2 !== undefined && arg2 !== null) {
      if (arg1.startsWith("usr_") || arg1.startsWith("tenant_") || arg1.includes("tenant") || arg1.length === 36) {
        tenantId = arg1;
        domain = arg2;
      } else if (arg2.startsWith("usr_") || arg2.startsWith("tenant_") || arg2.includes("tenant") || arg2.length === 36) {
        tenantId = arg2;
        domain = arg1;
      } else {
        tenantId = arg1;
        domain = arg2;
      }
    } else {
      domain = arg1;
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const strategies = await this.listStrategies(validTenant, domain);
    return strategies.find((s) => s.status === "ACTIVE");
  }

  public async listStrategies(arg1?: string, arg2?: string | null): Promise<AgentStrategyRecord[]> {
    let tenantId: string | null = null;
    let domain: string | undefined = undefined;

    if (arg1 && arg2 !== undefined && arg2 !== null) {
      if (arg1.startsWith("usr_") || arg1.startsWith("tenant_") || arg1.includes("tenant") || arg1.length === 36) {
        tenantId = arg1;
        domain = arg2 || undefined;
      } else if (arg2.startsWith("usr_") || arg2.startsWith("tenant_") || arg2.includes("tenant") || arg2.length === 36) {
        tenantId = arg2;
        domain = arg1 || undefined;
      } else {
        tenantId = arg1;
        domain = arg2 || undefined;
      }
    } else if (arg1) {
      if (arg1.startsWith("usr_") || arg1.startsWith("tenant_") || arg1.includes("tenant") || arg1.length === 36) {
        tenantId = arg1;
      } else {
        domain = arg1;
      }
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const records = await this.listRecords<AgentStrategyRecord>(validTenant, "strategy", 100);
    let strategies = records.map((r) => r.payload);
    if (domain) {
      strategies = strategies.filter((s) => s.domain && s.domain.toLowerCase() === domain!.toLowerCase());
    }
    return strategies;
  }

  // ─── 9. AGENT EXPERIMENTS ───────────────────────────────────────────────────

  public async saveExperiment(tenantOrExp: string | AgentExperimentRecord, expData?: AgentExperimentRecord, expectedRevision?: number): Promise<void> {
    let tenantId: string | undefined;
    let exp: AgentExperimentRecord;

    if (typeof tenantOrExp === "string") {
      tenantId = tenantOrExp;
      exp = expData!;
    } else {
      exp = tenantOrExp;
    }

    const validTenant = resolveTrustedTenant(tenantId, exp);
    await this.saveRecord(validTenant, "experiment", exp.experimentId, exp, expectedRevision);
  }

  public async getExperiment(tenantOrId: string, experimentId?: string): Promise<AgentExperimentRecord | undefined> {
    const tenantId = experimentId ? tenantOrId : null;
    const targetId = experimentId || tenantOrId;
    const validTenant = resolveTrustedTenant(tenantId);

    const rec = await this.getRecord<AgentExperimentRecord>(validTenant, "experiment", targetId);
    if (rec?.payload) return rec.payload;

    if (!experimentId) {
      return this.findTestRecordPayload<AgentExperimentRecord>("experiment", targetId);
    }
    return undefined;
  }

  public async listExperiments(tenantOrDomain?: string, domainFilter?: string): Promise<AgentExperimentRecord[]> {
    let tenantId: string | null = null;
    let domain: string | undefined = undefined;

    if (tenantOrDomain && domainFilter) {
      tenantId = tenantOrDomain;
      domain = domainFilter;
    } else if (tenantOrDomain) {
      if (tenantOrDomain.startsWith("usr_") || tenantOrDomain.startsWith("tenant_") || tenantOrDomain.length === 36) {
        tenantId = tenantOrDomain;
      } else {
        domain = tenantOrDomain;
      }
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const records = await this.listRecords<AgentExperimentRecord>(validTenant, "experiment", 50);
    let exps = records.map((r) => r.payload);
    if (domain) {
      exps = exps.filter((e) => e.domain && e.domain.toLowerCase() === domain!.toLowerCase());
    }
    return exps;
  }

  // ─── 10. BUSINESS MEMORY (Strictly Isolated) ───────────────────────────────

  public async saveBusinessMemory(tenantOrMemory: string | any, memoryData?: any): Promise<void> {
    let tenantId: string | undefined;
    let memory: any;

    if (typeof tenantOrMemory === "string") {
      tenantId = tenantOrMemory;
      memory = memoryData;
    } else {
      memory = tenantOrMemory;
    }

    const validTenant = resolveTrustedTenant(tenantId, memory);
    const key = memory.projectId || memory.id;
    await this.saveRecord(validTenant, "business", key, memory);
  }

  public async getBusinessMemory(tenantOrProject: string, userOrProject?: string | null): Promise<any | undefined> {
    let tenantId: string | null = null;
    let projectId: string;

    if (userOrProject) {
      if (tenantOrProject.startsWith("usr_") || tenantOrProject.startsWith("tenant_") || tenantOrProject.length === 36) {
        tenantId = tenantOrProject;
        projectId = userOrProject;
      } else {
        projectId = tenantOrProject;
        tenantId = userOrProject;
      }
    } else {
      projectId = tenantOrProject;
    }

    const validTenant = resolveTrustedTenant(tenantId);
    const rec = await this.getRecord(validTenant, "business", projectId);
    return rec?.payload;
  }

  public async listBusinessMemories(tenantOrUserId?: string | null, projectId?: string): Promise<any[]> {
    const validTenant = resolveTrustedTenant(tenantOrUserId);
    const records = await this.listRecords(validTenant, "business", 50);
    let memories = records.map((r) => r.payload);
    if (projectId) {
      memories = memories.filter((m: any) => m.projectId === projectId);
    }
    return memories;
  }

  public clear(tenantId?: string): void {
    if (tenantId) {
      const prefix = `${tenantId}:`;
      for (const k of Array.from(this.tenantRecords.keys())) {
        if (k.startsWith(prefix)) {
          this.tenantRecords.delete(k);
        }
      }
    } else {
      this.tenantRecords.clear();
      this.quarantinedRecords = [];
    }
  }
}

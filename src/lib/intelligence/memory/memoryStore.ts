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

export class MemoryStore {
  private static instance: MemoryStore;
  private localDir: string;

  // In-memory fallback stores (for tests, local dev, or during DB offline state)
  private runs: Map<string, AgentRunRecord> = new Map();
  private events: Map<string, AgentEventRecord> = new Map();
  private decisions: Map<string, AgentDecisionRecord> = new Map();
  private feedback: Map<string, AgentFeedbackRecord> = new Map();
  private failures: Map<string, AgentFailureRecord> = new Map();
  private evaluations: Map<string, AgentEvaluationRecord> = new Map();
  private lessons: Map<string, AgentLessonRecord> = new Map();
  private strategies: Map<string, AgentStrategyRecord> = new Map();
  private experiments: Map<string, AgentExperimentRecord> = new Map();
  private businessMemories: Map<string, BusinessMemoryItem> = new Map();

  private constructor() {
    this.localDir = path.resolve(process.cwd(), "scratch", "memory");
    this.ensureLocalDir();
    this.seedDefaultStrategies();
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
      // Ignore directory creation error in read-only sandbox environments
    }
  }

  private persistLocal(collection: string, id: string, data: unknown): void {
    try {
      this.ensureLocalDir();
      const colDir = path.join(this.localDir, collection);
      if (!fs.existsSync(colDir)) fs.mkdirSync(colDir, { recursive: true });
      fs.writeFileSync(path.join(colDir, `${id}.json`), JSON.stringify(data, null, 2), "utf-8");
    } catch {
      // In-memory store remains authoritative if disk write is blocked
    }
  }

  private seedDefaultStrategies(): void {
    // Seed verified baseline strategies for common domains
    const defaultRestaurant: AgentStrategyRecord = {
      id: "strat_rest_v1",
      strategyId: "strategy_restaurant_v1",
      name: "Visual Appetite & Sensory Dining Strategy",
      domain: "restaurant",
      version: "strategy_v1",
      status: "ACTIVE",
      description: "Warm atmospheric hero, high-contrast typography, interactive reservation CTA, zero cold industrial motifs.",
      directives: [
        "Hero section must emphasize ambiance and culinary craftsmanship.",
        "Menu must be structured with high readability and dietary tags.",
        "Include reservation or table booking conversion CTA.",
      ],
      avoidPatterns: ["bike rental", "car repair", "clinical sterile blue themes", "generic corporate placeholder copy"],
      confidence: 0.95,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
    };
    this.strategies.set(defaultRestaurant.strategyId, defaultRestaurant);

    const defaultRetail: AgentStrategyRecord = {
      id: "strat_retail_v1",
      strategyId: "strategy_retail_v1",
      name: "Boutique Showcase & Social Proof Strategy",
      domain: "retail",
      version: "strategy_v1",
      status: "ACTIVE",
      description: "Editorial product grid, tactile surfaces, localized customer reviews, clear catalog access.",
      directives: [
        "Feature curated collections with editorial visual hierarchy.",
        "Prominent store location, opening hours, and direct visit CTA.",
      ],
      avoidPatterns: ["dense legalistic text", "misaligned price grids"],
      confidence: 0.92,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activatedAt: new Date().toISOString(),
    };
    this.strategies.set(defaultRetail.strategyId, defaultRetail);
  }

  // ─── 1. AGENT RUNS ──────────────────────────────────────────────────────────

  public async saveRun(run: AgentRunRecord): Promise<AgentRunRecord> {
    const sanitizedRun: AgentRunRecord = {
      ...run,
      objective: run.objective ? redactSecretsInString(run.objective) : run.objective,
      metadata: run.metadata ? redactSecretsInObject(run.metadata) : run.metadata,
      failureReason: run.failureReason ? redactSecretsInString(run.failureReason) : run.failureReason,
    };
    this.runs.set(sanitizedRun.runId, sanitizedRun);
    this.persistLocal("runs", sanitizedRun.runId, sanitizedRun);

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
      // Check if valid UUID or generate one
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
      // Safe fallback to local/in-memory store
    }
    return sanitizedRun;
  }

  public async getRun(runId: string): Promise<AgentRunRecord | undefined> {
    return this.runs.get(runId);
  }

  public async listRuns(limit = 20, domain?: string): Promise<AgentRunRecord[]> {
    let list = Array.from(this.runs.values());
    if (domain) {
      list = list.filter((r) => r.domain && r.domain.toLowerCase() === domain.toLowerCase());
    }
    return list.slice(-limit).reverse();
  }

  // ─── 2. AGENT EVENTS ────────────────────────────────────────────────────────

  public async saveEvent(event: any): Promise<void> {
    const evtId = event.eventId || event.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record: AgentEventRecord = {
      ...event,
      id: event.id || evtId,
      eventId: evtId,
    };
    this.events.set(evtId, record);
    this.persistLocal("events", evtId, record);

    try {
      const pool = getPool();
      const query = `
        INSERT INTO public.agent_events (
          event_id, run_id, parent_event_id, agent_id, event_type, timestamp, duration_ms, payload, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (event_id) DO NOTHING
      `;
      await pool.query(query, [
        event.eventId,
        event.runId,
        event.parentEventId ?? null,
        event.agentId,
        event.eventType,
        event.timestamp,
        event.durationMs ?? null,
        JSON.stringify(event.payload ?? {}),
        JSON.stringify(event.metadata ?? {}),
      ]);
    } catch {
      // Safe fallback
    }
  }

  public async getEventsByRunId(runId: string): Promise<AgentEventRecord[]> {
    return Array.from(this.events.values()).filter((e) => e.runId === runId);
  }

  public async listEvents(runId?: string): Promise<AgentEventRecord[]> {
    let list = Array.from(this.events.values());
    if (runId) {
      list = list.filter((e) => e.runId === runId);
    }
    return list;
  }

  // ─── 3. AGENT DECISIONS ─────────────────────────────────────────────────────

  public async saveDecision(decision: any): Promise<void> {
    const decId = decision.decisionId || decision.id || `dec_${Date.now()}`;
    const record: AgentDecisionRecord = {
      ...decision,
      id: decision.id || decId,
      decisionId: decId,
    };
    this.decisions.set(decId, record);
    this.persistLocal("decisions", decId, record);

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

  public async getDecision(idOrRunId: string): Promise<AgentDecisionRecord | undefined> {
    const direct = this.decisions.get(idOrRunId);
    if (direct) return direct;
    return Array.from(this.decisions.values()).find((d) => d.runId === idOrRunId);
  }

  public async getDecisionsByRunId(runId: string): Promise<AgentDecisionRecord[]> {
    return Array.from(this.decisions.values()).filter((d) => d.runId === runId);
  }

  public async getDecisions(options?: { limit?: number }): Promise<AgentDecisionRecord[]> {
    const limit = options?.limit ?? 50;
    return Array.from(this.decisions.values()).slice(-limit).reverse();
  }

  public async listDecisions(limit = 50): Promise<AgentDecisionRecord[]> {
    return Array.from(this.decisions.values()).slice(-limit).reverse();
  }

  // ─── 4. AGENT FEEDBACK ──────────────────────────────────────────────────────

  public async saveFeedback(feedback: AgentFeedbackRecord): Promise<void> {
    this.feedback.set(feedback.feedbackId, feedback);
    this.persistLocal("feedback", feedback.feedbackId, feedback);

    try {
      const pool = getPool();
      const query = `
        INSERT INTO public.agent_feedback (
          feedback_id, run_id, project_id, user_id, feedback_type, source, sentiment, rating, correction_text, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (feedback_id) DO UPDATE SET
          feedback_type = EXCLUDED.feedback_type,
          sentiment = EXCLUDED.sentiment,
          correction_text = EXCLUDED.correction_text
      `;
      await pool.query(query, [
        feedback.feedbackId,
        feedback.runId,
        feedback.projectId ?? null,
        feedback.userId ?? null,
        feedback.feedbackType,
        feedback.source,
        feedback.sentiment ?? null,
        feedback.rating ?? null,
        feedback.correctionText ?? null,
        JSON.stringify(feedback.metadata ?? {}),
      ]);
    } catch {
      // Safe fallback
    }
  }

  public async getFeedbackByRunId(runId: string): Promise<AgentFeedbackRecord[]> {
    return Array.from(this.feedback.values()).filter((f) => f.runId === runId);
  }

  public async listFeedback(runId?: string): Promise<AgentFeedbackRecord[]> {
    let list = Array.from(this.feedback.values());
    if (runId) {
      list = list.filter((f) => f.runId === runId);
    }
    return list;
  }

  // ─── 5. AGENT FAILURES ──────────────────────────────────────────────────────

  public async saveFailure(failure: any): Promise<AgentFailureRecord> {
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

    this.failures.set(sanitizedFailure.failureId, sanitizedFailure);
    this.persistLocal("failures", sanitizedFailure.failureId, sanitizedFailure);

    try {
      const pool = getPool();
      const query = `
        INSERT INTO public.agent_failures (
          failure_id, run_id, agent_id, failure_type, error_code, safe_error_message,
          attempted_action, retry_count, recovery_action, recovered, domain, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (failure_id) DO UPDATE SET
          recovered = EXCLUDED.recovered,
          retry_count = EXCLUDED.retry_count,
          recovery_action = EXCLUDED.recovery_action
      `;
      await pool.query(query, [
        sanitizedFailure.failureId,
        sanitizedFailure.runId,
        sanitizedFailure.agentId,
        sanitizedFailure.failureType,
        sanitizedFailure.errorCode,
        sanitizedFailure.safeErrorMessage,
        sanitizedFailure.attemptedAction,
        sanitizedFailure.retryCount,
        sanitizedFailure.recoveryAction ?? null,
        sanitizedFailure.recovered,
        sanitizedFailure.domain,
        JSON.stringify(sanitizedFailure.metadata ?? {}),
      ]);
    } catch {
      // Safe fallback
    }
    return sanitizedFailure;
  }

  public async listFailures(limit = 20, domain?: string): Promise<AgentFailureRecord[]> {
    let list = Array.from(this.failures.values());
    if (domain) {
      list = list.filter((f) => f.domain && f.domain.toLowerCase() === domain.toLowerCase());
    }
    return list.slice(-limit).reverse();
  }

  // ─── 6. AGENT EVALUATIONS ───────────────────────────────────────────────────

  public async saveEvaluation(evaluation: AgentEvaluationRecord): Promise<void> {
    this.evaluations.set(evaluation.evaluationId, evaluation);
    this.persistLocal("evaluations", evaluation.evaluationId, evaluation);

    try {
      const pool = getPool();
      const query = `
        INSERT INTO public.agent_evaluations (
          evaluation_id, run_id, domain, correctness_score, safety_score, validation_score,
          efficiency_score, overall_score, passed, evaluator, dimension_scores, observations, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (evaluation_id) DO UPDATE SET
          overall_score = EXCLUDED.overall_score,
          passed = EXCLUDED.passed
      `;
      await pool.query(query, [
        evaluation.evaluationId,
        evaluation.runId,
        evaluation.domain,
        evaluation.correctnessScore,
        evaluation.safetyScore,
        evaluation.validationScore,
        evaluation.efficiencyScore,
        evaluation.overallScore,
        evaluation.passed,
        evaluation.evaluator,
        JSON.stringify(evaluation.dimensionScores ?? {}),
        JSON.stringify(evaluation.observations ?? []),
        JSON.stringify(evaluation.metadata ?? {}),
      ]);
    } catch {
      // Safe fallback
    }
  }

  public async getEvaluation(idOrRunId: string): Promise<AgentEvaluationRecord | undefined> {
    const direct = this.evaluations.get(idOrRunId);
    if (direct) return direct;
    return Array.from(this.evaluations.values()).find((e) => e.runId === idOrRunId);
  }

  public async getEvaluationByRunId(runId: string): Promise<AgentEvaluationRecord | undefined> {
    return Array.from(this.evaluations.values()).find((e) => e.runId === runId);
  }

  // ─── 7. AGENT LESSONS ───────────────────────────────────────────────────────

  public async saveLesson(lesson: AgentLessonRecord): Promise<void> {
    this.lessons.set(lesson.lessonId, lesson);
    this.persistLocal("lessons", lesson.lessonId, lesson);

    try {
      const pool = getPool();
      const query = `
        INSERT INTO public.agent_lessons (
          lesson_id, title, statement, domain, status, confidence, source_run_ids,
          evidence, supporting_outcomes, contradicting_outcomes, validation_count,
          strategy_version, promoted_at, metadata, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
        ON CONFLICT (lesson_id) DO UPDATE SET
          status = EXCLUDED.status,
          confidence = EXCLUDED.confidence,
          evidence = EXCLUDED.evidence,
          supporting_outcomes = EXCLUDED.supporting_outcomes,
          contradicting_outcomes = EXCLUDED.contradicting_outcomes,
          validation_count = EXCLUDED.validation_count,
          promoted_at = EXCLUDED.promoted_at,
          updated_at = now()
      `;
      await pool.query(query, [
        lesson.lessonId,
        lesson.title,
        lesson.statement,
        lesson.domain,
        lesson.status,
        lesson.confidence,
        JSON.stringify(lesson.sourceRunIds ?? []),
        JSON.stringify(lesson.evidence ?? []),
        lesson.supportingOutcomes,
        lesson.contradictingOutcomes,
        lesson.validationCount,
        lesson.strategyVersion ?? null,
        lesson.promotedAt ?? null,
        JSON.stringify(lesson.metadata ?? {}),
      ]);
    } catch {
      // Safe fallback
    }
  }

  public async getLesson(lessonId: string): Promise<AgentLessonRecord | undefined> {
    return this.lessons.get(lessonId);
  }

  public async listLessons(domain?: string, status?: string): Promise<AgentLessonRecord[]> {
    let list = Array.from(this.lessons.values());
    if (domain) {
      list = list.filter((l) => l.domain && l.domain.toLowerCase() === domain.toLowerCase());
    }
    if (status) {
      list = list.filter((l) => l.status === status);
    }
    return list;
  }

  // ─── 8. AGENT STRATEGIES ────────────────────────────────────────────────────

  public async saveStrategy(strategy: AgentStrategyRecord): Promise<void> {
    this.strategies.set(strategy.strategyId, strategy);
    this.persistLocal("strategies", strategy.strategyId, strategy);

    try {
      const pool = getPool();
      const query = `
        INSERT INTO public.agent_strategies (
          strategy_id, name, domain, version, status, description, directives,
          avoid_patterns, benchmark_results, confidence, promoted_from_lesson_id,
          supersedes_version, metadata, activated_at, deprecated_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now())
        ON CONFLICT (strategy_id) DO UPDATE SET
          status = EXCLUDED.status,
          description = EXCLUDED.description,
          directives = EXCLUDED.directives,
          avoid_patterns = EXCLUDED.avoid_patterns,
          confidence = EXCLUDED.confidence,
          activated_at = EXCLUDED.activated_at,
          deprecated_at = EXCLUDED.deprecated_at,
          updated_at = now()
      `;
      await pool.query(query, [
        strategy.strategyId,
        strategy.name,
        strategy.domain,
        strategy.version,
        strategy.status,
        strategy.description,
        JSON.stringify(strategy.directives ?? []),
        JSON.stringify(strategy.avoidPatterns ?? []),
        JSON.stringify(strategy.benchmarkResults ?? {}),
        strategy.confidence,
        strategy.promotedFromLessonId ?? null,
        strategy.supersedesVersion ?? null,
        JSON.stringify(strategy.metadata ?? {}),
        strategy.activatedAt ?? null,
        strategy.deprecatedAt ?? null,
      ]);
    } catch {
      // Safe fallback
    }
  }

  public async getStrategy(strategyId: string): Promise<AgentStrategyRecord | undefined> {
    return this.strategies.get(strategyId);
  }

  public async getActiveStrategyForDomain(domain: string): Promise<AgentStrategyRecord | undefined> {
    const list = Array.from(this.strategies.values()).filter(
      (s) => s.domain && s.domain.toLowerCase() === domain.toLowerCase() && s.status === "ACTIVE"
    );
    return list[0];
  }

  public async listStrategies(domain?: string): Promise<AgentStrategyRecord[]> {
    let list = Array.from(this.strategies.values());
    if (domain) {
      list = list.filter((s) => s.domain && s.domain.toLowerCase() === domain.toLowerCase());
    }
    return list;
  }

  // ─── 9. AGENT EXPERIMENTS ───────────────────────────────────────────────────

  public async saveExperiment(exp: AgentExperimentRecord): Promise<void> {
    this.experiments.set(exp.experimentId, exp);
    this.persistLocal("experiments", exp.experimentId, exp);

    try {
      const pool = getPool();
      const query = `
        INSERT INTO public.agent_experiments (
          experiment_id, hypothesis, domain, strategy_a, strategy_b, sample_size,
          metrics, status, result, confidence, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (experiment_id) DO UPDATE SET
          status = EXCLUDED.status,
          result = EXCLUDED.result,
          confidence = EXCLUDED.confidence,
          completed_at = EXCLUDED.completed_at
      `;
      await pool.query(query, [
        exp.experimentId,
        exp.hypothesis,
        exp.domain,
        exp.strategyA,
        exp.strategyB,
        exp.sampleSize,
        JSON.stringify(exp.metrics ?? {}),
        exp.status,
        JSON.stringify(exp.result ?? {}),
        exp.confidence ?? 0.5,
        exp.completedAt ?? null,
      ]);
    } catch {
      // Safe fallback
    }
  }

  public async getExperiment(experimentId: string): Promise<AgentExperimentRecord | undefined> {
    return this.experiments.get(experimentId);
  }

  public async listExperiments(domain?: string): Promise<AgentExperimentRecord[]> {
    let list = Array.from(this.experiments.values());
    if (domain) {
      list = list.filter((e) => e.domain && e.domain.toLowerCase() === domain.toLowerCase());
    }
    return list;
  }

  // ─── 10. BUSINESS MEMORY (Scoped & Isolated) ───────────────────────────────

  public async saveBusinessMemory(memory: any): Promise<void> {
    const key = memory.id || memory.projectId;
    this.businessMemories.set(key, memory);
    this.persistLocal("business", key, memory);
  }

  public async getBusinessMemory(projectId: string, userId?: string | null): Promise<any | undefined> {
    const item = Array.from(this.businessMemories.values()).find((m) => m.projectId === projectId);
    if (!item) return undefined;

    // Strict Tenant Isolation: User A must never read User B's business memory
    if (userId && (item.userId || (item as any).tenantId) && (item.userId !== userId && (item as any).tenantId !== userId)) {
      return undefined;
    }
    return item;
  }

  public async listBusinessMemories(tenantOrUserId?: string | null, projectId?: string): Promise<any[]> {
    let list = Array.from(this.businessMemories.values());
    if (tenantOrUserId) {
      list = list.filter((m) => {
        const owner = (m as any).tenantId || m.userId;
        return owner === tenantOrUserId;
      });
    }
    if (projectId) {
      list = list.filter((m) => m.projectId === projectId);
    }
    return list;
  }

  public clear(): void {
    this.runs.clear();
    this.events.clear();
    this.decisions.clear();
    this.feedback.clear();
    this.failures.clear();
    this.evaluations.clear();
    this.lessons.clear();
    this.strategies.clear();
    this.experiments.clear();
    this.businessMemories.clear();
    this.seedDefaultStrategies();
  }
}

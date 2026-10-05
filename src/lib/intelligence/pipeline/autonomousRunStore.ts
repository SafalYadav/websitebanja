import { createHash, randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/queries";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type { AutonomousPipelineRun } from "./pipelineTypes";

interface RunRow { run_data: AutonomousPipelineRun; revision: number; request_hash: string }
function owner(tenant: string | null | undefined): string {
  if (!tenant?.trim()) throw new Error("Trusted autonomous run tenant required");
  return tenant;
}
function verify(row: RunRow, tenant: string): void {
  if (!row.run_data || row.run_data.tenantId !== tenant || !row.run_data.pipelineRunId ||
    !Number.isSafeInteger(row.revision) || row.revision < 0) throw new Error("Invalid durable autonomous run scope/version");
}

/** Database uniqueness, not a process-local map, owns discovery idempotency. */
export async function registerAutonomousRun(run: AutonomousPipelineRun, key: string | undefined, identity: string) {
  const tenant = owner(run.tenantId);
  const hash = createHash("sha256").update(identity).digest("hex");
  const idempotency = key || `internal:${run.pipelineRunId}`;
  const inserted = await getPool().query<RunRow>(`INSERT INTO public.governed_autonomous_runs
    (run_id,tenant_id,idempotency_key,request_hash,run_data) VALUES($1,$2,$3,$4,$5::jsonb)
    ON CONFLICT(tenant_id,idempotency_key) DO NOTHING RETURNING run_data,revision,request_hash`,
  [run.pipelineRunId, tenant, idempotency, hash, sanitizeErrorOutput(JSON.stringify(run))]);
  if (inserted.rowCount === 1) {
    verify(inserted.rows[0], tenant);
    return { created: true, run: inserted.rows[0].run_data, revision: inserted.rows[0].revision };
  }
  const result = await getPool().query<RunRow>(`SELECT run_data,revision,request_hash FROM public.governed_autonomous_runs
    WHERE tenant_id=$1 AND idempotency_key=$2`, [tenant, idempotency]);
  const row = result.rows[0];
  if (!row || row.request_hash !== hash) throw new Error("Idempotency key already belongs to a different pipeline request");
  verify(row, tenant);
  return { created: false, run: row.run_data, revision: row.revision };
}

/** Prevents stale snapshot overwrites. Side-effect ownership requires a separate execution fence. */
export async function checkpointAutonomousRun(run: AutonomousPipelineRun, revision: number, leaseToken?: string): Promise<number> {
  const tenant = owner(run.tenantId);
  if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Valid autonomous checkpoint revision required");
  const result = await getPool().query<{ revision: number }>(`UPDATE public.governed_autonomous_runs
    SET run_data=$3::jsonb,revision=revision+1,updated_at=NOW()
    WHERE run_id=$1 AND tenant_id=$2 AND revision=$4
      AND (($5::text IS NULL AND lease_token IS NULL) OR (lease_token=$5 AND lease_until>NOW()
        AND run_data->>'status' IN ('research_required','waiting_research_approval')))
    RETURNING revision`,
  [run.pipelineRunId, tenant, sanitizeErrorOutput(JSON.stringify(run)), revision, leaseToken || null]);
  if (result.rowCount !== 1 || result.rows[0]?.revision !== revision + 1) {
    throw new Error("Autonomous checkpoint conflict or missing owned run; execution must stop");
  }
  return result.rows[0].revision;
}

export async function claimAutonomousResearch(id: string, tenantInput: string) {
  const tenant = owner(tenantInput);
  const token = randomUUID();
  const result = await getPool().query<RunRow>(`UPDATE public.governed_autonomous_runs
    SET lease_token=$3,lease_until=NOW()+INTERVAL '15 minutes',updated_at=NOW()
    WHERE run_id=$1 AND tenant_id=$2
      AND run_data->>'status' IN ('research_required','waiting_research_approval')
      AND (lease_token IS NULL OR lease_until<=NOW()) RETURNING run_data,revision,request_hash`, [id, tenant, token]);
  if (!result.rowCount) return null;
  const row = result.rows[0];
  verify(row, tenant);
  if (row.run_data.pipelineRunId !== id) throw new Error("Claimed autonomous run identity mismatch");
  return { run: row.run_data, revision: row.revision, token };
}

export async function assertAutonomousResearchLease(id: string, tenantInput: string, token: string): Promise<void> {
  const result = await getPool().query(`SELECT run_id FROM public.governed_autonomous_runs
    WHERE run_id=$1 AND tenant_id=$2 AND lease_token=$3 AND lease_until>NOW()
      AND run_data->>'status' IN ('research_required','waiting_research_approval')`, [id, owner(tenantInput), token]);
  if (result.rowCount !== 1) throw new Error("Autonomous research execution lease lost or parent unavailable");
}

export async function releaseAutonomousResearchLease(id: string, tenantInput: string, token: string): Promise<void> {
  await getPool().query(`UPDATE public.governed_autonomous_runs SET lease_token=NULL,lease_until=NULL
    WHERE run_id=$1 AND tenant_id=$2 AND lease_token=$3`, [id, owner(tenantInput), token]);
}

export async function readAutonomousRun(id: string, tenantInput: string): Promise<AutonomousPipelineRun | undefined> {
  const tenant = owner(tenantInput);
  const result = await getPool().query<RunRow>(`SELECT run_data,revision,request_hash FROM public.governed_autonomous_runs
    WHERE run_id=$1 AND tenant_id=$2`, [id, tenant]);
  const row = result.rows[0];
  if (!row) return undefined;
  verify(row, tenant);
  if (row.run_data.pipelineRunId !== id) throw new Error("Durable run identity mismatch");
  return row.run_data;
}

export async function listAutonomousRuns(tenantInput: string, limit = 20): Promise<AutonomousPipelineRun[]> {
  const tenant = owner(tenantInput);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("Valid bounded run list limit required");
  const result = await getPool().query<RunRow>(`SELECT run_data,revision,request_hash FROM public.governed_autonomous_runs
    WHERE tenant_id=$1 ORDER BY created_at DESC,run_id DESC LIMIT $2`, [tenant, limit]);
  for (const row of result.rows) verify(row, tenant);
  return result.rows.map(row => row.run_data);
}

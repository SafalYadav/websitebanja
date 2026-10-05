import { getPool } from "@/lib/db/queries";
import { randomUUID } from "node:crypto";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type { CanonicalGenerationRequest } from "./types";
import type { PipelineExecutionFence } from "@/lib/automation/pipelineExecutionLease";

export class PipelineParentUnavailableError extends Error {
  constructor(public readonly code: "PIPELINE_PARENT_PAUSED" | "PIPELINE_PARENT_CANCELLED" | "PIPELINE_PARENT_INVALID", message: string) {
    super(message); this.name = "PipelineParentUnavailableError";
  }
}

/** Only the original fenced worker can create this durable server-owned link. */
export async function bindPipelineResearch(id: string, request: CanonicalGenerationRequest, fence: PipelineExecutionFence): Promise<void> {
  if (!request.leadId || request.pipelineRunId !== fence.runId || (request.tenantId || request.userId) !== fence.tenantId) {
    throw new PipelineParentUnavailableError("PIPELINE_PARENT_INVALID", "Original owned pipeline identity required for research linkage");
  }
  const saved = await getPool().query(`WITH parent AS (
    SELECT pipeline_run_id,tenant_id FROM public.autonomous_pipeline_runs
    WHERE pipeline_run_id=$1 AND tenant_id=$2 AND execution_lease_token=$3
      AND execution_lease_until>NOW() AND status='RUNNING' AND leads ? $4 FOR UPDATE
    ) INSERT INTO public.generation_pipeline_continuations(research_id,pipeline_run_id,tenant_id,lead_id,status)
    SELECT r.id,p.pipeline_run_id,p.tenant_id,$4,CASE WHEN r.status='REJECTED' THEN 'REJECTED' ELSE 'WAITING_RESEARCH' END FROM parent p
    JOIN public.generation_research r ON r.id=$5 AND r.tenant_id=p.tenant_id
      AND r.request->>'pipelineRunId'=p.pipeline_run_id AND r.request->>'leadId'=$4
    ON CONFLICT(research_id) DO UPDATE SET updated_at=NOW(),
      status=CASE WHEN EXCLUDED.status='REJECTED' THEN 'REJECTED' ELSE generation_pipeline_continuations.status END
      WHERE generation_pipeline_continuations.pipeline_run_id=EXCLUDED.pipeline_run_id
        AND generation_pipeline_continuations.tenant_id=EXCLUDED.tenant_id
        AND generation_pipeline_continuations.lead_id=EXCLUDED.lead_id
    RETURNING research_id`, [fence.runId, fence.tenantId, fence.token, request.leadId, id]);
  if (saved.rowCount !== 1) throw new PipelineParentUnavailableError("PIPELINE_PARENT_INVALID", "Pipeline research link rejected: ownership, execution or original request mismatch");
}

export async function assertResearchParent(id: string, request: CanonicalGenerationRequest): Promise<void> {
  if (!request.pipelineRunId) {
    if (request.source === "autonomous_pipeline") throw new PipelineParentUnavailableError("PIPELINE_PARENT_INVALID", "Legacy autonomous research has no verified parent linkage; administrator review required");
    return;
  }
  const parent = await getPool().query<{ status: string; pause_reason: string | null }>(`SELECT p.status,p.run_data->>'pauseReason' AS pause_reason
    FROM public.generation_pipeline_continuations c JOIN public.autonomous_pipeline_runs p ON p.pipeline_run_id=c.pipeline_run_id
    WHERE c.research_id=$1 AND c.pipeline_run_id=$2 AND c.tenant_id=$3 AND p.tenant_id=c.tenant_id AND c.lead_id=$4`,
    [id, request.pipelineRunId, request.tenantId || request.userId, request.leadId]);
  const row = parent.rows[0];
  if (!row) throw new PipelineParentUnavailableError("PIPELINE_PARENT_INVALID", "Original owned pipeline research linkage unavailable");
  if (!["PAUSED", "RUNNING"].includes(row.status)) throw new PipelineParentUnavailableError("PIPELINE_PARENT_CANCELLED", "Original parent pipeline is cancelled or terminal; generation denied");
  if (row.status === "PAUSED" && row.pause_reason !== "research") throw new PipelineParentUnavailableError("PIPELINE_PARENT_PAUSED", "Original pipeline is not waiting for research; explicit owner resume required");
}

export async function cancelPipelineContinuations(runId: string, tenantId: string): Promise<void> {
  if (!runId || !tenantId) throw new Error("Owned cancelled pipeline identity required");
  const pool = getPool();
  // Older installations/known-only runs may never have needed research tables.
  const exists = await pool.query<{ available: boolean }>("SELECT to_regclass('public.generation_pipeline_continuations') IS NOT NULL AS available");
  if (!exists.rows[0]?.available) return;
  await pool.query(`UPDATE public.generation_pipeline_continuations c SET status='CANCELLED',lease_token=NULL,lease_until=NULL,updated_at=NOW()
    FROM public.autonomous_pipeline_runs p WHERE c.pipeline_run_id=$1 AND c.tenant_id=$2
      AND p.pipeline_run_id=c.pipeline_run_id AND p.tenant_id=$2 AND p.status='CANCELLED'
      AND c.status IN ('WAITING_RESEARCH','QUEUED','RUNNING')`, [runId, tenantId]);
}

/** Durable outbox recovery: observing READY cannot lose continuation after a crash. */
export async function recoverPipelineContinuations(identity: { tenantId: string; researchId?: string; runId?: string }): Promise<void> {
  if (!identity.tenantId.trim() || (!identity.researchId && !identity.runId)) throw new Error("Trusted continuation owner and identity required");
  const pool = getPool();
  await pool.query(`UPDATE public.generation_pipeline_continuations c SET status='CANCELLED',lease_token=NULL,lease_until=NULL,updated_at=NOW()
    FROM public.autonomous_pipeline_runs p WHERE c.pipeline_run_id=p.pipeline_run_id AND c.tenant_id=$1 AND p.tenant_id=$1
      AND ($2::text IS NULL OR c.research_id=$2) AND ($3::text IS NULL OR c.pipeline_run_id=$3)
      AND p.status='CANCELLED' AND c.status IN ('WAITING_RESEARCH','QUEUED','RUNNING')`, [identity.tenantId, identity.researchId || null, identity.runId || null]);
  await pool.query(`UPDATE public.generation_pipeline_continuations SET status='FAILED',lease_until=NULL,updated_at=NOW(),
    last_error='Bounded parent continuation recovery exhausted; administrator review required'
    WHERE tenant_id=$1 AND ($2::text IS NULL OR research_id=$2) AND ($3::text IS NULL OR pipeline_run_id=$3)
      AND status='RUNNING' AND lease_until<NOW() AND attempts>=2`, [identity.tenantId, identity.researchId || null, identity.runId || null]);
  const token = randomUUID();
  const claimed = await pool.query<{ research_id: string; pipeline_run_id: string; tenant_id: string }>(`WITH candidate AS (
    SELECT c.research_id FROM public.generation_pipeline_continuations c
    JOIN public.autonomous_pipeline_runs p ON p.pipeline_run_id=c.pipeline_run_id AND p.tenant_id=c.tenant_id
    JOIN public.generation_research_resumes q ON q.research_id=c.research_id
    WHERE c.tenant_id=$1 AND ($2::text IS NULL OR c.research_id=$2) AND ($3::text IS NULL OR c.pipeline_run_id=$3)
      AND c.attempts<2 AND (c.status='QUEUED' OR (c.status='RUNNING' AND c.lease_until<NOW()))
      AND q.status IN ('READY','REPAIRED') AND q.result->>'success'='true'
      AND ((p.status='PAUSED' AND p.run_data->>'pauseReason'='research')
        OR (p.status='RUNNING' AND p.run_data->>'activeResearchContinuationId'=c.research_id))
      AND p.leads->c.lead_id->>'researchId'=c.research_id
      AND (p.execution_lease_token IS NULL OR p.execution_lease_until<=NOW())
    ORDER BY c.updated_at LIMIT 1 FOR UPDATE OF c SKIP LOCKED
    ) UPDATE public.generation_pipeline_continuations c SET status='RUNNING',lease_token=$4,
      lease_until=NOW()+INTERVAL '15 minutes',attempts=attempts+1,updated_at=NOW()
    FROM candidate WHERE c.research_id=candidate.research_id RETURNING c.research_id,c.pipeline_run_id,c.tenant_id`,
    [identity.tenantId, identity.researchId || null, identity.runId || null, token]);
  const claimedRow = claimed.rows[0];
  if (!claimedRow) return;
  try {
    const { PipelineOrchestrator } = await import("@/lib/automation/pipelineOrchestrator");
    const run = await PipelineOrchestrator.resumeRun(claimedRow.pipeline_run_id, undefined, claimedRow.tenant_id, claimedRow.research_id);
    await pool.query(`UPDATE public.generation_pipeline_continuations SET status=$3,lease_token=NULL,lease_until=NULL,updated_at=NOW()
      WHERE research_id=$1 AND lease_token=$2 AND status='RUNNING'`, [claimedRow.research_id, token, run.status === "FAILED" ? "FAILED" : "COMPLETED"]);
  } catch (error) {
    // A human pause or concurrent valid run must not consume a generation retry
    // or be overwritten. This claim can be retried after an explicit resume.
    await pool.query(`UPDATE public.generation_pipeline_continuations c SET
      status=CASE WHEN p.status='CANCELLED' THEN 'CANCELLED'
        WHEN p.status='RUNNING' OR (p.status='PAUSED' AND p.run_data->>'pauseReason'='human') THEN 'QUEUED' ELSE 'FAILED' END,
      attempts=CASE WHEN p.status='RUNNING' OR (p.status='PAUSED' AND p.run_data->>'pauseReason'='human') THEN GREATEST(c.attempts-1,0) ELSE c.attempts END,
      last_error=$3,lease_token=NULL,lease_until=NULL,updated_at=NOW()
      FROM public.autonomous_pipeline_runs p WHERE c.research_id=$1 AND c.lease_token=$2 AND c.status='RUNNING'
        AND p.pipeline_run_id=c.pipeline_run_id AND p.tenant_id=c.tenant_id`, [claimedRow.research_id, token, sanitizeErrorOutput(error)]);
  }
}

import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/db/queries";
import type { PipelineRun, PipelineStage, PipelineStatus } from "./pipelineTypes";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export interface PipelineExecutionFence { runId: string; tenantId: string; token: string }

export class PipelineExecutionLostError extends Error {
  constructor() { super("Pipeline execution expired, cancelled or superseded; further work denied"); this.name = "PipelineExecutionLostError"; }
}

// Capability tokens must never enter persisted run JSON or API responses.
const executionFences = new WeakMap<PipelineRun, PipelineExecutionFence>();
export function pipelineExecutionFence(run: PipelineRun): PipelineExecutionFence | undefined { return executionFences.get(run); }
export function attachPipelineExecution(run: PipelineRun, fence: PipelineExecutionFence): void { executionFences.set(run, fence); }
export function detachPipelineExecution(run: PipelineRun): void { executionFences.delete(run); }

export async function claimPipelineExecution(run: PipelineRun, statuses: PipelineStatus[], researchId?: string): Promise<PipelineExecutionFence> {
  if (!run.tenantId || !statuses.length) throw new Error("Trusted pipeline execution owner and expected status required");
  const token = randomUUID();
  const researchPredicate = researchId ? `AND (
    ((status='PAUSED' AND run_data->>'pauseReason'='research')
      OR (status='RUNNING' AND run_data->>'activeResearchContinuationId'=$5))
    AND EXISTS(SELECT 1 FROM public.generation_pipeline_continuations c
      WHERE c.research_id=$5 AND c.pipeline_run_id=$1 AND c.tenant_id=$2
        AND leads->c.lead_id->>'researchId'=$5 AND c.status='RUNNING')
  )` : "";
  const claimed = await getPool().query(`UPDATE public.autonomous_pipeline_runs
    SET execution_lease_token=$3,execution_lease_until=NOW()+INTERVAL '15 minutes',
        status='RUNNING',completed_at=NULL,updated_at=NOW(),
        run_data=(COALESCE(run_data,'{}'::jsonb)-'pausedAt'-'completedAt'-'pauseReason'-'activeResearchContinuationId')
          || jsonb_build_object('status','RUNNING','updatedAt',NOW())
          ${researchId ? "|| jsonb_build_object('activeResearchContinuationId',$5::text)" : ""}
    WHERE pipeline_run_id=$1 AND tenant_id=$2 AND status=ANY($4::text[])
      AND (execution_lease_token IS NULL OR execution_lease_until<=NOW())
      ${researchPredicate}
    RETURNING pipeline_run_id`, [run.id, run.tenantId, token, statuses, ...(researchId ? [researchId] : [])]);
  if (claimed.rowCount !== 1) throw new Error("Pipeline execution claim denied: already running, invalid status or ownership");
  return { runId: run.id, tenantId: run.tenantId, token };
}

export async function assertPipelineExecution(run: PipelineRun): Promise<void> {
  const fence = pipelineExecutionFence(run);
  if (!fence) throw new PipelineExecutionLostError();
  const valid = await getPool().query(`SELECT pipeline_run_id FROM public.autonomous_pipeline_runs
    WHERE pipeline_run_id=$1 AND tenant_id=$2 AND execution_lease_token=$3
      AND execution_lease_until>NOW() AND status='RUNNING'`, [fence.runId, fence.tenantId, fence.token]);
  if (valid.rowCount !== 1) throw new PipelineExecutionLostError();
}

export async function renewPipelineExecution(fence: PipelineExecutionFence): Promise<void> {
  const renewed = await getPool().query(`UPDATE public.autonomous_pipeline_runs
    SET execution_lease_until=NOW()+INTERVAL '15 minutes'
    WHERE pipeline_run_id=$1 AND tenant_id=$2 AND execution_lease_token=$3
      AND execution_lease_until>NOW() AND status='RUNNING' RETURNING pipeline_run_id`, [fence.runId, fence.tenantId, fence.token]);
  if (renewed.rowCount !== 1) throw new PipelineExecutionLostError();
}

export async function releasePipelineExecution(fence: PipelineExecutionFence): Promise<void> {
  // Token comparison prevents an old worker from releasing its successor's claim.
  await getPool().query(`UPDATE public.autonomous_pipeline_runs SET execution_lease_token=NULL,execution_lease_until=NULL
    WHERE pipeline_run_id=$1 AND tenant_id=$2 AND execution_lease_token=$3`, [fence.runId, fence.tenantId, fence.token]);
}

export async function readPipelineStageResult(run: PipelineRun, leadId: string, stage: PipelineStage): Promise<{ executed: boolean; result?: unknown }> {
  const fence = pipelineExecutionFence(run);
  if (!fence) throw new PipelineExecutionLostError();
  const saved = await getPool().query<{ result: unknown }>(`SELECT s.result FROM public.autonomous_pipeline_stage_results s
    JOIN public.autonomous_pipeline_runs r USING(pipeline_run_id)
    WHERE s.pipeline_run_id=$1 AND s.tenant_id=$2 AND r.tenant_id=$2
      AND s.lead_id=$3 AND s.stage=$4 AND r.execution_lease_token=$5
      AND r.execution_lease_until>NOW() AND r.status='RUNNING'`, [fence.runId, fence.tenantId, leadId, stage, fence.token]);
  return saved.rows.length ? { executed: true, result: saved.rows[0].result } : { executed: false };
}

export async function commitPipelineStageResult(run: PipelineRun, leadId: string, stage: PipelineStage, result: unknown): Promise<void> {
  const fence = pipelineExecutionFence(run);
  if (!fence) throw new PipelineExecutionLostError();
  const saved = await getPool().query(`WITH owner AS (
    SELECT pipeline_run_id,tenant_id FROM public.autonomous_pipeline_runs
    WHERE pipeline_run_id=$1 AND tenant_id=$2 AND execution_lease_token=$5
      AND execution_lease_until>NOW() AND status='RUNNING' FOR UPDATE
    ) INSERT INTO public.autonomous_pipeline_stage_results(pipeline_run_id,tenant_id,lead_id,stage,result)
    SELECT pipeline_run_id,tenant_id,$3,$4,$6::jsonb FROM owner
    ON CONFLICT(pipeline_run_id,lead_id,stage) DO UPDATE SET result=autonomous_pipeline_stage_results.result
    RETURNING pipeline_run_id`, [fence.runId, fence.tenantId, leadId, stage, fence.token, sanitizeErrorOutput(JSON.stringify(result))]);
  if (saved.rowCount !== 1) throw new PipelineExecutionLostError();
}

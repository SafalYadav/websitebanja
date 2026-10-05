import { getPool } from "@/lib/db/queries";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type { CanonicalGenerationRequest, CanonicalGenerationResponse } from "./types";
import type { WebsiteData } from "@/types/website";
import type { PipelineExecutionFence } from "@/lib/automation/pipelineExecutionLease";
import { PipelineParentUnavailableError } from "./pipelineResearchContinuation";
import { approvedKnowledgeBinding, KnowledgeApprovalInvalidError, type ApprovedKnowledgeBinding } from "./approvedKnowledgeBinding";

function sanitizedJson(value: unknown): string { return sanitizeErrorOutput(JSON.stringify(value)); }

export async function beginGenerationTrace(id: string, request: CanonicalGenerationRequest): Promise<void> {
  const tenant = request.tenantId || request.userId;
  if (!tenant) throw new Error("Trusted tenant identity required for generation trace");
  await getPool().query(`CREATE TABLE IF NOT EXISTS public.generation_execution_traces (
    id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, user_id TEXT,
    status TEXT NOT NULL, request JSONB NOT NULL, events JSONB NOT NULL DEFAULT '[]',
    result JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  await getPool().query("INSERT INTO public.generation_execution_traces(id,tenant_id,user_id,status,request) VALUES($1,$2,$3,'GROUNDING',$4)",
    [id, tenant, request.userId || null, sanitizedJson(request)]);
}

export async function appendGenerationEvidence(id: string, evidence: unknown): Promise<void> {
  const result = await getPool().query("UPDATE public.generation_execution_traces SET events=events || $2::jsonb,updated_at=NOW() WHERE id=$1 RETURNING id", [id, sanitizedJson([evidence])]);
  if (!result.rowCount) throw new Error("Generation trace record missing");
}

export async function finishGenerationTrace(id: string, result: CanonicalGenerationResponse, resume?: { researchId: string; leaseToken: string; request: CanonicalGenerationRequest }, pipelineFence?: PipelineExecutionFence, knowledgeBindings: ApprovedKnowledgeBinding[] = []): Promise<void> {
  if (result.success) {
    const metadata = result.websiteData as unknown as Record<string, unknown>;
    const review = metadata.publishReview as { approved?: boolean } | undefined;
    if (!review?.approved || metadata.generationGate !== "READY") throw new Error("Durable publication requires completed rendered publish review");
  }
  if (resume || pipelineFence || (result.success && knowledgeBindings.length)) {
    const client = await getPool().connect();
    try {
      await client.query("BEGIN");
      if (result.success) {
        // Hold shared row locks through commit. Rollback/activation must wait;
        // a version revoked before this transaction cannot publish its candidate.
        const bindings = [...new Map(knowledgeBindings.map(binding => [binding.versionId, binding])).values()]
          .sort((left, right) => left.researchId.localeCompare(right.researchId) || left.versionId.localeCompare(right.versionId));
        for (const binding of bindings) {
          const record = await client.query(`SELECT r.*,k.id AS knowledge_version_id,k.concept_key,k.concept,k.approved_by,k.regression_report,k.active
            FROM public.generation_research r JOIN public.semantic_knowledge_versions k ON k.research_id=r.id AND k.tenant_id=r.tenant_id
            WHERE r.id=$1 AND r.tenant_id=$2 AND k.id=$3 FOR SHARE OF r,k`, [binding.researchId, binding.tenantId, binding.versionId]);
          if (record.rows.length !== 1) throw new KnowledgeApprovalInvalidError();
          const current = approvedKnowledgeBinding(record.rows[0]);
          if (current.reviewHash !== binding.reviewHash || current.conceptKey !== binding.conceptKey) throw new KnowledgeApprovalInvalidError();
          const owned = await client.query("SELECT id FROM public.generation_execution_traces WHERE id=$1 AND tenant_id=$2 FOR UPDATE", [id, binding.tenantId]);
          if (owned.rowCount !== 1) throw new KnowledgeApprovalInvalidError();
        }
      }
      const resumedParent = resume?.request.pipelineRunId ? {
        runId: resume.request.pipelineRunId, tenantId: resume.request.tenantId || resume.request.userId,
      } : undefined;
      if (resumedParent && resume) {
        const parent = await client.query<{ status: string; pause_reason: string | null }>(`SELECT p.status,p.run_data->>'pauseReason' AS pause_reason
          FROM public.autonomous_pipeline_runs p JOIN public.generation_pipeline_continuations c ON c.pipeline_run_id=p.pipeline_run_id
          WHERE p.pipeline_run_id=$1 AND p.tenant_id=$2 AND c.tenant_id=$2 AND c.research_id=$3 AND c.lead_id=$4 FOR UPDATE OF p,c`,
          [resumedParent.runId, resumedParent.tenantId, resume.researchId, resume.request.leadId]);
        const row = parent.rows[0];
        if (!row) throw new PipelineParentUnavailableError("PIPELINE_PARENT_INVALID", "Original owned parent linkage missing; publication denied");
        if (!["PAUSED", "RUNNING"].includes(row.status)) throw new PipelineParentUnavailableError("PIPELINE_PARENT_CANCELLED", "Original parent is cancelled or terminal; publication denied");
        if (row.status === "PAUSED" && row.pause_reason !== "research") throw new PipelineParentUnavailableError("PIPELINE_PARENT_PAUSED", "Parent is not waiting for research; publication deferred until explicit resume");
      }
      if (pipelineFence) {
        const execution = await client.query(`SELECT pipeline_run_id FROM public.autonomous_pipeline_runs
          WHERE pipeline_run_id=$1 AND tenant_id=$2 AND execution_lease_token=$3
            AND execution_lease_until>NOW() AND status='RUNNING' FOR UPDATE`,
          [pipelineFence.runId, pipelineFence.tenantId, pipelineFence.token]);
        if (execution.rowCount !== 1) throw new Error("Pipeline execution expired, cancelled or superseded; publication denied");
        const owned = await client.query("SELECT id FROM public.generation_execution_traces WHERE id=$1 AND tenant_id=$2 FOR UPDATE", [id, pipelineFence.tenantId]);
        if (owned.rowCount !== 1) throw new Error("Pipeline generation trace ownership mismatch; publication denied");
      }
      if (resume) {
        const lease = await client.query("SELECT research_id FROM public.generation_research_resumes WHERE research_id=$1 AND lease_token=$2 AND status='GENERATING' AND lease_until>NOW() FOR UPDATE", [resume.researchId, resume.leaseToken]);
        if (!lease.rowCount) throw new Error("Generation resume lease expired or superseded; publication denied");
        if (result.success && !knowledgeBindings.some(binding => binding.researchId === resume.researchId && binding.tenantId === (resume.request.tenantId || resume.request.userId))) {
          throw new KnowledgeApprovalInvalidError();
        }
      }
      if (result.success && resume?.request.source === "ui_builder") {
        if (!resume.request.leadId || !resume.request.userId) throw new Error("Original owned builder project identity required");
        const project = await client.query("UPDATE public.projects SET json_data=$1,updated_at=NOW() WHERE id=$2 AND user_id=$3 RETURNING id",
          [JSON.stringify(result.websiteData), resume.request.leadId, resume.request.userId]);
        if (!project.rowCount) throw new Error("Original project ownership validation failed; publication denied");
      }
      const trace = await client.query("UPDATE public.generation_execution_traces SET status=$2,result=$3,updated_at=NOW() WHERE id=$1 RETURNING id", [id, result.status, sanitizedJson(result)]);
      if (!trace.rowCount) throw new Error("Generation trace missing during atomic finalization");
      const parentCheckpoint = pipelineFence || resumedParent;
      if (result.success && parentCheckpoint) {
        // A crash between publication and pipeline progress must reuse this exact
        // reviewed result rather than generate a second preview on another host.
        const checkpoint = await client.query(`INSERT INTO public.autonomous_pipeline_stage_results(pipeline_run_id,tenant_id,lead_id,stage,result)
          SELECT $1,$2,request->>'leadId','PREVIEW_GENERATION',$4::jsonb
          FROM public.generation_execution_traces WHERE id=$3 AND tenant_id=$2 AND request->>'leadId' IS NOT NULL
          ON CONFLICT(pipeline_run_id,lead_id,stage) DO UPDATE SET result=autonomous_pipeline_stage_results.result
          RETURNING pipeline_run_id`, [parentCheckpoint.runId, parentCheckpoint.tenantId, id, sanitizedJson(result)]);
        if (checkpoint.rowCount !== 1) throw new Error("Original pipeline lead missing; publication checkpoint denied");
      }
      if (resume) await client.query("UPDATE public.generation_research_resumes SET status=$2,result=$3,lease_until=NULL,updated_at=NOW() WHERE research_id=$1 AND lease_token=$4",
        [resume.researchId, result.status, sanitizedJson(result), resume.leaseToken]);
      if (resumedParent && resume) {
        const queued = await client.query(`UPDATE public.generation_pipeline_continuations SET status=$3,updated_at=NOW(),last_error=$4
          WHERE research_id=$1 AND tenant_id=$2 AND status IN ('WAITING_RESEARCH','QUEUED') RETURNING research_id`,
          [resume.researchId, resumedParent.tenantId, result.success ? "QUEUED" : "FAILED", result.error?.message || null]);
        if (queued.rowCount !== 1) throw new Error("Original parent continuation missing; finalization denied");
      }
      await client.query("COMMIT");
      return;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  const saved = await getPool().query("UPDATE public.generation_execution_traces SET status=$2,result=$3,updated_at=NOW() WHERE id=$1 RETURNING id", [id, result.status, sanitizedJson(result)]);
  if (!saved.rowCount) throw new Error("Durable generation finalization record missing");
}

/** Public reads expose only the reviewed website, never private research/trace data. */
export async function readApprovedGeneratedPreview(id: string): Promise<WebsiteData | null> {
  return readReviewedPreview(id, null);
}

/** Internal specialist tools must not substitute caller-supplied AST for owned evidence. */
export async function readOwnedApprovedGeneratedPreview(id: string, tenantId: string): Promise<WebsiteData | null> {
  if (!tenantId.trim()) throw new Error("Trusted preview tenant required");
  return readReviewedPreview(id, tenantId);
}

async function readReviewedPreview(id: string, tenantId: string | null): Promise<WebsiteData | null> {
  if (!/^[a-z0-9_-]{1,160}$/.test(id)) return null;
  const result = await getPool().query<{ website: WebsiteData }>(`SELECT result->'websiteData' AS website
    FROM public.generation_execution_traces WHERE status IN ('READY','REPAIRED')
      AND ($2::text IS NULL OR tenant_id=$2)
      AND result->>'success'='true' AND result->'websiteData'->>'generationGate'='READY'
      AND result->'websiteData'->'publishReview'->>'approved'='true'
      AND (result->'preview'->>'id'=$1 OR result->'preview'->>'slug'=$1)
    ORDER BY created_at DESC LIMIT 1`, [id, tenantId]);
  if (!result.rows[0]) return null;
  const website = { ...result.rows[0].website };
  const publicData = website as unknown as Record<string, unknown>;
  for (const key of ["employeeTrace", "renderedAudit", "publishReview", "generationOwnerId"]) delete publicData[key];
  return website;
}

export async function readOwnedGenerationHandoff(id: string, tenantId: string, leadId: string) {
  if (!tenantId.trim() || !leadId.trim() || !/^[a-z0-9_-]{1,160}$/.test(id)) throw new Error("Owned lead/preview identity required");
  const result = await getPool().query<{ preview: CanonicalGenerationResponse["preview"]; preview_details: CanonicalGenerationResponse["previewDetails"] }>(`
    SELECT result->'preview' AS preview,result->'previewDetails' AS preview_details
    FROM public.generation_execution_traces WHERE tenant_id=$2 AND request->>'leadId'=$3
      AND status IN ('READY','REPAIRED') AND result->>'success'='true'
      AND result->'websiteData'->>'generationGate'='READY' AND result->'websiteData'->'publishReview'->>'approved'='true'
      AND (result->'preview'->>'id'=$1 OR result->'preview'->>'slug'=$1)
    ORDER BY created_at DESC LIMIT 1`, [id, tenantId, leadId]);
  const row = result.rows[0];
  return row ? { ...row.preview_details, ...row.preview } : null;
}

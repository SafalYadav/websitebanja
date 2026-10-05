import { getPool } from "@/lib/db/queries";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type { CanonicalGenerationRequest } from "./types";
import { randomUUID } from "node:crypto";
import { assertResearchParent, cancelPipelineContinuations, PipelineParentUnavailableError, recoverPipelineContinuations } from "./pipelineResearchContinuation";

const approvedLearningPredicate = `r.status='APPROVED' AND r.reviewed_payload_hash IS NOT NULL
  AND r.reviewed_by=r.tenant_id AND k.approved_by=r.reviewed_by
  AND k.active AND k.regression_report->>'passed'='true'
  AND k.concept=r.dossier->'reusableKnowledge'`;

/** Durable lease prevents concurrent admin/poller workers generating duplicate previews. */
export async function resumeApprovedResearch(researchId: string): Promise<void> {
  await getPool().query(`UPDATE public.generation_research_resumes SET status='FAILED',lease_until=NULL,
    result=$2,updated_at=NOW() WHERE research_id=$1 AND status='GENERATING'
      AND lease_until<NOW() AND attempts>=2`, [researchId, JSON.stringify({ success: false, status: "FAILED",
        error: { code: "RESUME_RETRY_EXHAUSTED", message: "Generation recovery exhausted its bounded attempts; administrator review required" } })]);
  const leaseToken = randomUUID();
  const claimed = await getPool().query<{ request: CanonicalGenerationRequest; lease_token: string }>(`
    WITH claim AS (
      UPDATE public.generation_research_resumes q SET status='GENERATING',
        lease_until=NOW()+INTERVAL '15 minutes',lease_token=$2, attempts=attempts+1, updated_at=NOW()
      WHERE research_id=$1 AND attempts<2 AND
        (status='QUEUED' OR (status='GENERATING' AND lease_until<NOW()))
        AND EXISTS(
          SELECT 1 FROM public.generation_research r
          JOIN public.semantic_knowledge_versions k ON k.research_id=r.id AND k.tenant_id=r.tenant_id
          WHERE r.id=q.research_id AND ${approvedLearningPredicate}
        )
      RETURNING research_id,lease_token
    ) SELECT r.request,c.lease_token FROM public.generation_research r JOIN claim c ON r.id=c.research_id`, [researchId, leaseToken]);
  if (!claimed.rows.length) {
    // Distinguish revoked approval from another worker's valid claim. Never
    // leave a queued request polling forever after its learning was rolled back.
    await getPool().query(`UPDATE public.generation_research_resumes q SET status='FAILED',result=$2,updated_at=NOW()
      WHERE q.research_id=$1 AND q.status='QUEUED'
        AND EXISTS(SELECT 1 FROM public.generation_research r WHERE r.id=q.research_id AND r.status='APPROVED')
        AND NOT EXISTS(SELECT 1 FROM public.generation_research r
          JOIN public.semantic_knowledge_versions k ON k.research_id=r.id AND k.tenant_id=r.tenant_id
          WHERE r.id=q.research_id AND ${approvedLearningPredicate})`, [researchId, JSON.stringify({ success: false, status: "FAILED",
      error: { code: "KNOWLEDGE_APPROVAL_REVOKED", message: "The original approved learning is no longer active or valid. Human review is required; generation was not started." } })]);
    return;
  }
  const request = claimed.rows[0].request;
  try {
    await assertResearchParent(researchId, request);
    const { canonicalGenerationOrchestrator } = await import("./canonicalGenerationOrchestrator");
    const result = await canonicalGenerationOrchestrator.generateWebsite(request, { researchId, leaseToken });
    if (result.error?.code === "PIPELINE_PARENT_PAUSED") {
      await getPool().query(`UPDATE public.generation_research_resumes SET status='QUEUED',lease_until=NULL,lease_token=NULL,
        attempts=GREATEST(attempts-1,0),updated_at=NOW() WHERE research_id=$1 AND lease_token=$2 AND status='GENERATING'`, [researchId, leaseToken]);
      return;
    }
    // Canonical finalization atomically saves project + publish result + queue status.
    if (!result.success) await getPool().query("UPDATE public.generation_research_resumes SET status=$2,result=$3,lease_until=NULL,updated_at=NOW() WHERE research_id=$1 AND lease_token=$4 AND status='GENERATING'",
      [researchId, result.status, JSON.stringify(result), leaseToken]);
    if (request.pipelineRunId && (request.tenantId || request.userId)) await recoverPipelineContinuations({
      tenantId: request.tenantId || request.userId || "", researchId,
    });
  } catch (error) {
    if (error instanceof PipelineParentUnavailableError && error.code === "PIPELINE_PARENT_PAUSED") {
      await getPool().query(`UPDATE public.generation_research_resumes SET status='QUEUED',lease_until=NULL,lease_token=NULL,
        attempts=GREATEST(attempts-1,0),updated_at=NOW() WHERE research_id=$1 AND lease_token=$2 AND status='GENERATING'`, [researchId, leaseToken]);
      return;
    }
    const rejected = error instanceof PipelineParentUnavailableError && error.code === "PIPELINE_PARENT_CANCELLED";
    await getPool().query("UPDATE public.generation_research_resumes SET status=$4,result=$2,lease_until=NULL,updated_at=NOW() WHERE research_id=$1 AND lease_token=$3 AND status='GENERATING'",
      [researchId, JSON.stringify({ success: false, status: rejected ? "REJECTED" : "FAILED", error: { code: rejected ? "PIPELINE_PARENT_CANCELLED" : "RESUME_FAILED", message: sanitizeErrorOutput(error) } }), leaseToken, rejected ? "REJECTED" : "FAILED"]);
    if (rejected && request.pipelineRunId && (request.tenantId || request.userId)) await cancelPipelineContinuations(request.pipelineRunId, request.tenantId || request.userId || "");
  }
}

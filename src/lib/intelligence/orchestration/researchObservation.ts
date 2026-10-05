import { getPool } from "@/lib/db/queries";
import type { CanonicalGenerationResponse } from "./types";

export type ResearchObserver = { kind: "user"; userId: string } | { kind: "automation"; tenantId: string };
interface ResearchQueueRow {
  research_status: string;
  status: string | null;
  result: CanonicalGenerationResponse | null;
  lease_until: string | Date | null;
  attempts: number | null;
  lead_id?: string;
  audit_id?: string;
  continuation_pending?: boolean;
  tenant_id?: string;
}

/** Authorization is a SQL predicate, never a caller-supplied tenant override. */
export async function readResearchObservation(id: string, observer: ResearchObserver) {
  if (!/^[a-f0-9]{64}$/.test(id)) throw new Error("Invalid research identifier");
  const identity = observer.kind === "user" ? observer.userId : observer.tenantId;
  if (!identity.trim()) throw new Error("Trusted research observer required");
  const predicate = observer.kind === "user" ? "r.request->>'userId'=$2" : "r.tenant_id=$2";
  const result = await getPool().query<ResearchQueueRow>(`SELECT r.status AS research_status,q.status,q.result,q.lease_until,q.attempts,
    r.request->>'leadId' AS lead_id,r.request->>'auditId' AS audit_id,r.tenant_id,
    EXISTS(SELECT 1 FROM public.generation_pipeline_continuations c WHERE c.research_id=r.id AND c.tenant_id=r.tenant_id
      AND (c.status='QUEUED' OR (c.status='RUNNING' AND c.lease_until<NOW()))) AS continuation_pending
    FROM public.generation_research r LEFT JOIN public.generation_research_resumes q ON q.research_id=r.id
    WHERE r.id=$1 AND ${predicate}`, [id, identity]);
  const row = result.rows[0];
  if (!row) return null;
  const expired = row.status === "GENERATING" && row.lease_until !== null && new Date(row.lease_until).getTime() < Date.now();
  const exhausted = expired && (row.attempts ?? 0) >= 2;
  const shouldResume = row.research_status === "APPROVED" && (row.status === "QUEUED" || expired);
  // Expose the work result, not private research evidence, agent traces or input payloads.
  const observedResult = row.result ? {
    success: row.result.success,
    websiteData: row.result.success && observer.kind === "user" ? row.result.websiteData : undefined,
    preview: row.result.success ? { ...row.result.preview, qualityScore: row.result.previewDetails?.qualityScore,
      designArchetype: row.result.websiteData.designStrategy?.visualArchetype,
      sectionCount: row.result.websiteData.sectionOrder?.length, imageManifest: row.result.previewDetails?.imageManifest } : undefined,
    business: row.result.success ? { name: row.result.businessContext.businessName, industry: row.result.businessContext.domain,
      category: row.result.businessContext.domain, location: row.result.businessContext.location } : undefined,
    design: row.result.success ? { archetype: row.result.websiteData.designStrategy?.visualArchetype,
      qualityScore: row.result.previewDetails?.qualityScore } : undefined,
    leadId: row.lead_id, auditId: row.audit_id,
    correlationId: row.result.correlationId,
    error: row.result.error,
  } : null;
  return { shouldResume, continuationTenant: row.continuation_pending ? row.tenant_id : undefined, status: exhausted ? "FAILED" : row.status || row.research_status,
    result: exhausted ? { success: false, error: { code: "RESUME_RETRY_EXHAUSTED",
      message: "Bounded generation recovery exhausted; administrator review required" } } : observedResult };
}

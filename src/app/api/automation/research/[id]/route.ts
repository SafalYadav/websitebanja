import { after, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { readResearchObservation } from "@/lib/intelligence/orchestration/researchObservation";
import { resumeApprovedResearch } from "@/lib/intelligence/orchestration/resumeApprovedResearch";
import { recoverPipelineContinuations } from "@/lib/intelligence/orchestration/pipelineResearchContinuation";

export const dynamic = "force-dynamic";

/** n8n may observe/resume an approved job; it cannot approve or activate learning. */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAuthorized(request)) return NextResponse.json({ error: "Unauthorized automation request" }, { status: 401 });
  const admin = await verifyAdminAuth(request);
  const tenantId = admin.isAdmin && admin.userId ? admin.userId : process.env.AUTOMATION_TENANT_ID;
  if (!tenantId) return NextResponse.json({ error: "Configure a server-side automation tenant", code: "AUTOMATION_TENANT_REQUIRED" }, { status: 403 });
  const { id } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(id)) return NextResponse.json({ error: "Invalid research identifier" }, { status: 400 });
  try {
    const observation = await readResearchObservation(id, { kind: "automation", tenantId });
    if (!observation) return NextResponse.json({ error: "Research not found" }, { status: 404 });
    if (observation.shouldResume) after(() => resumeApprovedResearch(id));
    const continuationTenant = observation.continuationTenant;
    if (continuationTenant) after(() => recoverPipelineContinuations({ researchId: id, tenantId: continuationTenant }));
    return NextResponse.json({ success: true, researchId: id, status: observation.status, result: observation.result },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Research status temporarily unavailable", code: "RESEARCH_STATUS_UNAVAILABLE" }, { status: 503 });
  }
}

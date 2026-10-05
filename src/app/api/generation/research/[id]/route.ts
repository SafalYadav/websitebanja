import { after, NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import { resumeApprovedResearch } from "@/lib/intelligence/orchestration/resumeApprovedResearch";
import { readResearchObservation } from "@/lib/intelligence/orchestration/researchObservation";
import { recoverPipelineContinuations } from "@/lib/intelligence/orchestration/pipelineResearchContinuation";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await validateUserAuth(request);
  if (!auth.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await context.params;
  if (!/^[a-f0-9]{64}$/.test(id)) return NextResponse.json({ error: "Invalid research identifier" }, { status: 400 });
  try {
    const observation = await readResearchObservation(id, { kind: "user", userId: auth.user.id });
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

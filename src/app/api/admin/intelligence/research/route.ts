import { NextResponse, after } from "next/server";
import { resumeApprovedResearch } from "@/lib/intelligence/orchestration/resumeApprovedResearch";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { getPool } from "@/lib/db/queries";
import { ensureResearchTables, ResearchDossierSchema } from "@/lib/intelligence/orchestration/researchGovernance";
import { ensureKnowledgeTables, evaluateKnowledgeRegression, verifyReusableKnowledge } from "@/lib/intelligence/orchestration/semanticKnowledge";
import { researchReviewHash } from "@/lib/intelligence/orchestration/approvedKnowledgeBinding";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.isAdmin || !auth.userId) return NextResponse.json({ error: "Administrator authentication required" }, { status: 403 });
  await ensureResearchTables();
  const result = await getPool().query("SELECT id,tenant_id,status,dossier,agent_trace,created_at,reviewed_by,version FROM public.generation_research WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100", [auth.userId]);
  return NextResponse.json({ success: true, research: result.rows.map(row => ({ ...row, review_hash: researchReviewHash(row) })) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.isAdmin || !auth.userId) return NextResponse.json({ error: "Administrator authentication required" }, { status: 403 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || !("id" in body) || !("action" in body) ||
      typeof body.id !== "string" || !body.id.trim() || body.id.length > 200 || !["approve", "reject"].includes(String(body.action)) ||
      !("expectedReviewHash" in body) || typeof body.expectedReviewHash !== "string" || !/^[a-f0-9]{64}$/.test(body.expectedReviewHash)) {
    return NextResponse.json({ error: "Valid research id and approve/reject action required" }, { status: 400 });
  }
  await ensureResearchTables();
  await ensureKnowledgeTables();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const record = await client.query("SELECT * FROM public.generation_research WHERE id=$1 AND tenant_id=$2 FOR UPDATE", [body.id, auth.userId]);
    const row = record.rows[0];
    if (!row || row.tenant_id !== auth.userId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Research not found" }, { status: 404 });
    }
    if (!row || row.status !== "WAITING_HUMAN_APPROVAL") {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Research is not awaiting human approval" }, { status: 409 });
    }
    if (researchReviewHash(row) !== body.expectedReviewHash) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Research evidence changed. Refresh and review the new evidence before deciding.", code: "STALE_RESEARCH_REVIEW" }, { status: 409 });
    }
    if (body.action === "approve") {
      const dossier = ResearchDossierSchema.parse(row.dossier);
      const originalRequest = row.request as { businessName: string };
      const concept = verifyReusableKnowledge(dossier.reusableKnowledge, originalRequest.businessName);
      if (concept.domain !== dossier.domain || concept.subdomain !== dossier.subdomain) throw new Error("Research and reusable knowledge disagree");
      const trace = row.agent_trace as Array<{ agent?: string; status?: string; output?: { approved?: boolean } }>;
      if (!Array.isArray(trace) || !trace.some(item => item.agent === "ceo" && item.status === "completed") ||
          !trace.some(item => item.agent === "boss" && item.status === "completed" && item.output?.approved === true)) {
        throw new Error("Independent CEO research and Boss verification are required");
      }
      const regression = evaluateKnowledgeRegression(concept);
      if (!regression.passed || dossier.confidence < .8 || dossier.contradictions.length) throw new Error("Knowledge regression or evidence validation failed");
      const conceptKey = `${concept.domain}:${concept.subdomain}`;
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${row.tenant_id}:${conceptKey}`]);
      const previous = await client.query("SELECT id FROM public.semantic_knowledge_versions WHERE tenant_id=$1 AND concept_key=$2 AND active", [row.tenant_id, conceptKey]);
      await client.query("UPDATE public.semantic_knowledge_versions SET active=FALSE WHERE tenant_id=$1 AND concept_key=$2 AND active", [row.tenant_id, conceptKey]);
      const activated = await client.query(`INSERT INTO public.semantic_knowledge_versions(tenant_id,concept_key,concept,research_id,approved_by,active,regression_report)
        VALUES($1,$2,$3,$4,$5,TRUE,$6) RETURNING id`, [row.tenant_id, conceptKey, JSON.stringify(concept), row.id, auth.userId, JSON.stringify(regression)]);
      await client.query(`INSERT INTO public.semantic_knowledge_events(tenant_id,concept_key,action,actor_user_id,version_id,previous_version_ids)
        VALUES($1,$2,'ACTIVATED',$3,$4,$5)`, [row.tenant_id, conceptKey, auth.userId, activated.rows[0].id, JSON.stringify(previous.rows.map(item => item.id))]);
    }
    const status = body.action === "approve" ? "APPROVED" : "REJECTED";
    await client.query("UPDATE public.generation_research SET status=$2,reviewed_by=$3,reviewed_payload_hash=$4,reviewed_at=NOW(),updated_at=NOW() WHERE id=$1 AND tenant_id=$3", [body.id,status,auth.userId,body.expectedReviewHash]);
    if (status === "APPROVED") {
      await client.query("INSERT INTO public.generation_research_resumes(research_id) VALUES($1) ON CONFLICT DO NOTHING", [body.id]);
    } else {
      await client.query(`UPDATE public.generation_pipeline_continuations SET status='REJECTED',lease_token=NULL,lease_until=NULL,updated_at=NOW()
        WHERE research_id=$1 AND tenant_id=$2 AND status='WAITING_RESEARCH'`, [body.id, row.tenant_id]);
    }
    await client.query("COMMIT");
    if (status === "APPROVED") after(() => resumeApprovedResearch(body.id as string));
    return NextResponse.json({ success: true, id: body.id, status });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Research review failed" }, { status: 500 });
  } finally { client.release(); }
}

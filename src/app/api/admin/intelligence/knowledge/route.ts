import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { getPool } from "@/lib/db/queries";
import { ensureKnowledgeTables, KnowledgeConceptSchema, evaluateKnowledgeRegression } from "@/lib/intelligence/orchestration/semanticKnowledge";
import { reviewedKnowledgeBinding } from "@/lib/intelligence/orchestration/approvedKnowledgeBinding";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.isAdmin || !auth.userId) return NextResponse.json({ error: "Human administrator required" }, { status: 403 });
  await ensureKnowledgeTables();
  const versions = await getPool().query(`SELECT v.id,v.tenant_id,v.concept_key,v.concept,v.active,v.approved_by,v.regression_report,v.created_at,
    (SELECT a.id FROM public.semantic_knowledge_versions a WHERE a.tenant_id=v.tenant_id AND a.concept_key=v.concept_key AND a.active) AS active_version_id
    FROM public.semantic_knowledge_versions v WHERE tenant_id=$1 ORDER BY v.id DESC LIMIT 100`, [auth.userId]);
  const events = await getPool().query("SELECT id,tenant_id,concept_key,action,actor_user_id,version_id,previous_version_ids,created_at FROM public.semantic_knowledge_events WHERE tenant_id=$1 ORDER BY id DESC LIMIT 100", [auth.userId]);
  return NextResponse.json({ versions: versions.rows, events: events.rows }, { headers: { "Cache-Control": "private, no-store" } });
}

/** Human-only rollback restores a previous approved version in one transaction. */
export async function POST(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.isAdmin || !auth.userId) return NextResponse.json({ error: "Human administrator required" }, { status: 403 });
  const input: unknown = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || !("versionId" in input) || !/^[1-9]\d{0,18}$/.test(String(input.versionId)) ||
      !("expectedActiveVersionId" in input) || (input.expectedActiveVersionId !== null && !/^[1-9]\d{0,18}$/.test(String(input.expectedActiveVersionId)))) {
    return NextResponse.json({ error: "Approved version and reviewed active-version snapshot required" }, { status: 400 });
  }
  await ensureKnowledgeTables();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("SELECT * FROM public.semantic_knowledge_versions WHERE id=$1 AND tenant_id=$2", [String(input.versionId), auth.userId]);
    const row = result.rows[0];
    if (!row || row.tenant_id !== auth.userId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Knowledge version not found" }, { status: 404 });
    }
    if (!row?.approved_by || !row.regression_report?.passed) throw new Error("Version lacks approval or regression evidence");
    if (!evaluateKnowledgeRegression(KnowledgeConceptSchema.parse(row.concept)).passed) throw new Error("Previous version fails current regressions");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${row.tenant_id}:${row.concept_key}`]);
    const locked = await client.query(`SELECT r.*,k.id AS knowledge_version_id,k.concept_key,k.concept,k.approved_by,k.regression_report,k.active
      FROM public.semantic_knowledge_versions k JOIN public.generation_research r ON r.id=k.research_id AND r.tenant_id=k.tenant_id
      WHERE k.id=$1 AND k.tenant_id=$2 FOR UPDATE OF k`, [row.id, auth.userId]);
    if (locked.rows.length !== 1) throw new Error("Version approval provenance is missing");
    const verified = reviewedKnowledgeBinding(locked.rows[0]);
    if (verified.conceptKey !== row.concept_key || !evaluateKnowledgeRegression(KnowledgeConceptSchema.parse(verified.concept)).passed) {
      throw new Error("Version changed or no longer passes current regressions");
    }
    const previous = await client.query("SELECT id FROM public.semantic_knowledge_versions WHERE tenant_id=$1 AND concept_key=$2 AND active", [row.tenant_id, row.concept_key]);
    const activeId = previous.rows[0] ? String(previous.rows[0].id) : null;
    const expectedId = input.expectedActiveVersionId === null ? null : String(input.expectedActiveVersionId);
    if (previous.rows.length > 1 || activeId !== expectedId) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Active knowledge changed. Refresh and review before confirming rollback.", code: "STALE_KNOWLEDGE_ROLLBACK" }, { status: 409 });
    }
    await client.query("UPDATE public.semantic_knowledge_versions SET active=FALSE WHERE tenant_id=$1 AND concept_key=$2 AND active", [row.tenant_id, row.concept_key]);
    await client.query("UPDATE public.semantic_knowledge_versions SET active=TRUE WHERE id=$1 AND tenant_id=$2", [row.id, auth.userId]);
    await client.query(`INSERT INTO public.semantic_knowledge_events(tenant_id,concept_key,action,actor_user_id,version_id,previous_version_ids)
      VALUES($1,$2,'ROLLED_BACK',$3,$4,$5)`, [row.tenant_id, row.concept_key, auth.userId, row.id, JSON.stringify(previous.rows.map(item => item.id))]);
    await client.query("COMMIT");
    return NextResponse.json({ success: true, activeVersionId: row.id, rolledBackBy: auth.userId });
  } catch {
    await client.query("ROLLBACK");
    return NextResponse.json({ error: "Knowledge rollback rejected" }, { status: 409 });
  } finally { client.release(); }
}

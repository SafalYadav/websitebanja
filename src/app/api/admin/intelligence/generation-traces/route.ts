import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { getPool } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const auth = await verifyAdminAuth(request);
  if (!auth.isAdmin || !auth.userId) return NextResponse.json({ error: "Human administrator required" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (id && !/^cgen_\d+_[a-f0-9]+$/.test(id)) return NextResponse.json({ error: "Invalid correlation ID" }, { status: 400 });
  try {
    const result = id
      ? await getPool().query("SELECT id,tenant_id,status,request,events,result,created_at,updated_at FROM public.generation_execution_traces WHERE id=$1 AND tenant_id=$2", [id, auth.userId])
      : await getPool().query("SELECT id,tenant_id,status,created_at,updated_at FROM public.generation_execution_traces WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 50", [auth.userId]);
    return NextResponse.json({ traces: result.rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Durable generation diagnostics unavailable; check migration and database configuration" }, { status: 503 });
  }
}

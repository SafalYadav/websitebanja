// WHY runtime = "nodejs": Generates ephemeral preview tokens and inserts them into Azure PostgreSQL.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import { dbCheckProjectExists, dbGeneratePreviewLink } from "@/lib/db/queries";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const exists = await dbCheckProjectExists(id, auth.user.id);
    if (!exists) {
      return NextResponse.json({ success: false, error: "Project not found or unauthorized" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const jsonData = (body?.jsonData || body) as Record<string, unknown>;

    const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const previewId = await dbGeneratePreviewLink(id, jsonData, expiresAt);

    return NextResponse.json({ success: true, previewId });
  } catch (err) {
    console.error("[POST /api/projects/[id]/preview] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to generate preview link" },
      { status: 500 }
    );
  }
}

// WHY runtime = "nodejs": Catalog operations interact directly with Azure PostgreSQL via pg.Pool.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import { dbUpdateCatalogItem, dbDeleteCatalogItem } from "@/lib/db/queries";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/catalog/[id]
 * Updates a single catalog item for the authenticated user.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Catalog Item ID is required" }, { status: 400 });
    }

    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const updates = (body?.updates || body) as Record<string, unknown>;

    const row = await dbUpdateCatalogItem(id, auth.user.id, updates);
    if (!row) {
      return NextResponse.json({ success: false, error: "Item not found or unauthorized to edit" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    console.error("[PATCH /api/catalog/[id]] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update catalog item" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/catalog/[id]
 * Deletes a single catalog item for the authenticated user.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Catalog Item ID is required" }, { status: 400 });
    }

    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const res = await dbDeleteCatalogItem(id, auth.user.id);
    if (res.error) {
      return NextResponse.json({ success: false, error: res.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/catalog/[id]] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to delete catalog item" },
      { status: 500 }
    );
  }
}

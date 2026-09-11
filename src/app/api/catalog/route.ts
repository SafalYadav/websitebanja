// WHY runtime = "nodejs": Catalog operations interact directly with Azure PostgreSQL via pg.Pool.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import {
  dbGetCatalogItems,
  dbCreateCatalogItem,
  dbUpdateCatalogOrder,
} from "@/lib/db/queries";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/catalog?projectId=xxx
 * Retrieves all catalog items for the specified project.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    if (!UUID_REGEX.test(projectId)) {
      return NextResponse.json({ success: true, data: [] });
    }

    const rows = await dbGetCatalogItems(projectId);
    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    console.error("[GET /api/catalog] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch catalog items" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/catalog
 * Creates a new catalog item under the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const item = body?.item || body;

    if (!item?.project_id) {
      return NextResponse.json({ success: false, error: "Missing project_id for catalog item" }, { status: 400 });
    }

    const row = await dbCreateCatalogItem(item as Record<string, unknown>, auth.user.id);
    return NextResponse.json({ success: true, data: row });
  } catch (err) {
    console.error("[POST /api/catalog] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create catalog item" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/catalog
 * Reorders catalog items for the authenticated user.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const updates = (body?.updates || body) as { id: string; display_order: number }[];

    if (!Array.isArray(updates)) {
      return NextResponse.json({ success: false, error: "Invalid updates array" }, { status: 400 });
    }

    const res = await dbUpdateCatalogOrder(updates, auth.user.id);
    if (res.error) {
      return NextResponse.json({ success: false, error: res.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[PATCH /api/catalog] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to reorder catalog items" },
      { status: 500 }
    );
  }
}

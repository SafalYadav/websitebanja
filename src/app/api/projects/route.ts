// WHY runtime = "nodejs": Azure PostgreSQL queries via pg.Pool require native Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import { dbCreateProject, dbGetProjects } from "@/lib/db/queries";
import { hydrateProjectMetadata } from "@/lib/projectHydration";
import type { Project } from "@/types/project";

/**
 * GET /api/projects
 * Lists all projects owned by the authenticated user.
 */
export async function GET(request: Request) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const rows = await dbGetProjects(auth.user.id);
    const projects = rows.map((p) => hydrateProjectMetadata(p as unknown as Project)!);

    return NextResponse.json({ success: true, data: projects });
  } catch (err) {
    console.error("[GET /api/projects] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects
 * Creates a new project for the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "My Website";

    const row = await dbCreateProject(auth.user.id, name);
    const project = hydrateProjectMetadata(row as unknown as Project);

    return NextResponse.json({ success: true, data: project });
  } catch (err) {
    console.error("[POST /api/projects] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to create project" },
      { status: 500 }
    );
  }
}

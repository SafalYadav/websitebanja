// WHY runtime = "nodejs": Duplication involves Azure PostgreSQL database operations and Blob Storage cloning.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import { dbGetProject, dbDuplicateProject } from "@/lib/db/queries";
import { serverReadAiWorkspace as readAiWorkspace, serverWriteAiWorkspace as writeAiWorkspace } from "@/lib/server/aiWorkspaceServer";
import { hydrateProjectMetadata } from "@/lib/projectHydration";
import type { Project } from "@/types/project";

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

    const original = await dbGetProject(id, auth.user.id);
    if (!original) {
      return NextResponse.json({ success: false, error: "Project not found or unauthorized" }, { status: 404 });
    }

    const newProjectRow = await dbDuplicateProject(original as unknown as Record<string, unknown>);
    if (!newProjectRow) {
      return NextResponse.json({ success: false, error: "Failed to duplicate project in database" }, { status: 500 });
    }

    const newProjectId = newProjectRow.id as string;

    // Duplicate AI workspace files in Azure Blob Storage if present
    try {
      const workspace = await readAiWorkspace(id);
      if (workspace) {
        await writeAiWorkspace(newProjectId, workspace);
      }
    } catch (wsErr) {
      console.warn(`[duplicateProject] Non-fatal AI workspace copy warning:`, wsErr);
    }

    return NextResponse.json({
      success: true,
      data: hydrateProjectMetadata(newProjectRow as unknown as Project),
    });
  } catch (err) {
    console.error("[POST /api/projects/[id]/duplicate] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to duplicate project" },
      { status: 500 }
    );
  }
}

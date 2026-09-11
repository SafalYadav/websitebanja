// WHY runtime = "nodejs": Azure PostgreSQL queries via pg.Pool require native Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import {
  dbGetProject,
  dbUpdateProject,
  dbDeleteProject,
  dbGetProjectOwnership,
  dbGetProjectJsonData,
} from "@/lib/db/queries";
import { hydrateProjectMetadata } from "@/lib/projectHydration";
import { getStorageClient } from "@/lib/storage";
import { AI_WORKSPACE_FILES } from "@/types/aiWorkspace";
import type { Project, ProjectUpdates } from "@/types/project";

const VALID_PROJECT_COLUMNS = new Set([
  "name",
  "business_name",
  "category",
  "description",
  "target_audience",
  "style",
  "primary_color",
  "secondary_color",
  "phone",
  "email",
  "website",
  "instagram",
  "facebook",
  "address",
  "json_data",
  "is_published",
  "public_slug",
  "published_at",
  "custom_domain",
  "custom_domain_status",
  "custom_domain_verified_at",
  "backend_requirement",
  "backend_config",
  "whatsapp_number",
  "whatsapp_message",
  "whatsapp_enabled",
  "onboarding_mode",
  "user_prompt",
  "selected_features",
  "preview_expires_at",
]);

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]
 * Retrieves a single project owned by the authenticated user.
 */
export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const row = await dbGetProject(id, auth.user.id);
    if (!row) {
      return NextResponse.json({ success: false, error: "Project not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: hydrateProjectMetadata(row as unknown as Project) });
  } catch (err) {
    console.error("[GET /api/projects/[id]] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to fetch project" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/projects/[id]
 * Updates project details for the authenticated user with resilient schema handling.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const body = await request.json().catch(() => ({}));
    const updates = (body?.updates || body) as ProjectUpdates;

    const cleanUpdates: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (VALID_PROJECT_COLUMNS.has(key) && val !== undefined) {
        cleanUpdates[key] = val;
      }
    }

    if (Object.keys(cleanUpdates).length === 0) {
      const existing = await dbGetProject(id, auth.user.id);
      return NextResponse.json({ success: true, data: hydrateProjectMetadata(existing as unknown as Project) });
    }

    // Ensure json_data holds backend metadata for 100% resilience across all environments
    let currentJsonData = (cleanUpdates.json_data || updates.json_data) as Record<string, unknown> | undefined;
    if (currentJsonData && typeof currentJsonData === "object") {
      if (updates.backend_config !== undefined && updates.backend_config !== null) {
        currentJsonData.backend_config = updates.backend_config;
      }
      if (updates.backend_requirement !== undefined) {
        currentJsonData.backend_requirement = updates.backend_requirement;
      }
      cleanUpdates.json_data = currentJsonData;
    }

    let row = await dbUpdateProject(id, auth.user.id, cleanUpdates);

    // Schema fallback if new columns are missing in Azure table
    if (!row && currentJsonData === undefined) {
      console.warn(`[PATCH /api/projects/${id}] Primary update returned null. Applying json_data fallback.`);
      const existingJsonData = await dbGetProjectJsonData(id, auth.user.id);
      currentJsonData = (existingJsonData as Record<string, unknown>) || {};

      if (updates.backend_config !== undefined) currentJsonData.backend_config = updates.backend_config;
      if (updates.backend_requirement !== undefined) currentJsonData.backend_requirement = updates.backend_requirement;
      if (updates.onboarding_mode !== undefined) currentJsonData.onboarding_mode = updates.onboarding_mode;
      if (updates.user_prompt !== undefined) currentJsonData.user_prompt = updates.user_prompt;
      if (updates.selected_features !== undefined) currentJsonData.selected_features = updates.selected_features;
      cleanUpdates.json_data = currentJsonData;

      delete cleanUpdates.backend_config;
      delete cleanUpdates.backend_requirement;
      delete cleanUpdates.onboarding_mode;
      delete cleanUpdates.user_prompt;
      delete cleanUpdates.selected_features;

      row = await dbUpdateProject(id, auth.user.id, cleanUpdates);
    }

    const project = hydrateProjectMetadata(row as unknown as Project);
    if (project) {
      if (updates.backend_config !== undefined) project.backend_config = updates.backend_config;
      if (updates.backend_requirement !== undefined) project.backend_requirement = updates.backend_requirement;
    }

    return NextResponse.json({ success: true, data: project });
  } catch (err) {
    console.error("[PATCH /api/projects/[id]] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to update project" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/projects/[id]
 * Deletes a project, optionally removing its Azure Blob Storage files first.
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ success: false, error: "Project ID is required" }, { status: 400 });
    }

    const auth = await validateUserAuth(request);
    if (!auth.user) {
      return NextResponse.json({ success: false, error: auth.error || "Unauthorized" }, { status: auth.status });
    }

    const url = new URL(request.url);
    const deleteStorage = url.searchParams.get("storage") === "true";

    if (deleteStorage) {
      const ownership = await dbGetProjectOwnership(id);
      if (!ownership || ownership.user_id !== auth.user.id) {
        return NextResponse.json({ success: false, error: "Unauthorized: not owner" }, { status: 403 });
      }

      const paths = AI_WORKSPACE_FILES.map((file) => `${id}/.websitebanja/${file}`);
      try {
        await getStorageClient("project-workspaces").remove(paths);
      } catch (storageErr) {
        console.warn(`[DELETE /api/projects/${id}] Storage cleanup warning:`, storageErr);
      }
    }

    const res = await dbDeleteProject(id, auth.user.id);
    if (res.error) {
      return NextResponse.json({ success: false, error: res.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/projects/[id]] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}

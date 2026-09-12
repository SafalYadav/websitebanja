// WHY runtime = "nodejs": Atomic publication uses Azure PostgreSQL stored functions and transactions.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import {
  dbGetProject,
  dbPublishProjectAtomic,
  dbGetProjectAfterPublish,
  dbUnpublishProject,
} from "@/lib/db/queries";
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

    const body = await request.json().catch(() => ({}));
    const action = body?.action || "publish";

    if (action === "unpublish") {
      const row = await dbUnpublishProject(id, auth.user.id);
      return NextResponse.json({ success: true, data: row });
    }

    const rawSlug = typeof body?.slug === "string" ? body.slug : "";
    const cleanSlug = rawSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (!cleanSlug) {
      return NextResponse.json(
        { success: false, error: "Invalid publication slug. Must contain alphanumeric characters or hyphens." },
        { status: 400 }
      );
    }

    const currentProject = await dbGetProject(id, auth.user.id);
    if (!currentProject) {
      return NextResponse.json({ success: false, error: "Project not found or unauthorized" }, { status: 404 });
    }

    const rawSnapshot = body?.latestJsonData || (currentProject.json_data as Record<string, unknown>) || {};
    const snapshotToSave = JSON.parse(JSON.stringify(rawSnapshot)) as Record<string, unknown>;
    snapshotToSave._project_meta = {
      primary_color: currentProject.primary_color,
      secondary_color: currentProject.secondary_color,
      style: currentProject.style,
      category: currentProject.category,
      business_name: currentProject.business_name,
      name: currentProject.name,
      whatsapp_number: currentProject.whatsapp_number,
      phone: currentProject.phone,
      whatsapp_message: currentProject.whatsapp_message,
      whatsapp_enabled: currentProject.whatsapp_enabled,
      backend_requirement:
        currentProject.backend_requirement ??
        ((currentProject.json_data as Record<string, unknown> | null)?.backend_requirement as string) ??
        "static",
      backend_config:
        currentProject.backend_config ??
        ((currentProject.json_data as Record<string, unknown> | null)?.backend_config as Record<string, unknown>) ??
        null,
      custom_domain: currentProject.custom_domain,
      custom_domain_status: currentProject.custom_domain_status,
    };

    const { error: rpcError } = await dbPublishProjectAtomic(
      auth.user.id,
      id,
      cleanSlug,
      snapshotToSave,
      auth.user.token
    );
    if (rpcError) {
      return NextResponse.json({ success: false, error: `Atomic publish failed: ${rpcError.message}` }, { status: 500 });
    }

    const updatedProject = await dbGetProjectAfterPublish(id, auth.user.id);
    return NextResponse.json({
      success: true,
      data: hydrateProjectMetadata(updatedProject as unknown as Project),
    });
  } catch (err) {
    console.error("[POST /api/projects/[id]/publish] Error:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Publication failed" },
      { status: 500 }
    );
  }
}

// WHY runtime = "nodejs": AI workspace interactions with Azure Blob Storage require Node.js runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { validateUserAuth } from "@/lib/supabaseServer";
import {
  serverAssertAiWorkspaceAccess,
  serverReadAiWorkspace,
  serverWriteAiWorkspace,
  serverVerifyAiWorkspace,
} from "@/lib/server/aiWorkspaceServer";
import type { AiWorkspace } from "@/types/aiWorkspace";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/workspace
 * Securely reads the AI workspace files from Azure Blob Storage.
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

    await serverAssertAiWorkspaceAccess(id, auth.user.id);
    const workspace = await serverReadAiWorkspace(id);

    return NextResponse.json({ success: true, data: workspace });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to read workspace";
    const status = message.includes("does not own") ? 403 : message.includes("not found") ? 404 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

/**
 * POST /api/projects/[id]/workspace
 * Persists AI workspace files to Azure Blob Storage and verifies integrity.
 */
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

    await serverAssertAiWorkspaceAccess(id, auth.user.id);

    const body = await request.json().catch(() => ({}));
    const workspace = body?.workspace as AiWorkspace;
    const existingWorkspace = body?.existingWorkspace as AiWorkspace | undefined;

    if (!workspace) {
      return NextResponse.json({ success: false, error: "Workspace data is missing" }, { status: 400 });
    }

    await serverWriteAiWorkspace(id, workspace, existingWorkspace);
    const verified = await serverVerifyAiWorkspace(id);

    return NextResponse.json({ success: true, data: verified });
  } catch (err) {
    console.error(`[POST /api/projects/workspace] Error:`, err);
    const message = err instanceof Error ? err.message : "Failed to save workspace";
    const status = message.includes("does not own") ? 403 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

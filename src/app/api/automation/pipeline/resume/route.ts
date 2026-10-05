// src/app/api/automation/pipeline/resume/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Resume Run

import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { verifyAdminAuth } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized: Missing or invalid automation secret." },
      },
      { status: 401 }
    );
  }

  try {
    const body: unknown = await req.json();
    const runId = body && typeof body === "object" && "runId" in body ? body.runId : undefined;

    if (typeof runId !== "string" || !/^[a-zA-Z0-9_-]{1,160}$/.test(runId)) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Parameter 'runId' is required." },
        },
        { status: 400 }
      );
    }

    const admin = await verifyAdminAuth(req);
    const tenantId = admin.isAdmin && admin.userId ? admin.userId : process.env.AUTOMATION_TENANT_ID;
    if (!tenantId) return NextResponse.json({ success: false, error: { code: "AUTOMATION_TENANT_REQUIRED", message: "Configure a server-side automation tenant" } }, { status: 403 });
    const run = await PipelineOrchestrator.resumeRun(runId, admin.isAdmin ? admin.userId : undefined, tenantId);
    return NextResponse.json({ success: true, run });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "RESUME_FAILED", message: sanitizeErrorOutput((err as Error)?.message || "Failed to resume run") },
      },
      { status: 400 }
    );
  }
}

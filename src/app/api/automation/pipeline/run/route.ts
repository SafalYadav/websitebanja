// src/app/api/automation/pipeline/run/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Trigger Run

import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { PipelineRunCriteriaSchema } from "@/lib/automation/pipelineTypes";
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
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: { code: "BAD_REQUEST", message: "Invalid JSON body provided." },
        },
        { status: 400 }
      );
    }

    const parsed = PipelineRunCriteriaSchema.safeParse(body && typeof body === "object" && "criteria" in body ? body.criteria : undefined);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid pipeline criteria: provide industry, city, a supported outreach channel and a bounded numeric limit.",
          },
        },
        { status: 400 }
      );
    }

    const admin = await verifyAdminAuth(req);
    const tenantId = admin.isAdmin && admin.userId ? admin.userId : process.env.AUTOMATION_TENANT_ID;
    if (!tenantId) return NextResponse.json({ success: false, error: { code: "AUTOMATION_TENANT_REQUIRED", message: "Configure a server-side automation tenant" } }, { status: 403 });
    const run = await PipelineOrchestrator.startRun(parsed.data, admin.isAdmin ? admin.userId : undefined, tenantId);

    return NextResponse.json({
      success: true,
      run,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "PIPELINE_RUN_FAILED",
          message: sanitizeErrorOutput((err as Error)?.message || "Failed to execute pipeline run"),
        },
      },
      { status: 500 }
    );
  }
}

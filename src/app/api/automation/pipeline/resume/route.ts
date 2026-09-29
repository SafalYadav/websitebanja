// src/app/api/automation/pipeline/resume/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Resume Run

import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized: Missing or invalid automation secret." },
      },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { runId, userId } = body || {};

    if (!runId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Parameter 'runId' is required." },
        },
        { status: 400 }
      );
    }

    const run = await PipelineOrchestrator.resumeRun(runId, userId);
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

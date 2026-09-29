// src/app/api/automation/pipeline/cancel/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Cancel Run

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
    const { runId, reason } = body || {};

    if (!runId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Parameter 'runId' is required." },
        },
        { status: 400 }
      );
    }

    const run = await PipelineOrchestrator.cancelRun(runId, reason);
    return NextResponse.json({ success: true, run });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "CANCEL_FAILED", message: sanitizeErrorOutput((err as Error)?.message || "Failed to cancel run") },
      },
      { status: 400 }
    );
  }
}

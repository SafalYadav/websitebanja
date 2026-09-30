// src/app/api/automation/pipeline/[runId]/retry/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Retry Failed Jobs for Run

import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
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
    const { runId } = await params;
    let body: { userId?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Body optional
    }

    const run = await PipelineOrchestrator.retryFailedJobs(runId, body.userId);
    return NextResponse.json({ success: true, run });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RETRY_FAILED",
          message: sanitizeErrorOutput((err as Error)?.message || "Failed to retry jobs"),
        },
      },
      { status: 500 }
    );
  }
}

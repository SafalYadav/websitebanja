// src/app/api/automation/pipeline/[runId]/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Get Run Details & Handoff Contract

import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { PipelineQueue } from "@/lib/automation/pipelineQueue";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export async function GET(
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
    const run = await PipelineQueue.getPipelineRun(runId);
    if (!run) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: `Pipeline run '${runId}' not found.` },
        },
        { status: 404 }
      );
    }

    const handoff = await PipelineOrchestrator.getHandoffContract(runId);

    return NextResponse.json({
      success: true,
      run,
      handoff,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: sanitizeErrorOutput((err as Error)?.message || "Failed to get run") },
      },
      { status: 500 }
    );
  }
}

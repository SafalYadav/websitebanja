// src/app/api/automation/pipeline/route.ts
// Phase 13 — Autonomous Lead Pipeline API: List Runs

import { NextResponse } from "next/server";
import { PipelineQueue } from "@/lib/automation/pipelineQueue";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

import { isAuthorized } from "@/lib/automation/auth";

export async function GET(req: Request) {
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
    const runs = await PipelineQueue.listPipelineRuns();
    return NextResponse.json({
      success: true,
      count: runs.length,
      runs,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: sanitizeErrorOutput((err as Error)?.message || "Failed to list pipeline runs") },
      },
      { status: 500 }
    );
  }
}

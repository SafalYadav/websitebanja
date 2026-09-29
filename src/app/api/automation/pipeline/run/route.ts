// src/app/api/automation/pipeline/run/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Trigger Run

import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type { PipelineRunCriteria } from "@/lib/automation/pipelineTypes";

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
    let body: { criteria?: PipelineRunCriteria; userId?: string } = {};
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

    const { criteria, userId } = body;
    if (!criteria || !criteria.industry || !criteria.city) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required criteria fields: 'industry' and 'city' are mandatory.",
          },
        },
        { status: 400 }
      );
    }

    const run = await PipelineOrchestrator.startRun(criteria, userId);

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

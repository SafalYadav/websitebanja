// src/app/api/automation/pipeline/[runId]/simulate-reply/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Simulate Inbound Reply for Lead in Run

import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
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
    const { runId } = await params;
    const body = await req.json();
    const { leadId, messageText, channel = "email", userId } = body || {};

    if (!leadId || !messageText) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Parameters 'leadId' and 'messageText' are required." },
        },
        { status: 400 }
      );
    }

    const result = await PipelineOrchestrator.simulateReplyForRunLead(
      runId,
      leadId,
      messageText,
      channel,
      userId
    );

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SIMULATE_REPLY_FAILED",
          message: sanitizeErrorOutput((err as Error)?.message || "Failed to simulate reply"),
        },
      },
      { status: 500 }
    );
  }
}

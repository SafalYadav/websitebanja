// src/app/api/automation/pipeline/[runId]/simulate-reply/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Simulate Inbound Reply for Lead in Run

import { NextResponse } from "next/server";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { PipelineRunIdSchema, PipelineReplySimulationSchema } from "@/lib/automation/pipelineTypes";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  try {
    const { runId } = await params;
    const parsed = PipelineReplySimulationSchema.safeParse(await req.json());
    if (!PipelineRunIdSchema.safeParse(runId).success || !parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Parameters 'leadId' and 'messageText' are required." },
        },
        { status: 400 }
      );
    }
    const { leadId, messageText, channel } = parsed.data;

    const result = await PipelineOrchestrator.simulateReplyForRunLead(
      runId,
      leadId,
      messageText,
      channel,
      auth.identity.userId,
      auth.identity.tenantId
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

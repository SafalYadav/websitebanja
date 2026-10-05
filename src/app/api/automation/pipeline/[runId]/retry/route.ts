// src/app/api/automation/pipeline/[runId]/retry/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Retry Failed Jobs for Run

import { NextResponse } from "next/server";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { PipelineRunIdSchema } from "@/lib/automation/pipelineTypes";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  try {
    const { runId } = await params;
    if (!PipelineRunIdSchema.safeParse(runId).success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid pipeline identifier" } }, { status: 400 });
    const run = await PipelineOrchestrator.retryFailedJobs(runId, auth.identity.userId, auth.identity.tenantId);
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

// src/app/api/automation/pipeline/[runId]/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Get Run Details & Handoff Contract

import { NextResponse } from "next/server";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { PipelineQueue } from "@/lib/automation/pipelineQueue";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { PipelineRunIdSchema } from "@/lib/automation/pipelineTypes";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  try {
    const { runId } = await params;
    if (!PipelineRunIdSchema.safeParse(runId).success) return NextResponse.json({ success: false, error: { code: "VALIDATION_ERROR", message: "Invalid pipeline identifier" } }, { status: 400 });
    const run = await PipelineQueue.getPipelineRun(runId, auth.identity.tenantId);
    if (!run) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: `Pipeline run '${runId}' not found.` },
        },
        { status: 404 }
      );
    }

    const handoff = await PipelineOrchestrator.getHandoffContract(runId, auth.identity.tenantId);

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

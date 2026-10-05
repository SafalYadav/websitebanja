// src/app/api/automation/pipeline/pause/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Pause Run

import { NextResponse } from "next/server";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { PipelineOrchestrator } from "@/lib/automation/pipelineOrchestrator";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { PipelineRunMutationSchema } from "@/lib/automation/pipelineTypes";

export async function POST(req: Request) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  try {
    const parsed = PipelineRunMutationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Parameter 'runId' is required." },
        },
        { status: 400 }
      );
    }

    const run = await PipelineOrchestrator.pauseRun(parsed.data.runId, auth.identity.tenantId);
    return NextResponse.json({ success: true, run });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "PAUSE_FAILED", message: sanitizeErrorOutput((err as Error)?.message || "Failed to pause run") },
      },
      { status: 400 }
    );
  }
}

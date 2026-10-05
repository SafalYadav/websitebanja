// src/app/api/automation/pipeline/route.ts
// Phase 13 — Autonomous Lead Pipeline API: List Runs

import { NextResponse } from "next/server";
import { PipelineQueue } from "@/lib/automation/pipelineQueue";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";

export async function GET(req: Request) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  try {
    const runs = await PipelineQueue.listPipelineRuns(auth.identity.tenantId);
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

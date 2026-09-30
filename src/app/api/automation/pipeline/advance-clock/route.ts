// src/app/api/automation/pipeline/advance-clock/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Advance Simulation Clock

import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { FollowUpQueue } from "@/lib/automation/followUpQueue";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export async function POST(req: Request) {
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
    const body = await req.json();
    const days = typeof body?.days === "number" ? body.days : 3;

    const result = await FollowUpQueue.advanceSimulationClock(days);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "CLOCK_ADVANCE_FAILED",
          message: sanitizeErrorOutput((err as Error)?.message || "Failed to advance clock"),
        },
      },
      { status: 500 }
    );
  }
}

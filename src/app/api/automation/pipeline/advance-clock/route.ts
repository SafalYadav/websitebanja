// src/app/api/automation/pipeline/advance-clock/route.ts
// Phase 13 — Autonomous Lead Pipeline API: Advance Simulation Clock

import { NextResponse } from "next/server";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { z } from "zod";
import { FollowUpQueue } from "@/lib/automation/followUpQueue";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export async function POST(req: Request) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  try {
    const body = z.object({ days: z.number().int().min(1).max(30).default(3) }).safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ success: false, error: { code: "INVALID_CLOCK_ADVANCE", message: "days must be an integer from 1 to 30" } }, { status: 400 });

    const result = await FollowUpQueue.advanceSimulationClock(body.data.days, auth.identity.tenantId);
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

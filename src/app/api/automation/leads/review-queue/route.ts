// src/app/api/automation/leads/review-queue/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { LeadCommandCenterService } from "@/lib/leads/leadCommandCenterService";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  try {
    const items = await LeadCommandCenterService.getReviewQueue(auth.identity.tenantId);
    return NextResponse.json({ success: true, reviewQueue: items, count: items.length });
  } catch (error) {
    const correlationId = `err_${randomUUID()}`;
    const safeMsg = sanitizeErrorOutput(error instanceof Error ? error.message : String(error));
    console.error(`[GET /api/automation/leads/review-queue][${correlationId}] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error fetching review queue",
          diagnostic: safeMsg,
          correlationId,
        },
      },
      { status: 500 }
    );
  }
}

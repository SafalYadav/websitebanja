// src/app/api/automation/leads/[leadId]/timeline/route.ts

import { NextRequest, NextResponse } from "next/server";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { LeadCommandCenterService } from "@/lib/leads/leadCommandCenterService";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { randomUUID } from "node:crypto";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  const auth = await authorizeAutomationTenant(req);
  if (auth.response) return auth.response;

  try {
    const { leadId } = await params;
    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId parameter" }, { status: 400 });
    }

    const timeline = await LeadCommandCenterService.getLeadTimeline(leadId, auth.identity.tenantId);
    return NextResponse.json({ success: true, timeline });
  } catch (error) {
    const correlationId = `err_${randomUUID()}`;
    const safeMsg = sanitizeErrorOutput(error instanceof Error ? error.message : String(error));
    console.error(`[GET /api/automation/leads/[leadId]/timeline][${correlationId}] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error fetching lead timeline",
          diagnostic: safeMsg,
          correlationId,
        },
      },
      { status: 500 }
    );
  }
}

// src/app/api/automation/leads/[leadId]/timeline/route.ts

import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { LeadCommandCenterService } from "@/lib/leads/leadCommandCenterService";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing automation credentials" },
      { status: 401 }
    );
  }

  try {
    const { leadId } = await params;
    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId parameter" }, { status: 400 });
    }

    const timeline = await LeadCommandCenterService.getLeadTimeline(leadId);
    return NextResponse.json({ success: true, timeline });
  } catch (error) {
    console.error("[GET /api/automation/leads/[leadId]/timeline] Error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching lead timeline", details: String(error) },
      { status: 500 }
    );
  }
}

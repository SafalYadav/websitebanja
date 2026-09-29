// src/app/api/automation/leads/follow-ups/route.ts

import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { LeadCommandCenterService } from "@/lib/leads/leadCommandCenterService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing automation credentials" },
      { status: 401 }
    );
  }

  try {
    const followUps = await LeadCommandCenterService.getFollowUpQueue();
    return NextResponse.json({ success: true, followUps, count: followUps.length });
  } catch (error) {
    console.error("[GET /api/automation/leads/follow-ups] Error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching follow-up queue", details: String(error) },
      { status: 500 }
    );
  }
}

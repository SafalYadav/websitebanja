// src/app/api/automation/leads/review-queue/route.ts

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
    const items = await LeadCommandCenterService.getReviewQueue();
    return NextResponse.json({ success: true, reviewQueue: items, count: items.length });
  } catch (error) {
    console.error("[GET /api/automation/leads/review-queue] Error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching review queue", details: String(error) },
      { status: 500 }
    );
  }
}

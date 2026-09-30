// src/app/api/automation/leads/[leadId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { LeadCommandCenterService } from "@/lib/leads/leadCommandCenterService";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  if (!(await isAuthorized(req))) {
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

    const detail = await LeadCommandCenterService.getLeadDetail(leadId);
    if (!detail) {
      return NextResponse.json({ error: `Lead '${leadId}' not found` }, { status: 404 });
    }

    return NextResponse.json({ success: true, lead: detail });
  } catch (error) {
    console.error("[GET /api/automation/leads/[leadId]] Error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching lead detail", details: String(error) },
      { status: 500 }
    );
  }
}

// src/app/api/automation/analytics/optimization/route.ts

import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { AnalyticsService } from "@/lib/analytics/analyticsService";
import type { TimeFilter } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing automation credentials" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const rawFilter =
      url.searchParams.get("timeRange") || url.searchParams.get("timeFilter") || "all";
    const timeFilter: TimeFilter = ["24h", "7d", "30d", "all"].includes(rawFilter)
      ? (rawFilter as TimeFilter)
      : "all";

    const optimization = await AnalyticsService.getOptimizationReport(timeFilter);
    return NextResponse.json({ success: true, data: optimization });
  } catch (error) {
    console.error("[GET /api/automation/analytics/optimization] Error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching optimization analytics", details: String(error) },
      { status: 500 }
    );
  }
}

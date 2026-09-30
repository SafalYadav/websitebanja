// src/app/api/automation/leads/route.ts

import { NextRequest, NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { LeadCommandCenterService } from "@/lib/leads/leadCommandCenterService";
import type { FilterPreset } from "@/lib/leads/types";
import type { PipelineStage } from "@/lib/automation/pipelineTypes";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing automation credentials" },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || undefined;
    const preset = (url.searchParams.get("preset") as FilterPreset) || undefined;
    const stage = (url.searchParams.get("stage") as PipelineStage | "ALL") || undefined;
    const industry = url.searchParams.get("industry") || undefined;
    const qualification = (url.searchParams.get("qualification") as any) || undefined;
    const minOpp = url.searchParams.get("minOpportunity");
    const minOpportunity = minOpp ? Number(minOpp) : undefined;
    const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1;
    const limit = url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 25;
    const sortField = (url.searchParams.get("sortField") as any) || undefined;
    const sortDir = (url.searchParams.get("sortDir") as any) || undefined;

    const result = await LeadCommandCenterService.listCommandCenterLeads({
      search,
      preset,
      stage,
      industry,
      qualification,
      minOpportunity,
      page,
      limit,
      sortField,
      sortDir,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[GET /api/automation/leads] Error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching leads", details: String(error) },
      { status: 500 }
    );
  }
}

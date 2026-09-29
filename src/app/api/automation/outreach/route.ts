// src/app/api/automation/outreach/route.ts
/**
 * WebsiteBanja Outreach Management API
 * Phase: Phase 11 (Personalized Outreach Foundation)
 *
 * Endpoints:
 *   GET   /api/automation/outreach — List stored outreach records with optional filters
 *   PATCH /api/automation/outreach — Update outreach status (review, approve, reject, simulate_send, edit)
 */

export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { outreachRepository } from "@/lib/outreach/outreachRepository";
import { localSimulationProvider } from "@/lib/outreach/simulationProvider";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type {
  ListOutreachFilter,
  UpdateOutreachStatusRequest,
  OutreachChannel,
  OutreachStatus,
} from "@/lib/outreach/types";

import { isAuthorized } from "@/lib/automation/auth";


export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization." } },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const filter: ListOutreachFilter = {
      leadId: searchParams.get("leadId") || undefined,
      channel: (searchParams.get("channel") as OutreachChannel) || undefined,
      status: (searchParams.get("status") as OutreachStatus) || undefined,
      search: searchParams.get("search") || undefined,
      userId: searchParams.get("userId") || undefined,
    };

    const records = await outreachRepository.listOutreachRecords(filter);

    return NextResponse.json(
      {
        success: true,
        count: records.length,
        records,
        handoffPhase: "phase12_reply_intelligence_crm",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LIST_OUTREACH_FAILED",
          message: "Failed to list outreach records.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization." } },
      { status: 401 }
    );
  }

  let body: UpdateOutreachStatusRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "MALFORMED_JSON", message: "Invalid JSON syntax." } },
      { status: 400 }
    );
  }

  if (!body.outreachId || !body.status) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VALIDATION_FAILED", message: "outreachId and status are required." },
      },
      { status: 400 }
    );
  }

  try {
    if (body.status === "simulated_sent") {
      const simRes = await localSimulationProvider.simulateDispatch(body.outreachId, body.userId);
      return NextResponse.json(
        {
          success: true,
          outreach: simRes.outreach,
          receipt: simRes.receipt,
          handoffToPhase12: simRes.handoffToPhase12,
          handoffPhase: "phase12_reply_intelligence_crm",
        },
        { status: 200 }
      );
    }

    const updated = await outreachRepository.updateOutreachStatus(body);
    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: `Outreach record '${body.outreachId}' not found.` },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        outreach: updated,
        handoffPhase: "phase12_reply_intelligence_crm",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPDATE_OUTREACH_FAILED",
          message: "Failed to update outreach record.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}

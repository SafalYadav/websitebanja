// src/app/api/automation/crm/route.ts
/**
 * WebsiteBanja Automation API — CRM Pipeline & Conversations
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Endpoint: GET /api/automation/crm
 * Lists CRM pipeline leads, active conversations, and current state.
 */

import { NextResponse } from "next/server";
import { crmRepository } from "@/lib/crm/crmRepository";
import type { ListCRMFilter, CRMLeadStatus } from "@/lib/crm/types";
import type { OutreachChannel } from "@/lib/outreach/types";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

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
    const filter: ListCRMFilter = {
      status: (searchParams.get("status") as CRMLeadStatus) || undefined,
      channel: (searchParams.get("channel") as OutreachChannel) || undefined,
      search: searchParams.get("search") || undefined,
      userId: searchParams.get("userId") || undefined,
    };

    const leads = await crmRepository.listLeadCRMStates(filter);

    return NextResponse.json(
      {
        success: true,
        count: leads.length,
        leads,
        handoffPhase: "phase13_autonomous_lead_pipeline",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "LIST_CRM_FAILED",
          message: "Failed to list CRM leads.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}

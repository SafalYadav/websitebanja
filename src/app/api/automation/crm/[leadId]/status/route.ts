// src/app/api/automation/crm/[leadId]/status/route.ts
/**
 * WebsiteBanja Automation API — Update Lead CRM Status
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Endpoint: PATCH /api/automation/crm/[leadId]/status
 * Updates lead lifecycle state, records audit transition history,
 * and emits status change CRM timeline event.
 */

import { NextResponse } from "next/server";
import { crmRepository } from "@/lib/crm/crmRepository";
import type { CRMLeadStatus, UpdateLeadCRMStatusRequest } from "@/lib/crm/types";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

interface RouteContext {
  params: Promise<{ leadId: string }>;
}

import { isAuthorized } from "@/lib/automation/auth";

const VALID_STATUSES: Set<CRMLeadStatus> = new Set([
  "DISCOVERED",
  "QUALIFIED",
  "AUDITED",
  "PREVIEW_READY",
  "OUTREACH_DRAFTED",
  "OUTREACH_APPROVED",
  "OUTREACH_SENT",
  "REPLIED",
  "INTERESTED",
  "NOT_INTERESTED",
  "FOLLOW_UP",
  "MEETING_REQUESTED",
  "WON",
  "LOST",
  "DO_NOT_CONTACT",
]);


export async function PATCH(req: Request, context: RouteContext) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization." } },
      { status: 401 }
    );
  }

  try {
    const { leadId } = await context.params;
    const body: UpdateLeadCRMStatusRequest = await req.json();

    if (!body.newStatus || !VALID_STATUSES.has(body.newStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_STATUS",
            message: `Invalid lead status '${body.newStatus}'. Supported: ${Array.from(VALID_STATUSES).join(", ")}`,
          },
        },
        { status: 400 }
      );
    }

    if (!body.reason || typeof body.reason !== "string" || body.reason.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_FAILED", message: "A reason is required for status transitions." },
        },
        { status: 400 }
      );
    }

    const updated = await crmRepository.updateLeadStatus(
      leadId,
      body.newStatus,
      body.reason.trim(),
      "admin",
      undefined,
      undefined,
      body.userId
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Lead '${leadId}' not found.` } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        leadState: updated,
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
          code: "UPDATE_STATUS_FAILED",
          message: "Failed to update lead CRM status.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}

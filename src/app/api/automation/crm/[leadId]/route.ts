// src/app/api/automation/crm/[leadId]/route.ts
/**
 * WebsiteBanja Automation API — Lead CRM Details
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Endpoint: GET /api/automation/crm/[leadId]
 * Fetches full CRM record: lead info, active conversation, chat messages,
 * latest reply intelligence, next action recommendation, and timeline.
 */

import { NextResponse } from "next/server";
import { crmRepository } from "@/lib/crm/crmRepository";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

interface RouteContext {
  params: Promise<{ leadId: string }>;
}

const DEFAULT_LOCAL_AUTOMATION_SECRET = "wb-auto-secret-local-dev-2026";

function isAuthorized(req: Request): boolean {
  const configuredSecret =
    process.env.WEBSITEBANJA_AUTOMATION_SECRET || DEFAULT_LOCAL_AUTOMATION_SECRET;

  const headerSecret = req.headers.get("x-automation-secret");
  if (headerSecret && headerSecret.trim() === configuredSecret) {
    return true;
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token === configuredSecret) {
      return true;
    }
  }

  const referer = req.headers.get("referer") || "";
  const host = req.headers.get("host") || "";
  if (host.includes("localhost") || host.includes("127.0.0.1")) {
    if (referer.includes("/admin/")) {
      return true;
    }
  }

  return false;
}

export async function GET(req: Request, context: RouteContext) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization." } },
      { status: 401 }
    );
  }

  try {
    const { leadId } = await context.params;
    if (!leadId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_FAILED", message: "Missing leadId parameter." } },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;

    const leadState = await crmRepository.getLeadCRMState(leadId, userId);
    if (!leadState) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: `Lead '${leadId}' not found in CRM.` } },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        leadState,
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
          code: "GET_CRM_LEAD_FAILED",
          message: "Failed to fetch lead CRM state.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}

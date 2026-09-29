// src/app/api/automation/generate-outreach-draft/route.ts
/**
 * WebsiteBanja Personalized Outreach Draft Automation API
 * Phase: Phase 11 (Personalized Outreach Foundation)
 *
 * Endpoint: POST /api/automation/generate-outreach-draft
 * Purpose: Secure internal automation endpoint to generate personalized outreach drafts
 */

export const maxDuration = 60;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { generateOutreachDraft } from "@/lib/outreach/personalizationEngine";
import type { DraftOutreachRequest, DraftOutreachResponse } from "@/lib/outreach/types";

const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB
const DEFAULT_LOCAL_AUTOMATION_SECRET = "wb-auto-secret-local-dev-2026";

function validateAutomationAuth(req: Request): boolean {
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

  return false;
}

export async function POST(req: Request) {
  const requestId = `req_p11_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Authentication Check
  if (!validateAutomationAuth(req)) {
    emitAgentEvent({
      event: "automation.auth_failed",
      agent: "n8n_automation",
      requestId,
      status: "error",
      metadata: { error: "Missing or invalid automation secret" },
    });

    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase12_reply_intelligence_crm",
        error: {
          code: "UNAUTHORIZED",
          message: "Request rejected: Missing or invalid automation secret.",
        },
      },
      { status: 401 }
    );
  }

  // 2. Payload Size Guard
  const rawBody = await req.text();
  if (rawBody.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase12_reply_intelligence_crm",
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: `Request payload exceeds 256 KB limit (${rawBody.length} bytes).`,
        },
      },
      { status: 413 }
    );
  }

  // 3. JSON Parsing & Input Validation
  let payload: DraftOutreachRequest;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase12_reply_intelligence_crm",
        error: {
          code: "MALFORMED_JSON",
          message: "Invalid JSON syntax in request body.",
        },
      },
      { status: 400 }
    );
  }

  if (!payload.leadId || typeof payload.leadId !== "string" || payload.leadId.trim() === "") {
    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase12_reply_intelligence_crm",
        error: {
          code: "VALIDATION_FAILED",
          message: "Missing required parameter 'leadId'.",
        },
      },
      { status: 400 }
    );
  }

  // 4. Execution via PersonalizationEngine
  try {
    const result: DraftOutreachResponse = await generateOutreachDraft(payload);

    if (!result.success && result.error?.code === "LEAD_NOT_FOUND") {
      return NextResponse.json(result, { status: 404 });
    }

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err);
    emitAgentEvent({
      event: "outreach.draft.validation_failed",
      agent: "mitra",
      requestId,
      status: "error",
      metadata: { error: safeError },
    });

    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase12_reply_intelligence_crm",
        error: {
          code: "OUTREACH_GENERATION_FAILED",
          message: "An internal error occurred during personalized outreach generation.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}

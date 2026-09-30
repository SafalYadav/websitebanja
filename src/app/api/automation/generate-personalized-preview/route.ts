// src/app/api/automation/generate-personalized-preview/route.ts
/**
 * WebsiteBanja Personalized Preview Generation Automation API
 * Phase: Phase 10 (Automated Personalized Preview Generation)
 *
 * Endpoint: POST /api/automation/generate-personalized-preview
 * Purpose: Secure internal automation boundary for generating audit-driven preview websites
 */

export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { generatePersonalizedPreview } from "@/lib/personalization/previewGenerator";
import type { PersonalizedPreviewRequest, PersonalizedPreviewResponse } from "@/lib/personalization/types";

const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB
import { isAuthorized } from "@/lib/automation/auth";

export async function POST(req: Request) {
  const requestId = `req_p10_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Authorization Check
  if (!(await isAuthorized(req))) {
    emitAgentEvent({
      event: "automation.auth_failed",
      agent: "n8n_automation",
      requestId,
      status: "error",
      metadata: { error: "Missing or invalid authorization" },
    });

    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "UNAUTHORIZED",
        message: "Unauthorized automation request. Provide valid secret via x-automation-secret or Bearer token.",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 401 });
  }

  // 2. Payload Extraction & Size Check
  let rawBodyText = "";
  try {
    rawBodyText = await req.text();
  } catch {
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "INVALID_BODY",
        message: "Failed to read request body stream",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (rawBodyText.length > MAX_PAYLOAD_BYTES) {
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: `Payload exceeds maximum allowed limit of ${MAX_PAYLOAD_BYTES / 1024} KB`,
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 413 });
  }

  // 3. JSON Parsing & Input Validation
  let parsedBody: PersonalizedPreviewRequest;
  try {
    parsedBody = rawBodyText ? JSON.parse(rawBodyText) : {};
  } catch {
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "MALFORMED_JSON",
        message: "Invalid JSON syntax in request body",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (!parsedBody.leadId && !parsedBody.overrideLead) {
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "VALIDATION_FAILED",
        message: "Field 'leadId' is required to generate a personalized preview.",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: "unknown",
      auditId: "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  // 4. Generate Personalized Preview
  try {
    const response: PersonalizedPreviewResponse = await generatePersonalizedPreview(parsedBody);

    if (response.status === "failed") {
      const statusCode = response.error?.code === "LEAD_NOT_FOUND" ? 404 : 400;
      return NextResponse.json(response, { status: statusCode });
    }

    if (response.status === "quality_failed") {
      return NextResponse.json(response, { status: 422 });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    const safeMessage = sanitizeErrorOutput(err);
    const errorBody = {
      success: false,
      status: "failed",
      error: {
        code: "PREVIEW_GENERATION_FAILED",
        message: safeMessage || "Unexpected error during personalized preview generation",
      },
      handoffPhase: "phase11_personalized_outreach",
      leadId: parsedBody.leadId || "unknown",
      auditId: parsedBody.auditId || "unknown",
      business: { name: "Unknown", industry: "unknown", category: "unknown", location: "unknown" },
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

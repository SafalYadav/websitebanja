// src/app/api/automation/audit-lead/route.ts
/**
 * WebsiteBanja Lead Research & Website Audit Automation API
 * Phase: Phase 9 (Business Research + Website Audit Agent)
 *
 * Endpoint: POST /api/automation/audit-lead
 * Purpose: Secure internal automation boundary for auditing qualified leads
 */

export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { auditQualifiedLead, AuditServiceError } from "@/lib/audit/auditService";
import type { AuditErrorResponse, AuditLeadRequest } from "@/lib/audit/types";

const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB
import { isAuthorized } from "@/lib/automation/auth";

export async function POST(req: Request) {
  const requestId = `req_audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Authorization Check
  if (!(await isAuthorized(req))) {
    emitAgentEvent({
      event: "automation.auth_failed",
      agent: "n8n_automation",
      requestId,
      status: "error",
      metadata: { error: "Missing or invalid authorization" },
    });

    const errorBody: AuditErrorResponse = {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message:
          "Unauthorized automation request. Provide valid secret via x-automation-secret or Bearer token.",
      },
      auditId: requestId,
    };
    return NextResponse.json(errorBody, { status: 401 });
  }

  // 2. Payload Extraction & Size Check
  let rawBodyText = "";
  try {
    rawBodyText = await req.text();
  } catch {
    const errorBody: AuditErrorResponse = {
      success: false,
      error: {
        code: "INVALID_BODY",
        message: "Failed to read request body stream",
      },
      auditId: requestId,
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (rawBodyText.length > MAX_PAYLOAD_BYTES) {
    const errorBody: AuditErrorResponse = {
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: `Payload exceeds maximum allowed limit of ${MAX_PAYLOAD_BYTES / 1024} KB`,
      },
      auditId: requestId,
    };
    return NextResponse.json(errorBody, { status: 413 });
  }

  // 3. JSON Parsing & Input Validation
  let parsedBody: AuditLeadRequest;
  try {
    parsedBody = rawBodyText ? JSON.parse(rawBodyText) : {};
  } catch {
    const errorBody: AuditErrorResponse = {
      success: false,
      error: {
        code: "MALFORMED_JSON",
        message: "Invalid JSON syntax in request body",
      },
      auditId: requestId,
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (!parsedBody.leadId && !parsedBody.lead) {
    const errorBody: AuditErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Either 'leadId' or 'lead' object must be provided in request body",
      },
      auditId: requestId,
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  // 4. Execute Research & Audit
  try {
    const report = await auditQualifiedLead(parsedBody);
    return NextResponse.json(
      {
        success: true,
        auditId: report.auditId,
        report,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    if (err instanceof AuditServiceError) {
      const errorBody: AuditErrorResponse = {
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
        auditId: requestId,
      };
      return NextResponse.json(errorBody, { status: err.statusCode });
    }

    const safeMessage = sanitizeErrorOutput(err);
    const errorBody: AuditErrorResponse = {
      success: false,
      error: {
        code: "AUDIT_EXECUTION_FAILED",
        message: safeMessage || "Unexpected error during lead website audit",
      },
      auditId: requestId,
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

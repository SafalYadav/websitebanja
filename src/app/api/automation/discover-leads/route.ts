// src/app/api/automation/discover-leads/route.ts
/**
 * WebsiteBanja Lead Discovery & Qualification Automation API
 * Phase: Phase 8 (Business Discovery + Lead Qualification)
 *
 * Endpoint: POST /api/automation/discover-leads
 * Purpose: Secure internal automation boundary for local n8n business discovery
 */

export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import {
  executeDiscoveryRun,
  DiscoveryValidationError,
} from "@/lib/discovery/discoveryService";
import { DiscoveryProviderError } from "@/lib/discovery/providers/types";
import type { DiscoveryErrorResponse } from "@/lib/discovery/types";

const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB
const DEFAULT_LOCAL_AUTOMATION_SECRET = "wb-auto-secret-local-dev-2026";

/**
 * Validates request authorization against WEBSITEBANJA_AUTOMATION_SECRET
 */
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
  const requestId = `req_disc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Authorization Check
  if (!validateAutomationAuth(req)) {
    emitAgentEvent({
      event: "automation.auth_failed",
      agent: "n8n_automation",
      requestId,
      status: "error",
      metadata: { error: "Missing or invalid automation secret" },
    });

    const errorBody: DiscoveryErrorResponse = {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message:
          "Unauthorized automation request. Provide valid secret via x-automation-secret or Bearer token.",
      },
      runId: requestId,
    };
    return NextResponse.json(errorBody, { status: 401 });
  }

  // 2. Payload Extraction & Size Check
  let rawBodyText = "";
  try {
    rawBodyText = await req.text();
  } catch {
    const errorBody: DiscoveryErrorResponse = {
      success: false,
      error: {
        code: "INVALID_BODY",
        message: "Failed to read request body stream",
      },
      runId: requestId,
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (rawBodyText.length > MAX_PAYLOAD_BYTES) {
    const errorBody: DiscoveryErrorResponse = {
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: `Payload exceeds maximum allowed limit of ${MAX_PAYLOAD_BYTES / 1024} KB`,
      },
      runId: requestId,
    };
    return NextResponse.json(errorBody, { status: 413 });
  }

  // 3. JSON Parsing
  let parsedBody: unknown;
  try {
    parsedBody = rawBodyText ? JSON.parse(rawBodyText) : {};
  } catch {
    const errorBody: DiscoveryErrorResponse = {
      success: false,
      error: {
        code: "MALFORMED_JSON",
        message: "Invalid JSON syntax in request body",
      },
      runId: requestId,
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  // 4. Execution
  try {
    const result = await executeDiscoveryRun(parsedBody);
    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    if (err instanceof DiscoveryValidationError) {
      const errorBody: DiscoveryErrorResponse = {
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
        runId: requestId,
      };
      return NextResponse.json(errorBody, { status: err.statusCode });
    }

    if (err instanceof DiscoveryProviderError) {
      const errorBody: DiscoveryErrorResponse = {
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
        runId: requestId,
      };
      return NextResponse.json(errorBody, { status: err.statusCode });
    }

    const safeMessage = sanitizeErrorOutput(err);
    const errorBody: DiscoveryErrorResponse = {
      success: false,
      error: {
        code: "DISCOVERY_EXECUTION_FAILED",
        message: safeMessage || "Unexpected error during business discovery run",
      },
      runId: requestId,
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

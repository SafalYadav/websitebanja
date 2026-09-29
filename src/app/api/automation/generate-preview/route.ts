// src/app/api/automation/generate-preview/route.ts
/**
 * WebsiteBanja Automation Preview Generation API
 * Phase: Phase 7 (n8n Automation Foundation + WebsiteBanja Preview Integration)
 *
 * Endpoint: POST /api/automation/generate-preview
 * Purpose: Secure internal automation boundary for local n8n workflows
 */

export const maxDuration = 120;
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { generateAutomationPreview } from "@/lib/automation/previewService";
import {
  computeIdempotencyKey,
  getIdempotentResult,
  setIdempotentResult,
} from "@/lib/automation/idempotency";
import type { AutomationPreviewRequest, AutomationErrorResponse } from "@/lib/automation/types";

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
  const requestId = `req_auto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();

  // 1. Authorization Check
  if (!validateAutomationAuth(req)) {
    emitAgentEvent({
      event: "automation.auth_failed",
      agent: "n8n_automation",
      requestId,
      status: "error",
      metadata: { error: "Missing or invalid automation secret" },
    });

    const errorBody: AutomationErrorResponse = {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message:
          "Unauthorized automation request. Provide valid secret via x-automation-secret or Bearer token.",
      },
      requestId,
    };
    return NextResponse.json(errorBody, { status: 401 });
  }

  // 2. Payload Extraction & Size Check
  let rawBodyText = "";
  try {
    rawBodyText = await req.text();
  } catch (err) {
    const errorBody: AutomationErrorResponse = {
      success: false,
      error: {
        code: "INVALID_BODY",
        message: "Failed to read request body stream",
      },
      requestId,
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (rawBodyText.length > MAX_PAYLOAD_BYTES) {
    const errorBody: AutomationErrorResponse = {
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: `Payload exceeds maximum allowed limit of ${MAX_PAYLOAD_BYTES / 1024} KB`,
      },
      requestId,
    };
    return NextResponse.json(errorBody, { status: 413 });
  }

  let body: AutomationPreviewRequest;
  try {
    body = JSON.parse(rawBodyText);
  } catch {
    const errorBody: AutomationErrorResponse = {
      success: false,
      error: {
        code: "MALFORMED_JSON",
        message: "Request body must be valid JSON",
      },
      requestId,
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  // 3. Field Validation
  if (
    !body ||
    typeof body.businessName !== "string" ||
    body.businessName.trim().length < 2 ||
    body.businessName.trim().length > 100
  ) {
    const errorBody: AutomationErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Field 'businessName' is required and must be between 2 and 100 characters.",
      },
      requestId,
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  if (body.services && (!Array.isArray(body.services) || body.services.length > 20)) {
    const errorBody: AutomationErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_FAILED",
        message: "Field 'services' must be an array with at most 20 entries.",
      },
      requestId,
    };
    return NextResponse.json(errorBody, { status: 400 });
  }

  // 4. Idempotency Check
  const explicitIdempotencyKey =
    req.headers.get("x-idempotency-key") || body.idempotencyKey;
  const idempotencyKey = computeIdempotencyKey(
    explicitIdempotencyKey,
    body as unknown as Record<string, unknown>
  );

  const cachedResponse = getIdempotentResult(idempotencyKey);
  if (cachedResponse) {
    emitAgentEvent({
      event: "automation.idempotent_hit",
      agent: "n8n_automation",
      requestId,
      metadata: {
        idempotencyKey,
        previewId: cachedResponse.preview.id,
      },
    });
    return NextResponse.json(cachedResponse, { status: 200 });
  }

  // 5. Telemetry: Workflow and Generation Start
  emitAgentEvent({
    event: "automation.started",
    agent: "n8n_automation",
    requestId,
    metadata: {
      businessName: body.businessName,
      industry: body.industry || "unspecified",
      source: "n8n_webhook",
    },
  });

  emitAgentEvent({
    event: "automation.validated",
    agent: "n8n_automation",
    requestId,
    metadata: {
      businessName: body.businessName,
      servicesCount: body.services?.length || 0,
    },
  });

  emitAgentEvent({
    event: "automation.website_generation_started",
    agent: "generator",
    requestId,
    metadata: {
      businessName: body.businessName,
      engine: "phase6_premium",
    },
  });

  // 6. Pipeline Execution
  try {
    const result = await generateAutomationPreview(body, requestId);

    emitAgentEvent({
      event: "automation.website_generation_completed",
      agent: "generator",
      requestId,
      metadata: {
        previewId: result.preview.id,
        durationMs: result.generation.durationMs,
        qualityScore: result.design?.qualityScore,
      },
    });

    emitAgentEvent({
      event: "automation.preview_created",
      agent: "n8n_automation",
      requestId,
      metadata: {
        previewId: result.preview.id,
        slug: result.preview.slug,
        previewUrl: result.preview.url,
        totalDurationMs: Date.now() - startTime,
      },
    });

    // Store in Idempotency cache
    setIdempotentResult(idempotencyKey, result);

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err);
    emitAgentEvent({
      event: "automation.website_generation_failed",
      agent: "generator",
      requestId,
      status: "error",
      metadata: { error: safeError },
    });

    emitAgentEvent({
      event: "automation.failed",
      agent: "n8n_automation",
      requestId,
      status: "error",
      metadata: { error: safeError },
    });

    const errorBody: AutomationErrorResponse = {
      success: false,
      error: {
        code: "GENERATION_FAILED",
        message: safeError || "Failed to execute website generation pipeline",
      },
      requestId,
    };
    return NextResponse.json(errorBody, { status: 500 });
  }
}

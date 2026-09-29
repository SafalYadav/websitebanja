// src/app/api/automation/simulate-reply/route.ts
/**
 * WebsiteBanja Automation API — Simulate Inbound Reply
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Endpoint: POST /api/automation/simulate-reply
 * Accepts simulated inbound customer responses, executes AI / deterministic
 * reply classification, recommends next actions, and updates CRM state.
 *
 * ABSOLUTE LOCAL SAFETY:
 *   - Strictly local simulation. Zero real messages sent or received.
 */

import { NextResponse } from "next/server";
import { simulateInboundReply } from "@/lib/crm/replySimulation";
import type { SimulateReplyRequest, SimulateReplyResponse } from "@/lib/crm/types";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

const MAX_PAYLOAD_SIZE = 256 * 1024; // 256 KB
import { isAuthorized } from "@/lib/automation/auth";

export async function POST(req: Request) {
  const requestId = `req_p12_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // 1. Authentication
  if (!isAuthorized(req)) {
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
        handoffPhase: "phase13_autonomous_lead_pipeline",
        error: {
          code: "UNAUTHORIZED",
          message: "Missing or invalid x-automation-secret header.",
        },
      },
      { status: 401 }
    );
  }

  // 2. Payload size check
  const contentLength = req.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_SIZE) {
    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase13_autonomous_lead_pipeline",
        error: {
          code: "PAYLOAD_TOO_LARGE",
          message: "Request payload exceeds maximum allowed size of 256KB.",
        },
      },
      { status: 413 }
    );
  }

  // 3. Body parsing
  let body: SimulateReplyRequest;
  try {
    const raw = await req.text();
    if (raw.length > MAX_PAYLOAD_SIZE) {
      return NextResponse.json(
        {
          success: false,
          handoffPhase: "phase13_autonomous_lead_pipeline",
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: "Request payload exceeds maximum allowed size of 256KB.",
          },
        },
        { status: 413 }
      );
    }
    body = JSON.parse(raw);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase13_autonomous_lead_pipeline",
        error: {
          code: "MALFORMED_JSON",
          message: "Request body contains invalid JSON syntax.",
        },
      },
      { status: 400 }
    );
  }

  if (!body.leadId || typeof body.leadId !== "string" || body.leadId.trim() === "") {
    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase13_autonomous_lead_pipeline",
        error: {
          code: "VALIDATION_FAILED",
          message: "Missing required parameter 'leadId'.",
        },
      },
      { status: 400 }
    );
  }

  if (!body.messageText || typeof body.messageText !== "string" || body.messageText.trim() === "") {
    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase13_autonomous_lead_pipeline",
        error: {
          code: "VALIDATION_FAILED",
          message: "Missing required parameter 'messageText'.",
        },
      },
      { status: 400 }
    );
  }

  // 4. Execution
  try {
    const result: SimulateReplyResponse = await simulateInboundReply(body);

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
      event: "crm.reply.analysis_failed",
      agent: "mitra",
      requestId,
      status: "error",
      metadata: { error: safeError },
    });

    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase13_autonomous_lead_pipeline",
        error: {
          code: "REPLY_SIMULATION_FAILED",
          message: "Internal error during inbound reply simulation.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}

// src/app/api/automation/ops/route.ts
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { opsToolExecutor } from "@/lib/intelligence/ops/opsToolExecutor";
import { OPS_TOOL_NAMES } from "@/lib/intelligence/ops/opsToolTypes";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * GET /api/automation/ops
 * Lists the 12 registered Ops Agent tools and system readiness.
 */
export async function GET(req: Request) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing automation secret." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    agent: "WB — Ops Agent",
    tools: OPS_TOOL_NAMES,
    status: "ready",
    invariants: {
      whatsappEnabled: false,
      autoSendEnabled: false,
      humanApprovalMandatory: true,
      maxFollowUps: 2,
    },
  });
}

/**
 * POST /api/automation/ops
 * Secure execution boundary for n8n Ops Agent tool calls.
 */
export async function POST(req: Request) {
  // 1. Authorization
  if (!(await isAuthorized(req))) {
    emitAgentEvent({
      event: "automation.auth_failed",
      agent: "n8n_automation",
      status: "error",
      metadata: { endpoint: "/api/automation/ops" },
    });

    return NextResponse.json(
      {
        success: false,
        error: "Unauthorized: Invalid or missing automation secret.",
        tool: "unknown",
      },
      { status: 401 }
    );
  }

  // 2. Body Parsing
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: "Malformed JSON payload.",
        tool: "unknown",
      },
      { status: 400 }
    );
  }

  // 3. Execution via OpsToolExecutor
  const response = await opsToolExecutor.executeTool(body);
  const status = response.success ? 200 : response.errors.some((e) => e.includes("Unauthorized") || e.includes("forbidden")) ? 403 : 400;

  return NextResponse.json(response, { status: response.success ? 200 : status });
}

// src/app/api/admin/intelligence/ops/route.ts
import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import {
  n8nOpsClient,
  opsToolExecutor,
  OPS_TOOL_NAMES,
  MemoryStore,
  type CeoN8nTaskDispatch,
} from "@/lib/intelligence";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/intelligence/ops
 * Returns n8n Ops Agent configuration, tool status, security invariants, and recent operational executions.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_ops_get_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const webhookConfigured = Boolean(
      process.env.N8N_OPS_AGENT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL
    );

    // Fetch recent operational decisions/reports from MemoryStore
    const memoryStore = MemoryStore.getInstance();
    const recentDecisions = await memoryStore.getDecisions({
      limit: 20,
    });

    // Filter or highlight operational decisions
    const opsReports = recentDecisions.filter(
      (d) =>
        d.objective?.toLowerCase().includes("ops") ||
        d.objective?.toLowerCase().includes("n8n") ||
        d.chosenAction?.toLowerCase().includes("ops")
    );

    return NextResponse.json({
      success: true,
      agent: {
        name: "n8n Ops Agent",
        status: "active",
        executionMode: webhookConfigured ? "n8n_webhook" : "local_executor_loop",
        webhookConfigured,
      },
      securityInvariants: {
        whatsappStatus: "DISABLED",
        emailAutoSend: "DISABLED (Draft only, Human Approval Mandatory)",
        optOutCompliance: "ACTIVE (DO_NOT_CONTACT enforcement)",
        secretRedaction: "ACTIVE",
      },
      tools: OPS_TOOL_NAMES.map((name) => ({
        name,
        available: true,
        type: "operational",
      })),
      recentReports: opsReports.slice(0, 10),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(message) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/intelligence/ops
 * Triggers an operational task dispatch from Admin UI via n8nOpsClient.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_ops_post_${ip}`, 15, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (!body.objective || typeof body.objective !== "string" || !body.objective.trim()) {
      return NextResponse.json(
        { success: false, message: "A valid operational objective string is required." },
        { status: 400 }
      );
    }

    const taskDispatch: CeoN8nTaskDispatch = {
      taskId: body.taskId || `task_admin_ops_${Date.now()}`,
      objective: body.objective.trim(),
      priority: body.priority || "medium",
      constraints: Array.isArray(body.constraints) ? body.constraints : [],
      allowedTools: Array.isArray(body.allowedTools) && body.allowedTools.length > 0 ? body.allowedTools : [...OPS_TOOL_NAMES],
      approvalRequired: Boolean(body.approvalRequired),
      tenantId: body.tenantId || null,
      leadId: body.leadId || null,
      input: typeof body.input === "object" && body.input !== null ? body.input : {},
      correlationId: `corr_admin_${Date.now()}`,
    };

    const callback = await n8nOpsClient.dispatchTask(taskDispatch);

    return NextResponse.json({
      success: true,
      callback,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(message) },
      { status: 500 }
    );
  }
}

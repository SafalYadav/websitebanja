// src/app/api/admin/intelligence/executive/route.ts
import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import {
  executeExecutiveTask,
  getRecentExecutiveRuns,
  AgentRegistry,
  ToolRegistry,
  type ExecutiveTaskRequest,
} from "@/lib/intelligence";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/intelligence/executive
 * Returns recent executive run history and available agent/tool registries.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_exec_get_${ip}`, 60, 60 * 1000);
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

    const recentRuns = getRecentExecutiveRuns(20);
    const agents = AgentRegistry.getInstance().listAgents().map((a) => ({
      name: a.name,
      role: a.role,
      capabilities: a.capabilities,
      availability: a.operationalAvailability,
      riskLevel: a.riskLevel,
    }));
    const tools = ToolRegistry.getInstance().listTools().map((t) => ({
      name: t.name,
      description: t.description,
      permissionLevel: t.permissionLevel,
      riskLevel: t.riskLevel,
    }));

    return NextResponse.json({
      success: true,
      recentRuns,
      agents,
      tools,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: sanitizeErrorOutput(err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/intelligence/executive
 * Executes an executive strategic task.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_exec_post_${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Rate limit exceeded. Please wait a moment." },
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

    const body = await req.json();
    if (!body || typeof body.objective !== "string" || !body.objective.trim()) {
      return NextResponse.json(
        { success: false, message: "Invalid payload: 'objective' string is required." },
        { status: 400 }
      );
    }

    const taskRequest: ExecutiveTaskRequest = {
      objective: body.objective.trim(),
      priority: body.priority || "medium",
      userId: auth.userId,
      projectId: body.projectId || null,
      sessionId: body.sessionId || null,
      constraints: Array.isArray(body.constraints) ? body.constraints : [],
      allowExternalWrite: body.allowExternalWrite === true,
      requireHumanApproval: body.requireHumanApproval !== false,
      dryRun: body.dryRun === true,
    };

    const result = await executeExecutiveTask(taskRequest);

    return NextResponse.json({
      success: result.success,
      result,
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorOutput(err instanceof Error ? err.message : String(err)),
      },
      { status: 500 }
    );
  }
}

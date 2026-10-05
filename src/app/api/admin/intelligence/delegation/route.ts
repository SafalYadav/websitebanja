// src/app/api/admin/intelligence/delegation/route.ts
import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import {
  delegationManager,
  capabilityMatcher,
  type CeoDelegationRequest,
} from "@/lib/intelligence";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/intelligence/delegation
 * Returns recent execution trees, registered capabilities, and delegation hierarchy status.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_delegation_get_${ip}`, 60, 60 * 1000);
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

    const { searchParams } = new URL(req.url);
    const treeId = searchParams.get("treeId");

    if (treeId) {
      const tree = delegationManager.getExecutionTree(treeId);
      if (!tree) {
        return NextResponse.json(
          { success: false, message: `Execution tree '${treeId}' not found.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, tree });
    }

    const trees = delegationManager.getRecentTrees(20);
    const capabilities = capabilityMatcher.getCapabilities();

    return NextResponse.json({
      success: true,
      trees,
      capabilities,
      hierarchy: {
        root: "CEO (depth: 0)",
        supervisor: "BOSS (depth: 1)",
        specialists: ["SKILLS (depth: 2)", "UNIQUENESS (depth: 2)"],
      },
    });
  } catch (error: unknown) {
    const safeError = sanitizeErrorOutput(error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { success: false, message: `Failed to fetch delegation trees: ${safeError}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/intelligence/delegation
 * Triggers a hierarchical delegation run from CEO -> Boss -> Skills/Uniqueness.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_delegation_post_${ip}`, 30, 60 * 1000);
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
    if (!body.objective || typeof body.objective !== "string" || body.objective.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid request: 'objective' is required." },
        { status: 400 }
      );
    }

    const tenantId = body.tenantId?.trim() || auth.userId;
    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Authorized workspace tenant required." },
        { status: 403 }
      );
    }

    const delegationRequest: CeoDelegationRequest = {
      objective: body.objective.trim(),
      input: body.input || {},
      constraints: Array.isArray(body.constraints) ? body.constraints : undefined,
      toolAllowlist: Array.isArray(body.toolAllowlist) ? body.toolAllowlist : undefined,
      budget: body.budget,
      deadline: body.deadline,
      riskLevel: body.riskLevel || "low",
      approvalRequired: Boolean(body.approvalRequired),
      tenantId,
      projectId: body.projectId || null,
      createdBy: auth.email || "admin",
      correlationId: body.correlationId,
    };

    const { result, tree } = await delegationManager.executeCeoDelegation(delegationRequest);

    return NextResponse.json({
      success: true,
      result,
      tree,
    });
  } catch (error: unknown) {
    const safeError = sanitizeErrorOutput(error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { success: false, message: `Delegation execution failed: ${safeError}` },
      { status: 500 }
    );
  }
}

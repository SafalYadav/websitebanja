// src/app/api/admin/intelligence/governance/route.ts
// Phase 25 — Governance & Action Authority
// Protected API endpoint for governance status, audit log, and approval management.

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { policyEngine } from "@/lib/intelligence/policies/policyEngine";
import { governanceAuditLog } from "@/lib/intelligence/policies/governanceAuditLog";
import { governanceApprovalStore } from "@/lib/intelligence/policies/governanceApprovalStore";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { authorizeHumanApproval } from "@/lib/intelligence/pipeline/humanApprovalAuthorization";
import { z } from "zod";

export const dynamic = "force-dynamic";

const identifier = z.string().trim().min(1).max(200);
const GovernanceAction = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), approvalId: identifier }),
  z.object({ action: z.literal("reject"), approvalId: identifier, rejectionReason: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("create_approval"), tool: identifier, taskId: identifier.optional(), actionPayload: z.unknown() }),
  z.object({ action: z.literal("evaluate_action"), tool: identifier,
    authorityLevel: z.enum(["READ", "ANALYZE", "PLAN", "WRITE_INTERNAL", "WRITE_EXTERNAL", "HIGH_RISK_ACTION"]),
    riskLevel: z.enum(["low", "medium", "high", "critical"]).optional(), taskId: identifier.optional() }),
]);

/**
 * GET /api/admin/intelligence/governance
 * Returns governance mode, policy rules, audit log summary, and pending approvals.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_gov_get_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const rules = policyEngine.listRules();
    const auditSummary = governanceAuditLog.getSummary(auth.userId);
    const recentDecisions = governanceAuditLog.getRecent(20, auth.userId);
    const pendingApprovals = governanceApprovalStore.listPending(auth.userId);
    const recentRecords = governanceApprovalStore.listRecords(20, auth.userId);

    return NextResponse.json({
      success: true,
      governance: {
        mode: "ACTIVE",
        persistence: "process_local",
        defaultDeny: true,
        securityInvariants: {
          whatsappStatus: "PERMANENTLY_DISABLED",
          telegramStatus: "NOT_YET_IMPLEMENTED",
          externalEmailRequiresHumanApproval: true,
          aiSelfApprovalBlocked: true,
          ceoApprovalNotEquivalentToHumanApproval: true,
          approvalIsOneTimeOnly: true,
          crossTenantApprovalsImpossible: true,
          modifiedPayloadRequiresReApproval: true,
          secretsNeverInAuditLog: true,
          defaultDenyForUnknownActions: true,
        },
        authorityLevels: [
          "READ",
          "ANALYZE",
          "PLAN",
          "WRITE_INTERNAL",
          "WRITE_EXTERNAL",
          "HIGH_RISK_ACTION",
        ],
        policyRules: rules,
        auditSummary,
        recentDecisions,
        pendingApprovals: pendingApprovals.length,
        pendingApprovalsList: pendingApprovals.map((r) => ({
          approvalId: r.approvalId,
          action: r.action,
          tool: r.tool,
          requestedBy: r.requestedBy,
          requestedAt: r.requestedAt,
          expiresAt: r.expiresAt,
          tenantId: r.tenantId,
          taskId: r.taskId,
        })),
        recentApprovalRecords: recentRecords.map((r) => ({
          approvalId: r.approvalId,
          action: r.action,
          tool: r.tool,
          status: r.status,
          requestedBy: r.requestedBy,
          requestedAt: r.requestedAt,
          approvedBy: r.approvedBy,
          approvedAt: r.approvedAt,
          consumed: r.consumed,
          consumedAt: r.consumedAt,
          expiresAt: r.expiresAt,
          tenantId: r.tenantId,
        })),
      },
    });
  } catch (err) {
    const message = sanitizeErrorOutput(
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

/**
 * POST /api/admin/intelligence/governance
 * Handles approval actions: approve, reject, create_approval, evaluate_action.
 *
 * Body schemas:
 *
 * Identity and tenant always come from verified authentication; payload identity fields confer no authority.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_gov_post_${ip}`, 20, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await verifyAdminAuth(req);
    if (!auth.isAdmin || !auth.userId) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const parsed = GovernanceAction.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid governance action payload" }, { status: 400 });
    const body = parsed.data;
    const { action } = body;

    if (action === "approve" || action === "reject") {
      const owned = governanceApprovalStore.getRecord(body.approvalId);
      if (!owned || owned.tenantId !== auth.userId) {
        return NextResponse.json({ success: false, message: "Approval not found" }, { status: 404 });
      }
    }

    if (action === "approve") {
      const authorization = await authorizeHumanApproval(req, auth.userId);
      const record = governanceApprovalStore.approve({ approvalId: body.approvalId, approvedBy: auth.userId, tenantId: auth.userId, authorization });
      return NextResponse.json({ success: true, record });
    }

    if (action === "reject") {
      const authorization = await authorizeHumanApproval(req, auth.userId);
      const record = governanceApprovalStore.reject({ approvalId: body.approvalId, rejectedBy: auth.userId,
        rejectionReason: body.rejectionReason, tenantId: auth.userId, authorization });
      return NextResponse.json({ success: true, record });
    }

    if (action === "create_approval") {
      const { tool, taskId, actionPayload } = body;
      const record = governanceApprovalStore.createApproval({
        action: tool,
        tool,
        requestedBy: auth.userId,
        tenantId: auth.userId,
        taskId,
        actionPayload: actionPayload ?? {},
      });
      return NextResponse.json({ success: true, record });
    }

    if (action === "evaluate_action") {
      const { tool, authorityLevel, riskLevel, taskId } = body;
      const decision = policyEngine.evaluateAction({
        action: tool,
        tool,
        requestingAgent: auth.userId,
        authorityLevel,
        riskLevel: riskLevel || "medium",
        tenantId: auth.userId,
        taskId,
      });
      return NextResponse.json({ success: true, decision });
    }

    return NextResponse.json(
      { success: false, message: `Unknown governance action: '${action}'.` },
      { status: 400 }
    );
  } catch (err) {
    const message = sanitizeErrorOutput(
      err instanceof Error ? err.message : String(err)
    );
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

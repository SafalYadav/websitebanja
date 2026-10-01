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

export const dynamic = "force-dynamic";

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
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const rules = policyEngine.listRules();
    const auditSummary = governanceAuditLog.getSummary();
    const recentDecisions = governanceAuditLog.getRecent(20);
    const pendingApprovals = governanceApprovalStore.listPending();
    const recentRecords = governanceApprovalStore.listRecords(20);

    return NextResponse.json({
      success: true,
      governance: {
        mode: "ACTIVE",
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
 * { action: "approve", approvalId: string, approvedBy: string, tenantId?: string }
 * { action: "reject", approvalId: string, rejectedBy: string, rejectionReason?: string }
 * { action: "create_approval", tool: string, requestedBy: string, tenantId?: string, taskId?: string, actionPayload: unknown }
 * { action: "evaluate_action", tool: string, authorityLevel: string, riskLevel?: string, tenantId?: string, requestingAgent?: string }
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
    if (!auth.isAdmin) {
      return NextResponse.json(
        { success: false, message: auth.error || "Forbidden: Administrator access required." },
        { status: auth.error?.includes("Missing") ? 401 : 403 }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "approve") {
      const { approvalId, approvedBy, tenantId } = body;
      if (!approvalId || !approvedBy) {
        return NextResponse.json(
          { success: false, message: "approvalId and approvedBy are required." },
          { status: 400 }
        );
      }
      const record = governanceApprovalStore.approve({ approvalId, approvedBy, tenantId });
      return NextResponse.json({ success: true, record });
    }

    if (action === "reject") {
      const { approvalId, rejectedBy, rejectionReason } = body;
      if (!approvalId) {
        return NextResponse.json(
          { success: false, message: "approvalId is required." },
          { status: 400 }
        );
      }
      const record = governanceApprovalStore.reject({ approvalId, rejectedBy, rejectionReason });
      return NextResponse.json({ success: true, record });
    }

    if (action === "create_approval") {
      const { tool, requestedBy, tenantId, taskId, actionPayload } = body;
      if (!tool || !requestedBy) {
        return NextResponse.json(
          { success: false, message: "tool and requestedBy are required." },
          { status: 400 }
        );
      }
      const record = governanceApprovalStore.createApproval({
        action: tool,
        tool,
        requestedBy,
        tenantId,
        taskId,
        actionPayload: actionPayload ?? {},
      });
      return NextResponse.json({ success: true, record });
    }

    if (action === "evaluate_action") {
      const { tool, authorityLevel, riskLevel, tenantId, requestingAgent, taskId } = body;
      if (!tool || !authorityLevel) {
        return NextResponse.json(
          { success: false, message: "tool and authorityLevel are required." },
          { status: 400 }
        );
      }
      const decision = policyEngine.evaluateAction({
        action: tool,
        tool,
        requestingAgent: requestingAgent || "admin_ui",
        authorityLevel,
        riskLevel: riskLevel || "medium",
        tenantId,
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

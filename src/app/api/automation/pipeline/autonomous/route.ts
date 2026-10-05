// src/app/api/automation/pipeline/autonomous/route.ts
import { NextResponse } from "next/server";
import { authorizeAutomationTenant } from "@/lib/automation/automationApiIdentity";
import { z } from "zod";
import { PipelineCriteriaSchema } from "@/lib/intelligence/pipeline/pipelineTypes";
import { authorizeHumanApproval } from "@/lib/intelligence/pipeline/humanApprovalAuthorization";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { autonomousPipeline } from "@/lib/intelligence/pipeline/autonomousPipeline";
import { approvalGate } from "@/lib/intelligence/pipeline/approvalGate";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  action: z.enum(["start", "approve", "reject", "send", "reply", "terminal", "resume_research"]).default("start"),
  criteria: PipelineCriteriaSchema.optional(), niche: z.string().min(1).max(200).optional(),
  location: z.string().min(1).max(300).optional(), limit: z.number().int().min(1).max(100).optional(),
  projectId: z.string().min(1).max(200).nullable().optional(), taskId: z.string().min(1).max(200).optional(),
  idempotencyKey: z.string().min(1).max(200).optional(),
  pipelineRunId: z.string().min(1).max(200).optional(), leadId: z.string().min(1).max(200).optional(),
  outreachId: z.string().min(1).max(200).optional(), approvalId: z.string().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(), reason: z.string().min(1).max(2000).optional(),
  sendNow: z.boolean().optional(), messageText: z.string().min(1).max(10000).optional(),
  senderEmail: z.string().email().optional(), messageId: z.string().min(1).max(200).optional(),
  outcome: z.enum(["WON", "LOST"]).optional(),
});

/**
 * GET /api/automation/pipeline/autonomous
 * Query autonomous pipeline runs, specific run details, or pending approval queue.
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`api_auto_pipe_get_${ip}`, 60, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await authorizeAutomationTenant(req);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    const action = searchParams.get("action");

    if (action === "pending_approvals") {
      const pending = await approvalGate.getStoredPendingApprovals(auth.identity.tenantId);
      const telegramPayloads = pending.map((p) =>
        approvalGate.formatTelegramApprovalRequest(p)
      );
      return NextResponse.json({
        success: true,
        count: pending.length,
        pendingApprovals: pending,
        telegramPayloads,
      });
    }

    if (runId) {
      const run = await autonomousPipeline.readStoredRun(runId, auth.identity.tenantId);
      if (!run || run.tenantId !== auth.identity.tenantId) {
        return NextResponse.json(
          { success: false, message: `Pipeline run '${runId}' not found.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, run });
    }

    const runs = await autonomousPipeline.listStoredRuns(20, auth.identity.tenantId);
    return NextResponse.json({
      success: true,
      count: runs.length,
      runs,
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
 * POST /api/automation/pipeline/autonomous
 * Control autonomous pipeline: start, approve, reject, send, ingest reply, terminal outcome.
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`api_auto_pipe_post_${ip}`, 30, 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { success: false, message: "Too many requests. Please wait." },
        { status: 429 }
      );
    }

    const auth = await authorizeAutomationTenant(req);
    if (auth.response) return auth.response;
    const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, message: "Invalid autonomous pipeline request" }, { status: 400 });
    const admin = await verifyAdminAuth(req);
    const body = { ...parsed.data, tenantId: auth.identity.tenantId, userId: auth.identity.userId,
      approvedBy: admin.userId, rejectedBy: admin.userId };
    const action = body.action;
    if (["approve", "reject"].includes(action) && (!admin.isAdmin || !admin.userId || admin.userId !== auth.identity.tenantId)) {
      return NextResponse.json({ success: false, message: "Authenticated human tenant administrator required" }, { status: 403 });
    }
    if (["approve", "reject", "send"].includes(action)) {
      const approval = await approvalGate.getStoredApprovalRecord(body.outreachId || body.approvalId || "", auth.identity.tenantId);
      if (!approval || approval.tenantId !== auth.identity.tenantId) return NextResponse.json({ success: false, message: "Approval not found" }, { status: 404 });
      if ((action === "send" || body.sendNow) && (body.pipelineRunId !== approval.pipelineRunId || body.leadId !== approval.leadId)) {
        return NextResponse.json({ success: false, message: "Send must match the original approved run and lead" }, { status: 400 });
      }
    }
    if (["send", "reply", "terminal"].includes(action) || body.sendNow) {
      const run = autonomousPipeline.getRun(body.pipelineRunId || "");
      if (!run || run.tenantId !== auth.identity.tenantId || !body.leadId || !run.leads[body.leadId]) {
        return NextResponse.json({ success: false, message: "Owned pipeline run and lead not found" }, { status: 404 });
      }
    }
    if ((action === "reply" && !body.messageText) || (action === "terminal" && !body.outcome)) {
      return NextResponse.json({ success: false, message: "Required action payload is missing" }, { status: 400 });
    }

    switch (action) {
      case "resume_research": {
        const run = await autonomousPipeline.readStoredRun(body.pipelineRunId || "", auth.identity.tenantId);
        if (!run || run.tenantId !== auth.identity.tenantId) return NextResponse.json({ success: false, message: "Owned pipeline run not found" }, { status: 404 });
        const resumed = await autonomousPipeline.resumeResearch(run.pipelineRunId, auth.identity.tenantId);
        return NextResponse.json({ success: true, pipelineRunId: resumed.pipelineRunId, status: resumed.status, run: resumed });
      }
      case "start": {
        const criteriaResult = PipelineCriteriaSchema.safeParse(body.criteria || {
          niche: body.niche,
          location: body.location,
          limit: body.limit || 5,
        });
        if (!criteriaResult.success) return NextResponse.json({ success: false, message: "Invalid discovery criteria" }, { status: 400 });
        const criteria = criteriaResult.data;

        const run = await autonomousPipeline.startPipeline(criteria, {
          tenantId: body.tenantId || null,
          projectId: body.projectId || null,
          taskId: body.taskId,
          userId: body.userId,
          idempotencyKey: body.idempotencyKey,
        });

        return NextResponse.json({
          success: true,
          pipelineRunId: run.pipelineRunId,
          status: run.status,
          stats: run.stats,
          run,
        });
      }

      case "approve": {
        const outreachId = String(body.outreachId || body.approvalId || "");
        const approvedBy = admin.userId!;
        const notes = body.notes;

        const authorization = await authorizeHumanApproval(req, auth.identity.tenantId);
        const approval = await approvalGate.approveDraft(outreachId, authorization, notes);

        // If sendNow is requested, dispatch immediately after human approval
        if (body.sendNow && body.pipelineRunId && body.leadId) {
          const sendRes = await autonomousPipeline.executeApprovedSend(
            body.pipelineRunId,
            body.leadId,
            approval.outreachId,
            { approvedBy, userId: body.userId }
          );
          return NextResponse.json({
            success: true,
            approval,
            sendResult: sendRes,
          });
        }

        return NextResponse.json({
          success: true,
          approval,
        });
      }

      case "reject": {
        const outreachId = String(body.outreachId || body.approvalId || "");
        const reason = String(body.reason || "Rejected by administrator");
        const authorization = await authorizeHumanApproval(req, auth.identity.tenantId);
        const approval = await approvalGate.rejectDraft(outreachId, authorization, reason);
        return NextResponse.json({
          success: true,
          approval,
        });
      }

      case "send": {
        const pipelineRunId = String(body.pipelineRunId || "");
        const leadId = String(body.leadId || "");
        const outreachId = String(body.outreachId || "");

        const sendResult = await autonomousPipeline.executeApprovedSend(
          pipelineRunId,
          leadId,
          outreachId,
          { approvedBy: body.approvedBy, userId: body.userId }
        );

        return NextResponse.json({
          success: sendResult.success,
          messageId: sendResult.messageId,
          isSimulated: sendResult.isSimulated || false,
          error: sendResult.error,
        });
      }

      case "reply": {
        const replyResult = await autonomousPipeline.ingestReply({
          pipelineRunId: body.pipelineRunId,
          leadId: String(body.leadId || ""),
          messageText: String(body.messageText || ""),
          senderEmail: body.senderEmail,
          messageId: body.messageId,
          userId: body.userId,
        });

        return NextResponse.json({
          success: true,
          replyResult,
        });
      }

      case "terminal": {
        const outcome = body.outcome === "WON" ? "WON" : "LOST";
        await autonomousPipeline.markTerminalOutcome(
          String(body.pipelineRunId || ""),
          String(body.leadId || ""),
          outcome,
          String(body.reason || `Marked as ${outcome}`),
          body.userId
        );

        return NextResponse.json({
          success: true,
          leadId: body.leadId,
          outcome,
        });
      }

      default:
        return NextResponse.json(
          { success: false, message: `Unknown action: '${action}'. Supported actions: start, approve, reject, send, reply, terminal.` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(message) },
      { status: 500 }
    );
  }
}

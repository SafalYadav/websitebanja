// src/app/api/automation/pipeline/autonomous/route.ts
import { NextResponse } from "next/server";
import { isAuthorized } from "@/lib/automation/auth";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { autonomousPipeline } from "@/lib/intelligence/pipeline/autonomousPipeline";
import { approvalGate } from "@/lib/intelligence/pipeline/approvalGate";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const dynamic = "force-dynamic";

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

    const authorized = await isAuthorized(req);
    if (!authorized) {
      const adminAuth = await verifyAdminAuth(req);
      if (!adminAuth.isAdmin) {
        return NextResponse.json(
          { success: false, message: "Unauthorized: Invalid service secret or administrator credentials." },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(req.url);
    const runId = searchParams.get("runId");
    const action = searchParams.get("action");

    if (action === "pending_approvals") {
      const pending = approvalGate.getPendingApprovals();
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
      const run = autonomousPipeline.getRun(runId);
      if (!run) {
        return NextResponse.json(
          { success: false, message: `Pipeline run '${runId}' not found.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, run });
    }

    const runs = autonomousPipeline.listRuns(20);
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

    const authorized = await isAuthorized(req);
    if (!authorized) {
      const adminAuth = await verifyAdminAuth(req);
      if (!adminAuth.isAdmin) {
        return NextResponse.json(
          { success: false, message: "Unauthorized: Invalid service secret or administrator credentials." },
          { status: 401 }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "start";

    switch (action) {
      case "start": {
        const criteria = body.criteria || {
          niche: body.niche,
          location: body.location,
          limit: body.limit || 5,
        };

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
        const approvedBy = String(body.approvedBy || "human_admin");
        const notes = body.notes;

        const approval = await approvalGate.approveDraft(outreachId, approvedBy, notes);

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
        const rejectedBy = String(body.rejectedBy || "human_admin");
        const reason = String(body.reason || "Rejected by administrator");

        const approval = await approvalGate.rejectDraft(outreachId, rejectedBy, reason);
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

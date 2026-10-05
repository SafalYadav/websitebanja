// src/app/api/admin/intelligence/learning/route.ts
// Phase 27 — Learning Loop: Admin API Route
//
// Authenticated, tenant-isolated API for controlling candidate lessons,
// evaluations, regression checks, governance approvals, promotions, and rollbacks.

import { NextResponse } from "next/server";
import { verifyAdminAuth } from "@/lib/adminAuth";
import { checkMemoryRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/supabaseServer";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { LearningLoopOrchestrator } from "@/lib/intelligence/learningLoop/learningLoopOrchestrator";
import { z } from "zod";
import { authorizeHumanApproval } from "@/lib/intelligence/pipeline/humanApprovalAuthorization";

export const dynamic = "force-dynamic";

const PostActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create_candidate"),
    title: z.string().min(1),
    statement: z.string().min(1),
    domain: z.string().min(1),
    sourceType: z.enum([
      "validation_failure",
      "repair_success",
      "grounded_bi",
      "agent_execution",
      "human_feedback",
      "experiment",
    ]),
    sourceRunId: z.string().optional(),
    tenantId: z.string().nullable().optional(),
    initialConfidence: z.number().min(0).max(1).optional(),
    initialEvidenceDescription: z.string().optional(),
  }),
  z.object({
    action: z.literal("add_evidence"),
    candidateId: z.string().min(1),
    description: z.string().min(1),
    source: z.string().min(1),
    runId: z.string().optional(),
    weight: z.number().optional(),
    isContradictory: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("evaluate"),
    candidateId: z.string().min(1),
  }),
  z.object({
    action: z.literal("benchmark"),
    candidateId: z.string().min(1),
    forceFailure: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("request_approval"),
    candidateId: z.string().min(1),
    requestedBy: z.string().default("learning_loop"),
  }),
  z.object({
    action: z.literal("promote"),
    candidateId: z.string().min(1),
    approvalId: z.string().min(1),
    approvedBy: z.string().min(1),
    tenantId: z.string().nullable().optional(),
  }),
  z.object({
    action: z.literal("rollback"),
    domain: z.string().min(1),
    targetVersion: z.string().optional(),
    rollbackReason: z.string().min(1),
    executedBy: z.string().min(1),
  }),
]);

/**
 * GET /api/admin/intelligence/learning
 */
export async function GET(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_learning_get_${ip}`, 60, 60 * 1000);
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

    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidateId");
    const domain = searchParams.get("domain");
    const status = searchParams.get("status");
    const tenantId = auth.userId;
    const view = searchParams.get("view") || "summary";

    const orchestrator = LearningLoopOrchestrator.getInstance();

    if (candidateId) {
      const candidate = orchestrator.getCandidate(candidateId);
      if (!candidate || candidate.tenantId !== auth.userId) {
        return NextResponse.json(
          { success: false, message: `Candidate lesson '${candidateId}' not found.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, candidate });
    }

    if (view === "candidates") {
      const candidates = orchestrator.listCandidates({
        domain: domain || undefined,
        status: status || undefined,
        tenantId: tenantId ?? undefined,
      });
      return NextResponse.json({ success: true, count: candidates.length, candidates });
    }

    if (view === "history" && domain) {
      const history = orchestrator.getStrategyHistory(domain, auth.userId);
      return NextResponse.json({ success: true, domain, history });
    }

    // Default view: summary
    const summary = orchestrator.getLearningSummary(auth.userId);
    return NextResponse.json({ success: true, summary });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(err?.message || "Internal server error") },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/intelligence/learning
 */
export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const { success: allowed } = checkMemoryRateLimit(`admin_learning_post_${ip}`, 30, 60 * 1000);
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

    const body = await req.json();
    const parsed = PostActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid learning action payload",
          errors: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const orchestrator = LearningLoopOrchestrator.getInstance();
    if ("candidateId" in data) {
      const candidate = orchestrator.getCandidate(data.candidateId);
      if (!candidate || candidate.tenantId !== auth.userId) {
        return NextResponse.json({ success: false, message: "Candidate not found" }, { status: 404 });
      }
    }

    switch (data.action) {
      case "create_candidate": {
        const candidate = orchestrator.ingestGroundedBi({
          domain: data.domain,
          insight: data.title,
          rule: data.statement,
          source: data.sourceType,
          runId: data.sourceRunId || `run_${Date.now()}`,
          tenantId: auth.userId,
        });
        return NextResponse.json({ success: true, candidate }, { status: 201 });
      }

      case "add_evidence": {
        let candidate;
        if (data.isContradictory) {
          candidate = orchestrator.recordContradictoryEvidence(data.candidateId, {
            source: data.source,
            description: data.description,
            runId: data.runId,
            weight: data.weight,
          });
        } else {
          candidate = orchestrator.recordEvidence(data.candidateId, {
            source: data.source,
            description: data.description,
            runId: data.runId,
            weight: data.weight,
          });
        }
        return NextResponse.json({ success: true, candidate });
      }

      case "evaluate": {
        const { candidate, report } = orchestrator.evaluateCandidate(data.candidateId);
        return NextResponse.json({ success: true, candidate, report });
      }

      case "benchmark": {
        const { candidate, benchmarkResult } = orchestrator.runRegressionBenchmark(
          data.candidateId,
          { forceFailure: data.forceFailure }
        );
        return NextResponse.json({ success: true, candidate, benchmarkResult });
      }

      case "request_approval": {
        const { approvalId, candidate } = orchestrator.requestPromotionApproval({
          candidateId: data.candidateId,
          requestedBy: data.requestedBy,
        });
        return NextResponse.json({ success: true, approvalId, candidate });
      }

      case "promote": {
        const result = await orchestrator.promoteWithApproval({
          candidateId: data.candidateId,
          approvalId: data.approvalId,
          approvedBy: auth.userId,
          tenantId: auth.userId,
          authorization: await authorizeHumanApproval(req, auth.userId),
        });
        return NextResponse.json({ success: true, ...result });
      }

      case "rollback": {
        const result = orchestrator.rollbackStrategy({
          domain: data.domain,
          targetVersion: data.targetVersion,
          rollbackReason: data.rollbackReason,
          executedBy: auth.userId,
          tenantId: auth.userId,
          authorization: await authorizeHumanApproval(req, auth.userId),
        });
        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: sanitizeErrorOutput(err?.message || "Internal server error") },
      { status: 400 }
    );
  }
}

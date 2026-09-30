// src/app/api/automation/crm/[leadId]/analyze/route.ts
/**
 * WebsiteBanja Automation API — Analyze Custom Reply for Lead
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Endpoint: POST /api/automation/crm/[leadId]/analyze
 * Analyzes custom reply text against a specific lead's context,
 * producing Reply Intelligence & Next Action recommendation.
 */

import { NextResponse } from "next/server";
import { crmRepository } from "@/lib/crm/crmRepository";
import { analyzeInboundReply } from "@/lib/crm/replyIntelligence";
import { determineNextAction } from "@/lib/crm/nextActionEngine";
import type { AnalyzeReplyResponse } from "@/lib/crm/types";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

interface RouteContext {
  params: Promise<{ leadId: string }>;
}

import { isAuthorized } from "@/lib/automation/auth";


export async function POST(req: Request, context: RouteContext) {
  if (!(await isAuthorized(req))) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization." } },
      { status: 401 }
    );
  }

  try {
    const { leadId } = await context.params;
    const body = await req.json();

    if (!body.messageText || typeof body.messageText !== "string" || body.messageText.trim() === "") {
      return NextResponse.json(
        {
          success: false,
          handoffPhase: "phase13_autonomous_lead_pipeline",
          error: { code: "VALIDATION_FAILED", message: "Parameter 'messageText' is required." },
        },
        { status: 400 }
      );
    }

    const leadState = await crmRepository.getLeadCRMState(leadId, body.userId);
    const businessName = leadState?.businessName || body.leadContext?.businessName;
    const industry = leadState?.industry || body.leadContext?.industry;

    const analysis = await analyzeInboundReply({
      messageText: body.messageText.trim(),
      leadContext: { businessName, industry },
    });

    const nextAction = determineNextAction({
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      confidence: analysis.confidence,
      requiresHumanReview: analysis.requiresHumanReview,
      businessName,
    });

    const response: AnalyzeReplyResponse = {
      success: true,
      analysis,
      nextAction,
      handoffPhase: "phase13_autonomous_lead_pipeline",
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    const safeError = sanitizeErrorOutput(err);
    return NextResponse.json(
      {
        success: false,
        handoffPhase: "phase13_autonomous_lead_pipeline",
        error: {
          code: "ANALYZE_REPLY_FAILED",
          message: "Failed to analyze reply text.",
          details: safeError,
        },
      },
      { status: 500 }
    );
  }
}

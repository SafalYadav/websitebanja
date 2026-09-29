// src/lib/crm/nextActionEngine.ts
/**
 * WebsiteBanja CRM Next Action Engine
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Implements deterministic next-action recommendations based on reply intent,
 * sentiment, urgency, and confidence.
 *
 * ABSOLUTE SAFETY LOCK:
 *   - automatedAction is STRICTLY null in Phase 12.
 *   - No automated outbound emails, SMS, or WhatsApp messages are triggered.
 *   - All actions are recommended for human review/operator execution.
 */

import type {
  ReplyIntent,
  ReplySentiment,
  ReplyUrgency,
  NextAction,
  RecommendedActionType,
} from "./types";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export interface NextActionInput {
  intent: ReplyIntent;
  sentiment: ReplySentiment;
  urgency: ReplyUrgency;
  confidence: number;
  requiresHumanReview: boolean;
  businessName?: string;
}

export function determineNextAction(input: NextActionInput): NextAction {
  const { intent, sentiment, urgency, confidence, requiresHumanReview, businessName } = input;
  const name = businessName || "the client";

  // Low confidence or explicit human review flag overrides standard deterministic flow
  if (requiresHumanReview || confidence < 0.65) {
    emitAgentEvent({
      event: "crm.action.recommended",
      agent: "mitra",
      status: "success",
      metadata: { intent, recommendedAction: "HUMAN_REVIEW", confidence },
    });

    return {
      recommendedAction: "HUMAN_REVIEW",
      automatedAction: null,
      reason: `Low classification confidence (${(confidence * 100).toFixed(0)}%) or ambiguous phrasing requires operator inspection.`,
      priority: urgency === "HIGH" ? "HIGH" : "MEDIUM",
      followUpDueDays: 1,
      suggestedFollowUpDate: calculateDateOffset(1),
      notes: "Flagged for human operator review in CRM console.",
    };
  }

  // 1. Explicit Opt-out
  if (intent === "DO_NOT_CONTACT") {
    emitAgentEvent({
      event: "crm.action.recommended",
      agent: "mitra",
      status: "success",
      metadata: { intent, recommendedAction: "DO_NOT_CONTACT" },
    });

    return {
      recommendedAction: "DO_NOT_CONTACT",
      automatedAction: null,
      reason: "Client explicitly requested to opt-out and receive no further outreach.",
      priority: "URGENT",
      notes: "Permanently suppress from all future outreach campaigns.",
    };
  }

  // 2. Clear Disqualification / Polite Rejection
  if (intent === "NOT_INTERESTED" || intent === "ALREADY_HAS_WEBSITE") {
    const reasonText =
      intent === "ALREADY_HAS_WEBSITE"
        ? `${name} confirmed they already have an active website or development partner.`
        : `${name} politely declined interest in a new website concept.`;

    emitAgentEvent({
      event: "crm.action.recommended",
      agent: "mitra",
      status: "success",
      metadata: { intent, recommendedAction: "CLOSE_LEAD" },
    });

    return {
      recommendedAction: "CLOSE_LEAD",
      automatedAction: null,
      reason: reasonText,
      priority: "LOW",
      notes: "Mark lead as closed/lost and archive conversation.",
    };
  }

  // 3. Needs Time / Busy / Re-evaluate Later
  if (intent === "NEEDS_TIME") {
    emitAgentEvent({
      event: "crm.action.recommended",
      agent: "mitra",
      status: "success",
      metadata: { intent, recommendedAction: "FOLLOW_UP_LATER" },
    });

    return {
      recommendedAction: "FOLLOW_UP_LATER",
      automatedAction: null,
      reason: `${name} requested a later follow-up (traveling, evaluating next quarter, or currently busy).`,
      priority: "MEDIUM",
      followUpDueDays: 7,
      suggestedFollowUpDate: calculateDateOffset(7),
      notes: "Set automated calendar reminder to follow up in 1 week.",
    };
  }

  // 4. Meeting / Call Request
  if (intent === "ASKING_FOR_CALL") {
    emitAgentEvent({
      event: "crm.action.recommended",
      agent: "mitra",
      status: "success",
      metadata: { intent, recommendedAction: "SCHEDULE_CALL" },
    });

    return {
      recommendedAction: "SCHEDULE_CALL",
      automatedAction: null,
      reason: `${name} proposed a phone call, Google Meet, or consultation to discuss the website.`,
      priority: urgency === "HIGH" ? "URGENT" : "HIGH",
      followUpDueDays: 1,
      suggestedFollowUpDate: calculateDateOffset(1),
      notes: "Coordinate availability and send meeting booking link or confirm call window.",
    };
  }

  // 5. Specific Demo Request
  if (intent === "ASKING_FOR_DEMO") {
    emitAgentEvent({
      event: "crm.action.recommended",
      agent: "mitra",
      status: "success",
      metadata: { intent, recommendedAction: "SEND_DEMO_LINK" },
    });

    return {
      recommendedAction: "SEND_DEMO_LINK",
      automatedAction: null,
      reason: `${name} requested relevant portfolio samples or specific interactive capability demos.`,
      priority: "HIGH",
      followUpDueDays: 1,
      suggestedFollowUpDate: calculateDateOffset(1),
      notes: "Prepare curated portfolio link matching client's exact vertical.",
    };
  }

  // 6. Pricing Inquiry or High Interest
  if (intent === "ASKING_PRICE" || intent === "INTERESTED" || intent === "ASKING_FOR_DETAILS") {
    const isPricing = intent === "ASKING_PRICE";
    emitAgentEvent({
      event: "crm.action.recommended",
      agent: "mitra",
      status: "success",
      metadata: { intent, recommendedAction: "HUMAN_REPLY_REQUIRED" },
    });

    return {
      recommendedAction: "HUMAN_REPLY_REQUIRED",
      automatedAction: null,
      reason: isPricing
        ? `${name} requested pricing and packaging details for the preview website.`
        : `${name} showed active interest in publishing or customizing the concept.`,
      priority: "HIGH",
      followUpDueDays: 1,
      suggestedFollowUpDate: calculateDateOffset(1),
      notes: "Draft bespoke response addressing specific questions with transparent tiered options.",
    };
  }

  // 7. General Positive / Ambiguous / Wrong Contact
  if (intent === "POSITIVE_GENERAL") {
    return {
      recommendedAction: "HUMAN_REPLY_REQUIRED",
      automatedAction: null,
      reason: `${name} sent polite compliments without immediate commercial commitment.`,
      priority: "MEDIUM",
      followUpDueDays: 2,
      suggestedFollowUpDate: calculateDateOffset(2),
      notes: "Acknowledge praise with warmth and offer to answer any questions when ready.",
    };
  }

  // 8. Default fallback
  return {
    recommendedAction: "HUMAN_REVIEW",
    automatedAction: null,
    reason: `Classification mapped to '${intent}'. Operator inspection recommended.`,
    priority: "MEDIUM",
    followUpDueDays: 2,
    suggestedFollowUpDate: calculateDateOffset(2),
  };
}

function calculateDateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

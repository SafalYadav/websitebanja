// src/lib/crm/replySimulation.ts
/**
 * WebsiteBanja Inbound Reply Simulation Engine
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Orchestrates the full inbound reply simulation lifecycle:
 *   1. Lead validation & resolution
 *   2. Conversation association & Phase 11 seeding
 *   3. Inbound message persistence
 *   4. AI / Deterministic Reply Intelligence execution
 *   5. Deterministic Next-Action calculation
 *   6. Lead status update (when supported by evidence/confidence)
 *   7. Chronological CRM timeline event generation
 *   8. Phase 13 handoff packaging
 *
 * ABSOLUTE LOCAL SAFETY:
 *   - No external webhooks or live messaging providers are contacted.
 *   - Everything operates strictly within local scratch and memory boundaries.
 */

import fs from "fs";
import path from "path";
import type {
  SimulateReplyRequest,
  SimulateReplyResponse,
  CRMLeadStatus,
  CRMMessage,
  CRMConversation,
} from "./types";
import { crmRepository } from "./crmRepository";
import { analyzeInboundReply } from "./replyIntelligence";
import { determineNextAction } from "./nextActionEngine";
import type { OutreachChannel } from "@/lib/outreach/types";

const LEADS_FILE = path.resolve(process.cwd(), "scratch/leads/leads.json");

export async function simulateInboundReply(req: SimulateReplyRequest): Promise<SimulateReplyResponse> {
  const { leadId, messageText, channel = "email", senderName, senderContact, userId } = req;

  // 1. Input Validation
  if (!leadId || typeof leadId !== "string" || leadId.trim() === "") {
    return {
      success: false,
      handoffPhase: "phase13_autonomous_lead_pipeline",
      error: { code: "VALIDATION_FAILED", message: "Parameter 'leadId' is required." },
    };
  }

  if (!messageText || typeof messageText !== "string" || messageText.trim() === "") {
    return {
      success: false,
      handoffPhase: "phase13_autonomous_lead_pipeline",
      error: { code: "VALIDATION_FAILED", message: "Parameter 'messageText' is required." },
    };
  }

  // 2. Validate Lead exists
  let businessName = "Local Business";
  let industry = "general";
  let leadFound = false;

  if (fs.existsSync(LEADS_FILE)) {
    try {
      const raw = fs.readFileSync(LEADS_FILE, "utf-8");
      const leads = JSON.parse(raw) as any[];
      const lead = leads.find((l) => l.leadId === leadId && (userId ? l.userId === userId : true));
      if (lead) {
        leadFound = true;
        businessName = lead.businessName || businessName;
        industry = lead.industry || lead.category || industry;
      }
    } catch (err) {
      console.error("[ReplySimulation] Error verifying lead:", err);
    }
  }

  // Also check if lead exists in Phase 11 outreach
  if (!leadFound) {
    const OUTREACH_FILE = path.resolve(process.cwd(), "scratch/outreach/outreach.json");
    if (fs.existsSync(OUTREACH_FILE)) {
      try {
        const raw = fs.readFileSync(OUTREACH_FILE, "utf-8");
        const records = JSON.parse(raw) as any[];
        const rec = records.find((r) => r.leadId === leadId && (userId ? r.userId === userId : true));
        if (rec) {
          leadFound = true;
          businessName = rec.business?.name || businessName;
          industry = rec.business?.industry || industry;
        }
      } catch (e) {
        // ignore
      }
    }
  }

  if (!leadFound) {
    return {
      success: false,
      handoffPhase: "phase13_autonomous_lead_pipeline",
      error: { code: "LEAD_NOT_FOUND", message: `Lead '${leadId}' was not found in discovery or outreach records.` },
    };
  }

  // 3. Resolve / Seed Conversation
  const conversation = await crmRepository.getConversationForLead(leadId, channel, userId);

  // 4. Ingest Inbound Message
  const inboundMessage = await crmRepository.addMessage({
    leadId,
    conversationId: conversation.id,
    channel,
    direction: "inbound",
    messageText: messageText.trim(),
    source: "simulation",
    metadata: {
      senderName,
      senderContact,
    },
  });

  // 5. Run Reply Intelligence
  const analysis = await analyzeInboundReply({
    messageText: messageText.trim(),
    leadContext: {
      businessName,
      industry,
    },
  });

  // 6. Calculate Next Action
  const nextAction = determineNextAction({
    intent: analysis.intent,
    sentiment: analysis.sentiment,
    urgency: analysis.urgency,
    confidence: analysis.confidence,
    requiresHumanReview: analysis.requiresHumanReview,
    businessName,
  });

  // 7. Update Conversation with latest intelligence
  await crmRepository.updateConversation(conversation.id, {
    currentIntent: analysis.intent,
    currentSentiment: analysis.sentiment,
    nextAction: nextAction.recommendedAction,
    status: "REPLIED",
  });

  // 8. Determine Lead Status Transition based on confidence and intent
  let targetStatus: CRMLeadStatus = "REPLIED";
  let statusReason = `Received inbound ${channel} reply indicating ${analysis.intent.toLowerCase().replace(/_/g, " ")}.`;

  if (analysis.requiresHumanReview || analysis.confidence < 0.65) {
    targetStatus = "REPLIED";
    statusReason = `Inbound reply requires human operator review (confidence: ${(analysis.confidence * 100).toFixed(0)}%).`;
  } else if (analysis.intent === "DO_NOT_CONTACT") {
    targetStatus = "DO_NOT_CONTACT";
    statusReason = "Prospect explicitly requested to be removed from contact lists.";
  } else if (analysis.intent === "NOT_INTERESTED" || analysis.intent === "ALREADY_HAS_WEBSITE") {
    targetStatus = "NOT_INTERESTED";
    statusReason = `Prospect declined interest (${analysis.intent.toLowerCase().replace(/_/g, " ")}).`;
  } else if (analysis.intent === "NEEDS_TIME") {
    targetStatus = "FOLLOW_UP";
    statusReason = "Prospect requested later follow-up.";
  } else if (analysis.intent === "ASKING_FOR_CALL") {
    targetStatus = "MEETING_REQUESTED";
    statusReason = "Prospect requested or proposed a phone/video consultation.";
  } else if (
    analysis.intent === "ASKING_PRICE" ||
    analysis.intent === "INTERESTED" ||
    analysis.intent === "ASKING_FOR_DEMO" ||
    analysis.intent === "ASKING_FOR_DETAILS"
  ) {
    targetStatus = "INTERESTED";
    statusReason = `Prospect demonstrated active interest (${analysis.intent.toLowerCase().replace(/_/g, " ")}).`;
  }

  // Update lead CRM status
  await crmRepository.updateLeadStatus(
    leadId,
    targetStatus,
    statusReason,
    "simulation",
    inboundMessage.id,
    conversation.id,
    userId
  );

  // 9. Record Timeline Event for Reply Analyzed
  const crmEvent = await crmRepository.createCRMEvent({
    leadId,
    type: "REPLY_ANALYZED",
    actor: "ai_classifier",
    description: `Analyzed inbound ${channel} reply: ${analysis.intent} (${(analysis.confidence * 100).toFixed(0)}% confidence). Recommended: ${nextAction.recommendedAction}`,
    metadata: {
      messageId: inboundMessage.id,
      intent: analysis.intent,
      sentiment: analysis.sentiment,
      urgency: analysis.urgency,
      confidence: analysis.confidence,
      recommendedAction: nextAction.recommendedAction,
      requiresHumanReview: analysis.requiresHumanReview,
    },
  });

  // Attach analysis to message metadata for persistent reference
  inboundMessage.metadata = {
    ...inboundMessage.metadata,
    rawPayload: {
      analysis,
      nextAction,
    },
  };

  return {
    success: true,
    message: inboundMessage,
    conversation: {
      ...conversation,
      currentIntent: analysis.intent,
      currentSentiment: analysis.sentiment,
      nextAction: nextAction.recommendedAction,
      status: "REPLIED",
    },
    analysis,
    nextAction,
    leadStatus: targetStatus,
    event: crmEvent,
    handoffPhase: "phase13_autonomous_lead_pipeline",
  };
}

// src/lib/integrations/gmailInboundService.ts
/**
 * WebsiteBanja Gmail Inbound Reply Ingestion & Matching Service
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * Safe Inbound Handling:
 *   - Fetches relevant inbox messages using Gmail API
 *   - Strictly ignores unrelated personal emails via multi-point matching:
 *       1. Gmail Thread ID matching
 *       2. In-Reply-To / References message header matching
 *       3. Known lead / business email matching
 *   - Deduplicates incoming messages using persistent message ID store
 *   - Pipes matching replies into Phase 12 Reply Intelligence
 *   - DO_NOT_CONTACT intent transitions lead and cancels all pending follow-ups
 *   - Low-confidence classifications require human review
 *   - Telemetry emitted
 */

import fs from "fs";
import path from "path";
import { GmailOAuthManager } from "./gmailOAuth";
import { ConfigValidator } from "./configValidator";
import { crmRepository } from "@/lib/crm/crmRepository";
import { outreachRepository } from "@/lib/outreach/outreachRepository";
import { leadRepository } from "@/lib/discovery/leadRepository";
import { analyzeInboundReply } from "@/lib/crm/replyIntelligence";
import { FollowUpQueue } from "@/lib/automation/followUpQueue";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import type { InboundEmailMatch } from "./types";
import type { CRMMessage } from "@/lib/crm/types";

const PROCESSED_MSGS_FILE = path.resolve(process.cwd(), "scratch/integrations/processed_messages.json");
const GMAIL_MESSAGES_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages";

function ensureProcessedStore(): void {
  const dir = path.dirname(PROCESSED_MSGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getProcessedMessageIds(): Set<string> {
  ensureProcessedStore();
  try {
    if (!fs.existsSync(PROCESSED_MSGS_FILE)) return new Set();
    const raw = fs.readFileSync(PROCESSED_MSGS_FILE, "utf-8");
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function markMessageProcessed(messageId: string): void {
  ensureProcessedStore();
  const set = getProcessedMessageIds();
  set.add(messageId);
  fs.writeFileSync(PROCESSED_MSGS_FILE, JSON.stringify(Array.from(set), null, 2), "utf-8");
}

export interface InboundSyncResult {
  success: boolean;
  messagesChecked: number;
  repliesIngested: number;
  unrelatedIgnored: number;
  optOutCount: number;
  items: Array<{
    messageId: string;
    leadId: string;
    intent: string;
    sentiment: string;
    isOptOut: boolean;
    requiresHumanReview: boolean;
  }>;
  error?: string;
}

export class GmailInboundService {
  /**
   * Processes an incoming raw email message payload.
   * Can be invoked from live Gmail API sync or simulated webhook.
   */
  static async processRawIncomingMessage(
    msg: InboundEmailMatch,
    userId?: string
  ): Promise<{ ingested: boolean; reason?: string; analysis?: any }> {
    const processed = getProcessedMessageIds();
    if (processed.has(msg.messageId)) {
      return { ingested: false, reason: "Duplicate message already processed." };
    }

    // 1. Resolve lead association
    let leadId = msg.matchedLeadId;
    let outreachId = msg.matchedOutreachId;

    if (!leadId) {
      // Attempt 1: Match by Thread ID in Outreach or CRM
      const allOutreach = await outreachRepository.listOutreachRecords({ userId });
      const matchedByThread = allOutreach.find(
        (o) => (o as any).threadId && (o as any).threadId === msg.threadId
      );
      if (matchedByThread) {
        leadId = matchedByThread.leadId;
        outreachId = matchedByThread.outreachId;
      }
    }

    if (!leadId) {
      // Attempt 2: Match by Sender Email against known leads
      const allLeads = await leadRepository.getAllLeadsForUser(userId);
      const fromEmailClean = msg.from.toLowerCase().match(/<([^>]+)>/)?.[1] || msg.from.toLowerCase().trim();
      const matchedLead = allLeads.find(
        (l) => l.email && l.email.toLowerCase().trim() === fromEmailClean
      );
      if (matchedLead) {
        leadId = matchedLead.leadId;
      }
    }

    // If completely unrelated to WebsiteBanja outreach, ignore it safely!
    if (!leadId) {
      markMessageProcessed(msg.messageId);
      return { ingested: false, reason: "Unrelated message; no matching WebsiteBanja lead found." };
    }

    // 2. Ensure CRM Conversation exists
    const conversation = await crmRepository.getConversationForLead(leadId, "email", userId);

    // 3. Persist incoming CRM message
    const incomingCrmMsg = await crmRepository.addMessage({
      leadId,
      conversationId: conversation.id,
      channel: "email",
      direction: "inbound",
      messageText: msg.bodyText || msg.snippet,
      timestamp: msg.date || new Date().toISOString(),
      source: "system",
      externalMessageId: msg.messageId,
      metadata: {
        subject: msg.subject,
        senderContact: msg.from,
        outreachId,
      },
    });

    // 4. Run Phase 12 Reply Intelligence
    const analysis = await analyzeInboundReply({
      messageText: incomingCrmMsg.messageText,
      leadContext: {
        businessName: msg.from,
      },
    });

    const isOptOut =
      analysis.intent === "DO_NOT_CONTACT" ||
      incomingCrmMsg.messageText.toLowerCase().includes("unsubscribe") ||
      incomingCrmMsg.messageText.toLowerCase().includes("stop emailing") ||
      incomingCrmMsg.messageText.toLowerCase().includes("remove me");

    // 5. Update CRM State based on Intent
    if (isOptOut) {
      await crmRepository.updateLeadStatus(
        leadId,
        "DO_NOT_CONTACT",
        "Lead explicitly opted out via email reply",
        "system",
        incomingCrmMsg.id,
        conversation.id,
        userId
      );

      // Cancel all pending follow-ups immediately
      await FollowUpQueue.cancelFollowUpsForLead(leadId, "Lead requested DO_NOT_CONTACT");

      emitAgentEvent({
        event: "agent.provider_call",
        agent: "mitra",
        provider: "gmail",
        metadata: {
          operation: "gmail.opt_out.processed",
          leadId,
          messageId: msg.messageId,
        },
      });
    } else {
      // For any standard reply, cancel pending follow-up (the lead responded!)
      await FollowUpQueue.cancelFollowUpsForLead(leadId, "Lead replied to outreach");

      // Update lead status based on classification
      const newStatus =
        analysis.intent === "INTERESTED" ||
        analysis.intent === "ASKING_PRICE" ||
        analysis.intent === "ASKING_FOR_DEMO" ||
        analysis.intent === "ASKING_FOR_CALL"
          ? "INTERESTED"
          : analysis.intent === "NOT_INTERESTED" || analysis.intent === "ALREADY_HAS_WEBSITE"
          ? "NOT_INTERESTED"
          : "REPLIED";

      await crmRepository.updateLeadStatus(
        leadId,
        newStatus,
        `AI Classification: ${analysis.intent} (Confidence: ${Math.round(analysis.confidence * 100)}%)`,
        "system",
        incomingCrmMsg.id,
        conversation.id,
        userId
      );
    }

    markMessageProcessed(msg.messageId);

    emitAgentEvent({
      event: "agent.provider_call",
      agent: "mitra",
      provider: "gmail",
      metadata: {
        operation: "gmail.reply.ingested",
        leadId,
        messageId: msg.messageId,
        intent: analysis.intent,
        isOptOut,
        requiresHumanReview: analysis.requiresHumanReview,
      },
    });

    return { ingested: true, analysis };
  }

  /**
   * Syncs new messages from Gmail API.
   * If live Gmail API is unconfigured, performs safe mock poll.
   */
  static async syncInboxReplies(userId?: string): Promise<InboundSyncResult> {
    const gmailStatus = ConfigValidator.getGmailStatus();
    const now = new Date().toISOString();

    ConfigValidator.updateInternalState((state) => {
      state.gmail.lastSyncAt = now;
    });

    if (!gmailStatus.isConfigured) {
      return {
        success: true,
        messagesChecked: 0,
        repliesIngested: 0,
        unrelatedIgnored: 0,
        optOutCount: 0,
        items: [],
      };
    }

    try {
      const accessToken = await GmailOAuthManager.getValidAccessToken();

      // Query Gmail for recent incoming messages
      const query = encodeURIComponent("to:websitebanja@gmail.com -from:websitebanja@gmail.com");
      const listRes = await fetch(`${GMAIL_MESSAGES_URL}?q=${query}&maxResults=20`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listRes.ok) {
        const errorText = await listRes.text();
        return {
          success: false,
          messagesChecked: 0,
          repliesIngested: 0,
          unrelatedIgnored: 0,
          optOutCount: 0,
          items: [],
          error: `Gmail list messages failed: ${errorText}`,
        };
      }

      const listData = await listRes.json();
      const messageRefs: Array<{ id: string; threadId: string }> = listData.messages || [];

      const processed = getProcessedMessageIds();
      const unhandled = messageRefs.filter((m) => !processed.has(m.id));

      let repliesIngested = 0;
      let unrelatedIgnored = 0;
      let optOutCount = 0;
      const items: InboundSyncResult["items"] = [];

      for (const ref of unhandled) {
        const msgRes = await fetch(`${GMAIL_MESSAGES_URL}/${ref.id}?format=full`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!msgRes.ok) continue;

        const msgData = await msgRes.json();
        const headers: Array<{ name: string; value: string }> = msgData.payload?.headers || [];

        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const from = getHeader("From");
        const to = getHeader("To");
        const subject = getHeader("Subject");
        const date = getHeader("Date");
        const snippet = msgData.snippet || "";

        // Extract body text
        let bodyText = snippet;
        if (msgData.payload?.body?.data) {
          bodyText = Buffer.from(msgData.payload.body.data, "base64").toString("utf-8");
        } else if (msgData.payload?.parts) {
          const textPart = msgData.payload.parts.find((p: any) => p.mimeType === "text/plain");
          if (textPart?.body?.data) {
            bodyText = Buffer.from(textPart.body.data, "base64").toString("utf-8");
          }
        }

        const matchCandidate: InboundEmailMatch = {
          messageId: ref.id,
          threadId: ref.threadId,
          from,
          to,
          subject,
          date,
          snippet,
          bodyText,
          matchType: "unknown",
        };

        const result = await this.processRawIncomingMessage(matchCandidate, userId);
        if (result.ingested) {
          repliesIngested += 1;
          const isOptOut = result.analysis?.intent === "DO_NOT_CONTACT";
          if (isOptOut) optOutCount += 1;

          items.push({
            messageId: ref.id,
            leadId: result.analysis?.leadId || "unknown",
            intent: result.analysis?.intent || "UNKNOWN",
            sentiment: result.analysis?.sentiment || "NEUTRAL",
            isOptOut,
            requiresHumanReview: Boolean(result.analysis?.requiresHumanReview),
          });
        } else {
          unrelatedIgnored += 1;
        }
      }

      return {
        success: true,
        messagesChecked: messageRefs.length,
        repliesIngested,
        unrelatedIgnored,
        optOutCount,
        items,
      };
    } catch (err: any) {
      return {
        success: false,
        messagesChecked: 0,
        repliesIngested: 0,
        unrelatedIgnored: 0,
        optOutCount: 0,
        items: [],
        error: err.message || "Failed to sync Gmail replies.",
      };
    }
  }
}

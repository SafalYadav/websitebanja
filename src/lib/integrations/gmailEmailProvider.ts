// src/lib/integrations/gmailEmailProvider.ts
/**
 * WebsiteBanja Gmail Email Provider & Pre-Flight Sending Guard
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * Enforces strict pre-flight gates before dispatching ANY email:
 *   1. Lead exists and is QUALIFIED
 *   2. Lead is not DO_NOT_CONTACT
 *   3. Recipient email is syntactically valid
 *   4. Outreach draft exists & passed validation
 *   5. Human approval exists (record.status === 'approved')
 *   6. Rate limits (hourly & daily) respected
 *   7. Gmail OAuth is connected & authorized
 *   8. AUTO_SEND_ENABLED is explicitly honored
 *   9. Idempotency enforced (never duplicate send)
 *
 * Identity: websitebanja@gmail.com
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { GmailOAuthManager } from "./gmailOAuth";
import { ConfigValidator } from "./configValidator";
import { outreachRepository } from "@/lib/outreach/outreachRepository";
import { leadRepository } from "@/lib/discovery/leadRepository";
import { crmRepository } from "@/lib/crm/crmRepository";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { getAuthorizedAdminUserIds } from "@/lib/adminAuth";
import type { OutreachRecord } from "@/lib/outreach/types";
import type { RateLimitState } from "./types";

export interface HumanAdminContext {
  readonly adminUserId: string;
  readonly tenantId: string;
  readonly isAdmin: true;
  readonly isHuman: true;
  readonly email?: string;
}

export interface ReconcileOutreachDispatchOptions {
  adminContext?: HumanAdminContext;
  reason: string;
  verifiedExternalMessageId?: string;
  serverVerificationEvidence?: Record<string, unknown>;
  certifiedNotDispatched?: boolean;
  userId?: string;
  verifiedByAdminId?: string;
}

const GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";
const RATE_LIMIT_FILE = path.resolve(process.cwd(), "scratch/integrations/rate_limits.json");

// Conservative default rate limits
const DEFAULT_MAX_HOURLY = 20;
const DEFAULT_MAX_DAILY = 100;

let memoryRateLimit: {
  hourlyCount: number;
  dailyCount: number;
  lastResetHour: string;
  lastResetDay: string;
} | null = null;

function ensureRateLimitStorage(): void {
  try {
    const dir = path.dirname(RATE_LIMIT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {}
}

export function getRateLimitState(): RateLimitState {
  ensureRateLimitStorage();
  const maxHourly = Number(process.env.GMAIL_MAX_SENDS_PER_HOUR) || DEFAULT_MAX_HOURLY;
  const maxDaily = Number(process.env.GMAIL_MAX_SENDS_PER_DAY) || DEFAULT_MAX_DAILY;

  const now = new Date();
  const currentHour = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}:${now.getUTCHours()}`;
  const currentDay = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;

  if (!memoryRateLimit || memoryRateLimit.lastResetDay !== currentDay) {
    memoryRateLimit = {
      hourlyCount: 0,
      dailyCount: 0,
      lastResetHour: currentHour,
      lastResetDay: currentDay,
    };
  } else if (memoryRateLimit.lastResetHour !== currentHour) {
    memoryRateLimit.hourlyCount = 0;
    memoryRateLimit.lastResetHour = currentHour;
  }

  try {
    if (fs.existsSync(RATE_LIMIT_FILE)) {
      const raw = fs.readFileSync(RATE_LIMIT_FILE, "utf-8");
      const data = JSON.parse(raw);

      let hourlyCount = data.hourlyCount || 0;
      let dailyCount = data.dailyCount || 0;

      if (data.lastResetHour !== currentHour) {
        hourlyCount = 0;
      }
      if (data.lastResetDay !== currentDay) {
        dailyCount = 0;
      }

      memoryRateLimit.hourlyCount = Math.max(memoryRateLimit.hourlyCount, hourlyCount);
      memoryRateLimit.dailyCount = Math.max(memoryRateLimit.dailyCount, dailyCount);
    }
  } catch {}

  return {
    hourlyCount: memoryRateLimit.hourlyCount,
    dailyCount: memoryRateLimit.dailyCount,
    lastResetHour: currentHour,
    lastResetDay: currentDay,
    hourlyLimit: maxHourly,
    dailyLimit: maxDaily,
  };
}

function incrementRateLimitCount(): void {
  const state = getRateLimitState();
  state.hourlyCount += 1;
  state.dailyCount += 1;
  if (memoryRateLimit) {
    memoryRateLimit.hourlyCount = state.hourlyCount;
    memoryRateLimit.dailyCount = state.dailyCount;
  }
  try {
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch {}
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  isSimulated?: boolean;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

async function recordOutboundInCRM(
  outreach: OutreachRecord,
  userId?: string,
  externalMessageId?: string
): Promise<void> {
  const conv = await crmRepository.createConversation({
    leadId: outreach.leadId,
    channel: "email",
    userId,
  });

  await crmRepository.addMessage({
    leadId: outreach.leadId,
    conversationId: conv.id,
    channel: "email",
    direction: "outbound",
    messageText: outreach.message,
    source: "system",
    externalMessageId,
    metadata: {
      outreachId: outreach.outreachId,
      subject: outreach.subject,
      previewUrl: outreach.previewUrl,
    },
  });

  await crmRepository.updateLeadStatus(
    outreach.leadId,
    "OUTREACH_SENT",
    "Outreach email dispatched",
    "system",
    undefined,
    conv.id,
    userId
  );
}

export class GmailEmailProvider {
  /**
   * Pre-flight verification check.
   */
  static async verifyPreFlight(
    outreachId: string,
    userId?: string
  ): Promise<{ canSend: boolean; reason?: string; outreach?: OutreachRecord; lead?: any }> {
    const outreach = await outreachRepository.findOutreachById(outreachId, userId);
    if (!outreach) {
      return { canSend: false, reason: `Outreach record '${outreachId}' not found.` };
    }

    // 1. Channel check
    if (outreach.channel !== "email") {
      return { canSend: false, reason: `Outreach channel is '${outreach.channel}', expected 'email'.` };
    }

    // 2. Reconciliation & In-flight check (must block immediately before querying external dependencies)
    if (outreach.deliveryOutcome === "reconciliation_required") {
      return { canSend: false, reason: `Outreach email has uncertain delivery outcome and requires manual reconciliation before retry.` };
    }
    if (outreach.status === "queued") {
      return { canSend: false, reason: `Outreach email is currently queued or in-flight; concurrent or duplicate send is blocked.` };
    }
    if (outreach.status === "sent" || outreach.sentAt) {
      return { canSend: false, reason: `Outreach email has already been sent for lead '${outreach.leadId}'.` };
    }

    // 3. Lead exists
    const lead = await leadRepository.findLeadById(outreach.leadId, userId);
    if (!lead) {
      return { canSend: false, reason: `Associated lead '${outreach.leadId}' not found.` };
    }

    // 4. Lead is not DO_NOT_CONTACT
    const crmState = await crmRepository.getLeadCRMState(outreach.leadId, userId);
    if (crmState?.status === "DO_NOT_CONTACT" || lead.qualificationStatus === "DISQUALIFIED") {
      return { canSend: false, reason: "Lead is marked as DO_NOT_CONTACT or DISQUALIFIED." };
    }

    // 5. Valid recipient email
    const recipient = outreach.business.email;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipient || !emailRegex.test(recipient)) {
      return { canSend: false, reason: `Invalid or missing recipient email: '${recipient}'.` };
    }
    if (/[\r\n]/.test(recipient) || /[\r\n]/.test(outreach.subject || "")) {
      return { canSend: false, reason: "Email headers contain invalid line breaks." };
    }
    if (outreach.status !== "approved") {
      return { canSend: false, reason: `Outreach status is '${outreach.status}'. Only 'approved' drafts may be sent.` };
    }

    // 6. Draft passed factual validation
    if (!outreach.validation?.isValid) {
      return { canSend: false, reason: `Outreach draft failed factual validation checks.` };
    }

    // 7. Rate limit
    const limits = getRateLimitState();
    if (limits.hourlyCount >= limits.hourlyLimit) {
      return { canSend: false, reason: `Hourly send limit reached (${limits.hourlyCount}/${limits.hourlyLimit}).` };
    }
    if (limits.dailyCount >= limits.dailyLimit) {
      return { canSend: false, reason: `Daily send limit reached (${limits.dailyCount}/${limits.dailyLimit}).` };
    }

    return { canSend: true, outreach, lead };
  }

  /**
   * Dispatches an approved outreach draft.
   */
  static async sendOutreachEmail(
    outreachId: string,
    options: { forceSend?: boolean; userId?: string } = {}
  ): Promise<SendEmailResult> {
    const preFlight = await this.verifyPreFlight(outreachId, options.userId);
    if (!preFlight.canSend || !preFlight.outreach) {
      const isDuplicate = preFlight.reason?.includes("already been sent");
      emitAgentEvent({
        event: "agent.provider_call",
        agent: "mitra",
        provider: "gmail",
        metadata: {
          operation: "gmail.send.blocked",
          outreachId,
          reason: preFlight.reason,
        },
      });
      return {
        success: false,
        error: {
          code: isDuplicate ? "DUPLICATE_SEND_PREVENTED" : "PREFLIGHT_CHECK_FAILED",
          message: preFlight.reason || "Pre-flight failed.",
        },
      };
    }

    const outreach = preFlight.outreach;
    const recipient = outreach.business.email;

    // Idempotency check: prevent duplicate send
    if (outreach.status === "sent" || outreach.sentAt) {
      return {
        success: false,
        error: {
          code: "DUPLICATE_SEND_PREVENTED",
          message: `Outreach email has already been sent for lead '${outreach.leadId}'.`,
        },
      };
    }

    // Check if live sending is enabled or dry-run
    const gmailStatus = ConfigValidator.getGmailStatus();
    const isDryRun =
      process.env.COMMUNICATION_DRY_RUN === "true" ||
      process.env.AUTO_SEND_ENABLED !== "true" && !options.forceSend ||
      !gmailStatus.isConfigured;

    // Claim before any external dispatch. CAS verifies the exact human-reviewed
    // payload and permits only one worker to move approved -> queued.
    // An uncertain provider outcome remains queued: never blindly resend it.
    try {
      outreach.status = "queued";
      await outreachRepository.saveOutreachRecord(outreach);
    } catch {
      return { success: false, error: { code: "DISPATCH_CLAIM_DENIED", message: "Approval changed or another worker claimed this dispatch. Reload the original outreach." } };
    }

    if (isDryRun) {
      // Execute safe local mock dispatch
      const simulatedMsgId = `mock_gmail_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
      const now = new Date().toISOString();

      outreach.status = "simulated_sent";
      outreach.externalMessageId = simulatedMsgId;
      outreach.simulatedAt = now;
      outreach.updatedAt = now;
      await outreachRepository.saveOutreachRecord(outreach);

      // A simulation is not an outbound delivery and must not advance CRM
      // delivery/follow-up state or consume the live provider rate counter.

      emitAgentEvent({
        event: "agent.provider_call",
        agent: "mitra",
        provider: "gmail",
        metadata: {
          operation: "gmail.send.simulated",
          outreachId,
          recipient,
          simulatedMsgId,
        },
      });

      return {
        success: true,
        messageId: simulatedMsgId,
        isSimulated: true,
      };
    }

    // Live Gmail API sending
    try {
      const accessToken = await GmailOAuthManager.getValidAccessToken();

      // Pre-flight claim: transition to queued to prevent concurrent duplicate sends
      outreach.status = "queued";
      outreach.dispatchClaimedAt = new Date().toISOString();
      outreach.updatedAt = new Date().toISOString();
      await outreachRepository.saveOutreachRecord(outreach);

      // RFC 2822 message construction
      const subject = outreach.subject || `Personalized Website Preview for ${outreach.business.name}`;
      const messageBody = outreach.message;

      const rawEmail = [
        `From: WebsiteBanja <websitebanja@gmail.com>`,
        `To: ${recipient}`,
        `Subject: ${subject}`,
        `Date: ${new Date().toUTCString()}`,
        `Message-ID: <wb_${outreachId}_${Date.now()}@websitebanja.com>`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=UTF-8`,
        ``,
        messageBody,
      ].join("\r\n");

      // Base64url encode
      const encodedEmail = Buffer.from(rawEmail)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const response = await fetch(GMAIL_SEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: encodedEmail }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        outreach.status = "failed";
        outreach.deliveryOutcome = "failed";
        outreach.deliveryError = `Gmail send failed (${response.status}): ${errorText}`;
        outreach.updatedAt = new Date().toISOString();
        try {
          await outreachRepository.saveOutreachRecord(outreach);
        } catch {}

        ConfigValidator.updateInternalState((state) => {
          state.gmail.lastError = `Gmail send failed (${response.status}): ${errorText}`;
        });
        emitAgentEvent({
          event: "agent.provider_call",
          agent: "mitra",
          provider: "gmail",
          metadata: { operation: "gmail.send.failed", status: response.status },
        });
        return {
          success: false,
          error: { code: "GMAIL_API_ERROR", message: `Gmail API send failed: ${errorText}` },
        };
      }

      const sendResult: unknown = await response.json();
      if (!sendResult || typeof sendResult !== "object" || !("id" in sendResult) ||
        typeof sendResult.id !== "string" || !sendResult.id.trim()) {
        outreach.status = "queued"; // remain claimed to prevent retry
        outreach.deliveryOutcome = "reconciliation_required";
        outreach.deliveryError = "Gmail returned no verifiable message ID. Dispatch remains claimed; reconcile before any resend.";
        try {
          await outreachRepository.saveOutreachRecord(outreach);
        } catch {}
        return { success: false, error: { code: "DELIVERY_OUTCOME_UNCERTAIN",
          message: "Gmail returned no verifiable message ID. Dispatch remains claimed; reconcile before any resend." } };
      }
      const threadId = "threadId" in sendResult && typeof sendResult.threadId === "string" ? sendResult.threadId : undefined;
      const now = new Date().toISOString();

      outreach.status = "sent";
      outreach.deliveryOutcome = "provider_accepted";
      outreach.externalMessageId = sendResult.id;
      outreach.threadId = threadId;
      outreach.sentAt = now;
      outreach.updatedAt = now;

      try {
        await outreachRepository.saveOutreachRecord(outreach);
      } catch (persistErr: any) {
        outreach.deliveryOutcome = "reconciliation_required";
        outreach.deliveryError = `Provider accepted message ID ${sendResult.id}, but local record persistence failed: ${persistErr?.message}`;
        try {
          await outreachRepository.saveOutreachRecord(outreach);
        } catch {}
        throw new Error(`Outreach sent with message ID ${sendResult.id}, but persistence failed. Reconciliation required.`);
      }

      // Record in CRM
      await recordOutboundInCRM(outreach, options.userId, sendResult.id);

      ConfigValidator.updateInternalState((state) => {
        state.gmail.lastSendAt = now;
        state.gmail.lastError = null;
      });

      incrementRateLimitCount();

      emitAgentEvent({
        event: "agent.provider_call",
        agent: "mitra",
        provider: "gmail",
        metadata: {
          operation: "gmail.send.success",
          outreachId,
          messageId: sendResult.id,
          threadId,
        },
      });

      return {
        success: true,
        messageId: sendResult.id,
        threadId,
        isSimulated: false,
      };
    } catch (err: unknown) {
      const msg = "Dispatch outcome requires reconciliation. The original outreach remains claimed; do not resend automatically.";
      outreach.status = "queued"; // remain claimed
      outreach.deliveryOutcome = "reconciliation_required";
      outreach.deliveryError = err instanceof Error ? err.message : String(err);
      try {
        await outreachRepository.saveOutreachRecord(outreach);
      } catch {}
      ConfigValidator.updateInternalState((state) => {
        state.gmail.lastError = msg;
      });
      return {
        success: false,
        error: { code: "DELIVERY_OUTCOME_UNCERTAIN", message: msg },
      };
    }
  }

  /**
   * Reconciles an outreach dispatch whose outcome was uncertain.
   * Tenant-scoped: verifies record ownership via verified human admin tenant context.
   * Enforces server-verified human-admin authorization; AI and machine identities are rejected.
   * Inconclusive outcomes remain blocked for human review; uncertain dispatches are never reset for resend blindly.
   */
  static async reconcileOutreachDispatch(
    outreachId: string,
    action: "confirm_provider_accepted" | "reset_to_approved" | "mark_failed",
    options: ReconcileOutreachDispatchOptions
  ): Promise<{ success: boolean; outreach?: OutreachRecord; error?: string }> {
    // 1. Authenticated human admin authorization verification
    const adminCtx = options.adminContext;
    if (!adminCtx || typeof adminCtx !== "object") {
      return {
        success: false,
        error: "Authenticated human administrator context required. Unauthenticated calls or supplied ID strings are strictly prohibited.",
      };
    }

    if (adminCtx.isAdmin !== true || adminCtx.isHuman !== true) {
      return {
        success: false,
        error: "Reconciliation requires an authenticated human administrator. AI agents, autonomous models, and automated services cannot authorize reconciliation.",
      };
    }

    if (!adminCtx.adminUserId || typeof adminCtx.adminUserId !== "string" || !adminCtx.adminUserId.trim()) {
      return {
        success: false,
        error: "Invalid human administrator context: adminUserId must be a non-empty string.",
      };
    }

    const authorizedAdmins = getAuthorizedAdminUserIds();
    if (!authorizedAdmins.includes(adminCtx.adminUserId.trim())) {
      return {
        success: false,
        error: `Unauthorized human administrator: '${adminCtx.adminUserId}' is not in authorized admin allowlist.`,
      };
    }

    const tenantId = adminCtx.tenantId?.trim() || options.userId?.trim();
    if (!tenantId) {
      return {
        success: false,
        error: "Invalid administrator context: tenantId is required.",
      };
    }

    // 2. Tenant isolation and ownership check
    const outreach = await outreachRepository.findOutreachById(outreachId, tenantId);
    if (!outreach) {
      const anyOutreach = await outreachRepository.findOutreachById(outreachId);
      if (anyOutreach && anyOutreach.userId && anyOutreach.userId !== tenantId) {
        return {
          success: false,
          error: `Cross-tenant reconciliation violation: outreach '${outreachId}' belongs to tenant '${anyOutreach.userId}', but operator is acting for tenant '${tenantId}'. Cross-tenant recovery prohibited.`,
        };
      }
      return { success: false, error: `Outreach record '${outreachId}' not found for tenant '${tenantId}'` };
    }

    if (outreach.userId && outreach.userId !== tenantId) {
      return {
        success: false,
        error: `Tenant mismatch: outreach belongs to tenant '${outreach.userId}', but operator is acting for tenant '${tenantId}'.`,
      };
    }

    // 3. Concurrency-safe durable transitions & duplicate recovery prevention
    if (outreach.status === "sent" && outreach.externalMessageId) {
      return {
        success: false,
        error: `Duplicate recovery prevented: outreach '${outreachId}' was already confirmed sent with provider message ID '${outreach.externalMessageId}'.`,
      };
    }

    if (outreach.deliveryOutcome !== "reconciliation_required" && outreach.status !== "queued") {
      return {
        success: false,
        error: `Outreach '${outreachId}' does not require reconciliation (status: ${outreach.status}, outcome: ${outreach.deliveryOutcome})`,
      };
    }

    if (!options.reason || !options.reason.trim() || options.reason.trim().length < 10) {
      return { success: false, error: "Explicit audit reason (minimum 10 characters) required for dispatch reconciliation" };
    }

    const now = new Date().toISOString();

    // 4. Action handling
    if (action === "confirm_provider_accepted") {
      const messageId = options.verifiedExternalMessageId?.trim() || outreach.externalMessageId?.trim();
      if (!messageId) {
        return {
          success: false,
          error: "Cannot confirm delivery without verified provider message ID evidence.",
        };
      }

      // Check for forged or dummy message IDs
      if (/^fake|^dummy|^forged|^test_fake/i.test(messageId)) {
        return {
          success: false,
          error: `Fabricated provider message ID evidence rejected: '${messageId}'.`,
        };
      }

      const gmailStatus = ConfigValidator.getGmailStatus();
      let verifiedEvidence: Record<string, unknown> = {};

      if (gmailStatus.isConfigured) {
        try {
          const accessToken = await GmailOAuthManager.getValidAccessToken();
          const verifyRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=metadata&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Message-ID&metadataHeaders=From`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!verifyRes.ok) {
            return {
              success: false,
              error: `Provider verification failed: message '${messageId}' not found in authorized Gmail account (${verifyRes.status}). Dispatch remains blocked for human review.`,
            };
          }

          const msgData = await verifyRes.json();
          const headers: Array<{ name: string; value: string }> = msgData.payload?.headers || [];
          const getHdr = (n: string) => headers.find(h => h.name.toLowerCase() === n.toLowerCase())?.value || "";
          const msgTo = getHdr("To");

          // Verify recipient matches outreach target
          if (msgTo && outreach.business.email && !msgTo.toLowerCase().includes(outreach.business.email.toLowerCase())) {
            return {
              success: false,
              error: `Provider verification conflict: message recipient '${msgTo}' does not match expected business recipient '${outreach.business.email}'. Reconciliation rejected.`,
            };
          }

          verifiedEvidence = {
            verifiedVia: "gmail_api_server_verification",
            messageId,
            threadId: msgData.threadId,
            verifiedAt: now,
            verifiedRecipient: msgTo,
          };
        } catch (apiErr: any) {
          return {
            success: false,
            error: `Server-side Gmail verification check failed (${apiErr?.message || "network error"}). Dispatch remains blocked for human review.`,
          };
        }
      } else {
        // When Gmail API is unconfigured/unavailable, reconciliation cannot confirm provider acceptance.
        // Caller-supplied verification evidence is strictly rejected as an authority in all production branches.
        return {
          success: false,
          error: "Gmail API integration is unconfigured or unavailable. Verifiable provider acceptance cannot be confirmed without live server-side provider verification. Dispatch remains blocked for human review.",
        };
      }

      outreach.status = "sent";
      outreach.deliveryOutcome = "provider_accepted";
      outreach.externalMessageId = messageId;
      outreach.sentAt = outreach.sentAt || now;
      outreach.deliveryError = undefined;
      const reviewerTag = ` [Human Admin: ${adminCtx.adminUserId}${adminCtx.email ? ` (${adminCtx.email})` : ""}]`;
      outreach.notes = `${outreach.notes ? outreach.notes + "\n" : ""}[Reconciled confirmed${reviewerTag}]: ${options.reason}`;
      outreach.updatedAt = now;

      await outreachRepository.saveOutreachRecord(outreach);
      await recordOutboundInCRM(outreach, tenantId, messageId);

      emitAgentEvent({
        event: "agent.provider_call",
        agent: "mitra",
        provider: "gmail",
        metadata: {
          operation: "gmail.reconciled.accepted",
          outreachId,
          messageId,
          reason: options.reason,
          reconciledBy: adminCtx.adminUserId,
          verifiedEvidence,
        },
      });

      return { success: true, outreach };
    } else if (action === "reset_to_approved") {
      // Operator verified message was NOT sent; reset to approved for safe retry
      if (options.certifiedNotDispatched !== true) {
        return {
          success: false,
          error: "Reset to approved requires explicit human-admin certification that the message was verified NOT dispatched by provider (certifiedNotDispatched: true). Blind resends of uncertain dispatches are prohibited.",
        };
      }

      delete outreach.dispatchClaimedAt;
      outreach.status = "approved";
      outreach.deliveryOutcome = undefined;
      outreach.deliveryError = undefined;
      const reviewerTag = ` [Human Admin: ${adminCtx.adminUserId}${adminCtx.email ? ` (${adminCtx.email})` : ""}]`;
      outreach.notes = `${outreach.notes ? outreach.notes + "\n" : ""}[Reconciled reset${reviewerTag}]: ${options.reason}`;
      outreach.updatedAt = now;

      await outreachRepository.saveOutreachRecord(outreach);

      emitAgentEvent({
        event: "agent.provider_call",
        agent: "mitra",
        provider: "gmail",
        metadata: {
          operation: "gmail.reconciled.reset",
          outreachId,
          reason: options.reason,
          reconciledBy: adminCtx.adminUserId,
        },
      });

      return { success: true, outreach };
    } else if (action === "mark_failed") {
      outreach.status = "failed";
      outreach.deliveryOutcome = "failed";
      outreach.deliveryError = options.reason;
      const reviewerTag = ` [Human Admin: ${adminCtx.adminUserId}${adminCtx.email ? ` (${adminCtx.email})` : ""}]`;
      outreach.notes = `${outreach.notes ? outreach.notes + "\n" : ""}[Reconciled failed${reviewerTag}]: ${options.reason}`;
      outreach.updatedAt = now;

      await outreachRepository.saveOutreachRecord(outreach);

      emitAgentEvent({
        event: "agent.provider_call",
        agent: "mitra",
        provider: "gmail",
        metadata: {
          operation: "gmail.reconciled.failed",
          outreachId,
          reason: options.reason,
          reconciledBy: adminCtx.adminUserId,
        },
      });

      return { success: true, outreach };
    }

    return { success: false, error: `Invalid reconciliation action '${action}'` };
  }
}

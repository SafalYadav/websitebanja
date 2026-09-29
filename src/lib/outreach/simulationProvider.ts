// src/lib/outreach/simulationProvider.ts
/**
 * WebsiteBanja Local Simulation Provider
 * Phase: Phase 11 (Personalized Outreach Foundation)
 *
 * STRICT LOCAL-ONLY:
 * Zero external calls to SMTP, Gmail, WhatsApp Cloud API, Meta Graph API, or Twilio.
 * Simulates message dispatch by recording timestamps, receipts, and transitions
 * in local storage only.
 */

import type {
  OutreachRecord,
  SimulationReceipt,
  Phase12HandoffContract,
} from "./types";
import { outreachRepository } from "./outreachRepository";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export interface SimulateSendResult {
  success: boolean;
  outreach: OutreachRecord;
  receipt: SimulationReceipt;
  handoffToPhase12: Phase12HandoffContract;
  error?: string;
}

export class LocalSimulationProvider {
  /**
   * Executes a safe, local-only simulated dispatch.
   * Updates status to 'simulated_sent' and generates a simulation receipt.
   */
  async simulateDispatch(
    outreachId: string,
    userId?: string
  ): Promise<SimulateSendResult> {
    const record = await outreachRepository.findOutreachById(outreachId, userId);
    if (!record) {
      throw new Error(`Outreach record '${outreachId}' not found.`);
    }

    if (record.status === "rejected" || record.status === "cancelled") {
      throw new Error(`Cannot simulate dispatch for outreach in '${record.status}' status.`);
    }

    const now = new Date().toISOString();

    // Resolve recipient
    let recipient = "unknown_recipient";
    if (record.channel === "email") {
      recipient = record.business.email || `contact@${record.business.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.local`;
    } else if (record.channel === "whatsapp" || record.channel === "sms") {
      recipient = record.business.phone || "+91 98250 00000";
    } else if (record.channel === "instagram") {
      recipient = `@${record.business.name.toLowerCase().replace(/[^a-z0-9_]/g, "")}`;
    }

    const receipt: SimulationReceipt = {
      simulatedAt: now,
      provider: "local_simulation",
      recipient,
      channel: record.channel,
      payloadPreview: record.subject
        ? `[SUBJECT: ${record.subject}] ${record.message.slice(0, 100)}...`
        : `${record.message.slice(0, 100)}...`,
    };

    record.status = "simulated_sent";
    record.simulatedAt = now;
    record.simulationReceipt = receipt;
    record.updatedAt = now;

    await outreachRepository.saveOutreachRecord(record);

    emitAgentEvent({
      event: "outreach.simulated",
      agent: "mitra",
      metadata: {
        outreachId: record.outreachId,
        leadId: record.leadId,
        channel: record.channel,
        recipient,
      },
    });

    const handoffToPhase12: Phase12HandoffContract = {
      leadId: record.leadId,
      previewId: record.previewId,
      outreachId: record.outreachId,
      status: "simulated_sent",
      channel: record.channel,
      outreach: {
        subject: record.subject,
        message: record.message,
        previewUrl: record.previewUrl,
      },
      handoffPhase: "phase12_reply_intelligence_crm",
    };

    return {
      success: true,
      outreach: record,
      receipt,
      handoffToPhase12,
    };
  }
}

export const localSimulationProvider = new LocalSimulationProvider();

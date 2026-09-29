// src/lib/automation/followUpQueue.ts
// Phase 13 — Follow-Up Queue & No-Reply Handling Engine

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { crmRepository } from "@/lib/crm/crmRepository";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import type { OutreachChannel } from "@/lib/outreach/types";

const PIPELINE_DIR = path.resolve(process.cwd(), "scratch/pipeline");
const FOLLOWUPS_FILE = path.join(PIPELINE_DIR, "followups.json");
const CLOCK_FILE = path.join(PIPELINE_DIR, "simulated_clock.json");

export interface FollowUpJob {
  id: string;
  runId: string;
  leadId: string;
  conversationId: string;
  outreachId: string;
  channel: OutreachChannel;
  followUpNumber: number; // 1 or 2
  maxFollowUps: number; // 2
  scheduledAt: string; // ISO 8601
  dueAt: string; // ISO 8601
  status: "scheduled" | "executed" | "cancelled" | "exhausted";
  executedAt?: string;
  resultMessageId?: string;
  cancellationReason?: string;
}

function ensureFollowUpStorage(): void {
  if (!fs.existsSync(PIPELINE_DIR)) {
    fs.mkdirSync(PIPELINE_DIR, { recursive: true });
  }
  if (!fs.existsSync(FOLLOWUPS_FILE)) {
    fs.writeFileSync(FOLLOWUPS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
  if (!fs.existsSync(CLOCK_FILE)) {
    fs.writeFileSync(CLOCK_FILE, JSON.stringify({ currentTime: new Date().toISOString() }, null, 2), "utf-8");
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  ensureFollowUpStorage();
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[FollowUpQueue] Failed to parse ${filePath}, returning fallback`, err);
    return fallback;
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  ensureFollowUpStorage();
  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).substring(2, 7)}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpPath, filePath);
}

export class FollowUpQueue {
  /**
   * Returns current simulated clock time
   */
  static getSimulatedClock(): Date {
    ensureFollowUpStorage();
    const data = readJSON<{ currentTime: string }>(CLOCK_FILE, { currentTime: new Date().toISOString() });
    return new Date(data.currentTime);
  }

  /**
   * Sets or advances the simulated clock
   */
  static setSimulatedClock(time: Date | string): Date {
    ensureFollowUpStorage();
    const d = new Date(time);
    writeJSON(CLOCK_FILE, { currentTime: d.toISOString() });
    return d;
  }

  /**
   * Resets simulated clock to real world now
   */
  static resetSimulatedClock(): Date {
    return this.setSimulatedClock(new Date());
  }

  /**
   * Advances simulated clock by specified number of days
   */
  static async advanceSimulationClock(days: number): Promise<{
    previousTime: string;
    newTime: string;
    processed: { executed: FollowUpJob[]; exhausted: FollowUpJob[]; cancelled: FollowUpJob[] };
  }> {
    const prev = this.getSimulatedClock();
    const next = new Date(prev.getTime() + days * 24 * 60 * 60 * 1000);
    this.setSimulatedClock(next);

    const processed = await this.processDueFollowUps(next);

    return {
      previousTime: prev.toISOString(),
      newTime: next.toISOString(),
      processed,
    };
  }

  /**
   * Lists all follow-up jobs with optional filtering
   */
  static async listFollowUps(filter?: {
    runId?: string;
    leadId?: string;
    status?: FollowUpJob["status"];
  }): Promise<FollowUpJob[]> {
    ensureFollowUpStorage();
    let jobs = readJSON<FollowUpJob[]>(FOLLOWUPS_FILE, []);
    if (filter?.runId) {
      jobs = jobs.filter((j) => j.runId === filter.runId);
    }
    if (filter?.leadId) {
      jobs = jobs.filter((j) => j.leadId === filter.leadId);
    }
    if (filter?.status) {
      jobs = jobs.filter((j) => j.status === filter.status);
    }
    return jobs;
  }

  /**
   * Schedules a follow-up for a lead. Enforces MAX 2 follow-ups constraint.
   */
  static async scheduleFollowUp(data: {
    runId: string;
    leadId: string;
    conversationId: string;
    outreachId: string;
    channel?: OutreachChannel;
    followUpNumber?: number;
    delayDays?: number;
  }): Promise<FollowUpJob | null> {
    ensureFollowUpStorage();
    const leadState = await crmRepository.getLeadCRMState(data.leadId);
    if (leadState?.status === "DO_NOT_CONTACT") {
      return null;
    }

    const allJobs = readJSON<FollowUpJob[]>(FOLLOWUPS_FILE, []);
    const existingLeadJobs = allJobs.filter((j) => j.leadId === data.leadId);

    // Count executed or scheduled jobs
    const executedCount = existingLeadJobs.filter((j) => j.status === "executed").length;
    const targetFollowUpNumber = data.followUpNumber ?? executedCount + 1;

    // Hard constraint: Maximum 2 follow-ups
    if (targetFollowUpNumber > 2 || executedCount >= 2) {
      // Mark lead as NO_RESPONSE / LOST / MANUAL_REVIEW
      await crmRepository.updateLeadStatus(
        data.leadId,
        "LOST",
        "NO_RESPONSE: Maximum 2 follow-ups reached without reply",
        "system",
        undefined,
        data.conversationId
      );
      return null;
    }

    // Check if there is already a scheduled follow-up for this lead
    const alreadyScheduled = existingLeadJobs.find((j) => j.status === "scheduled");
    if (alreadyScheduled) {
      return alreadyScheduled;
    }

    const clockTime = this.getSimulatedClock();
    const delayDays = data.delayDays ?? (targetFollowUpNumber === 1 ? 3 : 5);
    const dueTime = new Date(clockTime.getTime() + delayDays * 24 * 60 * 60 * 1000);

    const job: FollowUpJob = {
      id: `fu_${crypto.randomBytes(6).toString("hex")}`,
      runId: data.runId,
      leadId: data.leadId,
      conversationId: data.conversationId,
      outreachId: data.outreachId,
      channel: data.channel ?? "email",
      followUpNumber: targetFollowUpNumber,
      maxFollowUps: 2,
      scheduledAt: clockTime.toISOString(),
      dueAt: dueTime.toISOString(),
      status: "scheduled",
    };

    allJobs.push(job);
    writeJSON(FOLLOWUPS_FILE, allJobs);

    await crmRepository.createCRMEvent({
      leadId: data.leadId,
      type: "FOLLOW_UP_CREATED",
      actor: "system",
      description: `Follow-up #${targetFollowUpNumber} scheduled for ${dueTime.toISOString().split("T")[0]}`,
      metadata: {
        conversationId: data.conversationId,
        followUpJobId: job.id,
        followUpNumber: targetFollowUpNumber,
        dueAt: job.dueAt,
      },
    });

    emitAgentEvent({
      event: "followup_queued",
      agent: "mitra",
      requestId: data.runId,
      metadata: {
        jobId: job.id,
        leadId: data.leadId,
        followUpNumber: targetFollowUpNumber,
        dueAt: job.dueAt,
      },
    });

    return job;
  }

  /**
   * Cancels all scheduled follow-ups for a lead (e.g. lead replied or DO_NOT_CONTACT)
   */
  static async cancelFollowUpsForLead(leadId: string, reason: string): Promise<number> {
    ensureFollowUpStorage();
    const allJobs = readJSON<FollowUpJob[]>(FOLLOWUPS_FILE, []);
    let count = 0;

    for (const job of allJobs) {
      if (job.leadId === leadId && job.status === "scheduled") {
        job.status = "cancelled";
        job.cancellationReason = reason;
        count++;
      }
    }

    if (count > 0) {
      writeJSON(FOLLOWUPS_FILE, allJobs);
    }
    return count;
  }

  /**
   * Evaluates and executes due follow-ups based on the reference time
   */
  static async processDueFollowUps(
    referenceTime?: Date | string
  ): Promise<{ executed: FollowUpJob[]; exhausted: FollowUpJob[]; cancelled: FollowUpJob[] }> {
    ensureFollowUpStorage();
    const checkTime = referenceTime ? new Date(referenceTime) : this.getSimulatedClock();
    const allJobs = readJSON<FollowUpJob[]>(FOLLOWUPS_FILE, []);

    const executed: FollowUpJob[] = [];
    const exhausted: FollowUpJob[] = [];
    const cancelled: FollowUpJob[] = [];

    for (const job of allJobs) {
      if (job.status !== "scheduled") continue;

      // Check if lead opted out or has DO_NOT_CONTACT
      const leadState = await crmRepository.getLeadCRMState(job.leadId);
      if (leadState?.status === "DO_NOT_CONTACT") {
        job.status = "cancelled";
        job.cancellationReason = "Lead status is DO_NOT_CONTACT";
        cancelled.push(job);
        continue;
      }

      // Check if conversation already received a reply
      const conv = await crmRepository.getConversation(job.conversationId);
      if (conv && (conv.status === "REPLIED" || conv.status === "CLOSED")) {
        job.status = "cancelled";
        job.cancellationReason = `Conversation is already ${conv.status}`;
        cancelled.push(job);
        continue;
      }

      // Check if due
      const dueDate = new Date(job.dueAt);
      if (dueDate.getTime() <= checkTime.getTime()) {
        // Execute simulated follow-up message
        const followUpText =
          job.followUpNumber === 1
            ? `Hi there! Just following up on the interactive website preview we prepared for your business earlier this week. Have you had a chance to take a look?`
            : `Hello! Quick final note regarding your custom website preview. We will close this file for now, but let us know if you ever want to upgrade your online presence!`;

        const msg = await crmRepository.addMessage({
          conversationId: job.conversationId,
          leadId: job.leadId,
          channel: job.channel,
          direction: "outbound",
          messageText: followUpText,
          source: "simulation",
          metadata: {
            rawPayload: {
              followUpNumber: job.followUpNumber,
              followUpJobId: job.id,
              isFollowUp: true,
            },
          },
        });

        job.status = "executed";
        job.executedAt = checkTime.toISOString();
        job.resultMessageId = msg.id;
        executed.push(job);

        emitAgentEvent({
          event: "followup_executed",
          agent: "mitra",
          requestId: job.runId,
          metadata: {
            jobId: job.id,
            leadId: job.leadId,
            followUpNumber: job.followUpNumber,
          },
        });

        // Update lead CRM status to FOLLOW_UP
        await crmRepository.updateLeadStatus(
          job.leadId,
          "FOLLOW_UP",
          `Follow-up #${job.followUpNumber} executed`,
          "simulation",
          msg.id,
          job.conversationId
        );

        // Schedule next follow-up if followUpNumber === 1
        if (job.followUpNumber === 1) {
          const nextDue = new Date(checkTime.getTime() + 4 * 24 * 60 * 60 * 1000);
          const nextJob: FollowUpJob = {
            id: `fu_${crypto.randomBytes(6).toString("hex")}`,
            runId: job.runId,
            leadId: job.leadId,
            conversationId: job.conversationId,
            outreachId: job.outreachId,
            channel: job.channel,
            followUpNumber: 2,
            maxFollowUps: 2,
            scheduledAt: checkTime.toISOString(),
            dueAt: nextDue.toISOString(),
            status: "scheduled",
          };
          allJobs.push(nextJob);
        } else {
          // Exceeded/completed 2 follow-ups with no reply
          job.status = "exhausted";
          exhausted.push(job);

          await crmRepository.updateLeadStatus(
            job.leadId,
            "LOST",
            "NO_RESPONSE: 2 follow-ups completed without response - closed / manual review",
            "system",
            msg.id,
            job.conversationId
          );
        }
      }
    }

    writeJSON(FOLLOWUPS_FILE, allJobs);
    return { executed, exhausted, cancelled };
  }

  /**
   * Clears follow-up data (for test resets)
   */
  static async clearFollowUpData(): Promise<void> {
    ensureFollowUpStorage();
    writeJSON(FOLLOWUPS_FILE, []);
    writeJSON(CLOCK_FILE, { currentTime: new Date().toISOString() });
  }
}

// src/lib/automation/pipelineOrchestrator.ts
// Phase 13 — Central Autonomous Lead Pipeline Orchestrator

import crypto from "crypto";
import {
  PipelineStage,
  PipelineStatus,
  PipelineRun,
  PipelineRunCriteria,
  LeadPipelineProgress,
  Phase14HandoffContract,
  assertValidStageTransition,
} from "./pipelineTypes";
import { PipelineQueue } from "./pipelineQueue";
import { FollowUpQueue } from "./followUpQueue";
import { executeDiscoveryRun } from "@/lib/discovery/discoveryService";
import { auditQualifiedLead } from "@/lib/audit/auditService";
import { generatePersonalizedPreview } from "@/lib/personalization/previewGenerator";
import { generateOutreachDraft } from "@/lib/outreach/personalizationEngine";
import { outreachRepository } from "@/lib/outreach/outreachRepository";
import { localSimulationProvider } from "@/lib/outreach/simulationProvider";
import { crmRepository } from "@/lib/crm/crmRepository";
import { simulateInboundReply } from "@/lib/crm/replySimulation";
import { leadRepository } from "@/lib/discovery/leadRepository";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import type { BusinessLead } from "@/lib/discovery/types";
import type { OutreachChannel } from "@/lib/outreach/types";

export class PipelineOrchestrator {
  /**
   * Initializes and executes an end-to-end autonomous pipeline run
   */
  static async startRun(criteria: PipelineRunCriteria, userId?: string): Promise<PipelineRun> {
    const runId = `run_pipe_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();

    const run: PipelineRun = {
      id: runId,
      status: "RUNNING",
      currentStage: "DISCOVERY",
      criteria,
      stats: {
        discovered: 0,
        qualified: 0,
        audited: 0,
        previewsGenerated: 0,
        outreachDrafted: 0,
        outreachDispatched: 0,
        repliesReceived: 0,
        interested: 0,
        followUpsScheduled: 0,
        failed: 0,
      },
      leads: {},
      createdAt: now,
      updatedAt: now,
      errors: [],
    };

    await PipelineQueue.savePipelineRun(run);

    emitAgentEvent({
      event: "pipeline_started",
      agent: "boss",
      requestId: runId,
      metadata: {
        criteria,
        runId,
      },
    });

    try {
      // ---------------------------------------------------------
      // STAGE 1 & 2: DISCOVERY & QUALIFICATION (Phase 8)
      // ---------------------------------------------------------
      run.currentStage = "DISCOVERY";
      emitAgentEvent({
        event: "pipeline_stage_started",
        agent: "boss",
        requestId: runId,
        metadata: { stage: "DISCOVERY" },
      });

      const candidateLimit = Math.max((criteria.limit || 5) * 3, 6);
      let discoveryResponse = await executeDiscoveryRun(
        {
          query: criteria.industry,
          location: criteria.city,
          limit: candidateLimit,
        },
        userId
      );

      // If local deterministic provider returned 0 leads for this specific city/query in local mode, fall back to broad keyword
      if (discoveryResponse.qualifiedLeads.length === 0) {
        const words = criteria.industry.toLowerCase().split(/\s+/);
        const fallbackKeyword =
          words.find((w) =>
            ["restaurant", "cafe", "hotel", "coffee", "bistro", "bakery", "dining"].includes(w)
          ) || "restaurant";

        discoveryResponse = await executeDiscoveryRun(
          {
            query: fallbackKeyword,
            location: "Vadodara",
            limit: candidateLimit,
          },
          userId
        );
      }

      // Slice qualified leads to requested limit
      const targetLimit = criteria.limit || 5;
      discoveryResponse.qualifiedLeads = discoveryResponse.qualifiedLeads.slice(0, targetLimit);

      run.stats.discovered =
        discoveryResponse.summary?.discovered ?? discoveryResponse.qualifiedLeads.length;
      run.stats.qualified = discoveryResponse.qualifiedLeads.length;

      // Initialize lead pipeline progress records
      for (const lead of discoveryResponse.qualifiedLeads) {
        run.leads[lead.leadId] = {
          leadId: lead.leadId,
          businessName: lead.businessName,
          currentStage: "QUALIFICATION",
          status: "pending",
          retryCount: 0,
          maxAttempts: 3,
          errorHistory: [],
          timeline: [
            {
              stage: "DISCOVERY",
              status: "completed",
              timestamp: now,
              details: `Discovered with qualification score ${lead.qualificationScore ?? "N/A"}`,
            },
            {
              stage: "QUALIFICATION",
              status: "completed",
              timestamp: now,
            },
          ],
        };
      }

      await PipelineQueue.savePipelineRun(run);

      emitAgentEvent({
        event: "pipeline_stage_completed",
        agent: "boss",
        requestId: runId,
        metadata: {
          stage: "DISCOVERY",
          qualifiedCount: run.stats.qualified,
        },
      });

      // If no leads qualified, complete early
      if (discoveryResponse.qualifiedLeads.length === 0) {
        run.status = "COMPLETED";
        run.completedAt = new Date().toISOString();
        run.updatedAt = new Date().toISOString();
        await PipelineQueue.savePipelineRun(run);
        return run;
      }

      // ---------------------------------------------------------
      // PROCESS EACH QUALIFIED LEAD SEQUENTIALLY WITH ISOLATION
      // ---------------------------------------------------------
      await this.processLeadBatch(run, discoveryResponse.qualifiedLeads, userId);

      // Check run status
      const leadProgressList = Object.values(run.leads);
      const allFailed = leadProgressList.length > 0 && leadProgressList.every((l) => l.status === "failed");
      const someFailed = leadProgressList.some((l) => l.status === "failed");

      if (allFailed) {
        run.status = "FAILED";
      } else if (someFailed) {
        run.status = "PARTIAL_SUCCESS";
      } else {
        run.status = "COMPLETED";
      }

      run.completedAt = new Date().toISOString();
      run.updatedAt = new Date().toISOString();
      await PipelineQueue.savePipelineRun(run);

      emitAgentEvent({
        event: "pipeline_completed",
        agent: "boss",
        requestId: runId,
        metadata: {
          status: run.status,
          stats: run.stats,
        },
      });

      return run;
    } catch (err) {
      const errMsg = (err as Error)?.message || String(err);
      run.status = "FAILED";
      run.error = errMsg;
      run.updatedAt = new Date().toISOString();
      await PipelineQueue.savePipelineRun(run);

      emitAgentEvent({
        event: "pipeline_stage_failed",
        agent: "boss",
        requestId: runId,
        error: errMsg,
        reason: "Fatal error in pipeline run orchestration",
      });

      return run;
    }
  }

  /**
   * Processes all stages for a batch of leads with strict per-lead isolation
   */
  private static async processLeadBatch(
    run: PipelineRun,
    leads: BusinessLead[],
    userId?: string
  ): Promise<void> {
    const channel: OutreachChannel = (run.criteria.channel as OutreachChannel) || "email";
    const autoApprove = run.criteria.autoApproveOutreach ?? true;

    for (const lead of leads) {
      // Check if run was paused or cancelled mid-execution
      const refreshedRun = await PipelineQueue.getPipelineRun(run.id);
      if (refreshedRun && (refreshedRun.status === "PAUSED" || refreshedRun.status === "CANCELLED")) {
        run.status = refreshedRun.status;
        return;
      }

      const leadProgress = run.leads[lead.leadId];
      if (!leadProgress) continue;

      // Check DO_NOT_CONTACT
      const leadState = await crmRepository.getLeadCRMState(lead.leadId);
      if (leadState?.status === "DO_NOT_CONTACT") {
        leadProgress.status = "skipped";
        leadProgress.timeline.push({
          stage: leadProgress.currentStage,
          status: "skipped",
          timestamp: new Date().toISOString(),
          details: "Skipped: Lead has DO_NOT_CONTACT status in CRM",
        });
        continue;
      }

      // STAGE 3: RESEARCH & WEBSITE AUDIT (Phase 9)
      run.currentStage = "RESEARCH_AUDIT";
      const auditResult = await PipelineQueue.executeLeadStageSafe(
        run,
        lead.leadId,
        "RESEARCH_AUDIT",
        async () => {
          return await auditQualifiedLead({ leadId: lead.leadId, lead }, userId);
        }
      );

      if (!auditResult.success || !auditResult.data) {
        continue; // Single-lead failure isolation: proceed to next lead
      }

      leadProgress.auditId = auditResult.data.auditId;
      run.stats.audited += 1;

      // STAGE 4: PERSONALIZED PREVIEW GENERATION (Phase 10)
      run.currentStage = "PREVIEW_GENERATION";
      const previewResult = await PipelineQueue.executeLeadStageSafe(
        run,
        lead.leadId,
        "PREVIEW_GENERATION",
        async () => {
          return await generatePersonalizedPreview({
            leadId: lead.leadId,
            overrideLead: lead,
            overrideAudit: auditResult.data,
            userId,
          });
        }
      );

      if (!previewResult.success || !previewResult.data?.preview) {
        continue;
      }

      leadProgress.previewId = previewResult.data.preview.id;
      leadProgress.previewUrl =
        previewResult.data.preview.url || (previewResult.data.preview as any).previewUrl;
      run.stats.previewsGenerated += 1;

      // STAGE 5: OUTREACH DRAFT (Phase 11)
      run.currentStage = "OUTREACH_DRAFT";
      const draftResult = await PipelineQueue.executeLeadStageSafe(
        run,
        lead.leadId,
        "OUTREACH_DRAFT",
        async () => {
          const res = await generateOutreachDraft({
            leadId: lead.leadId,
            channel,
            overrideLead: lead,
            overrideAudit: auditResult.data,
            overridePreview: previewResult.data?.preview,
            userId,
          });
          if (!res.success || !res.outreach) {
            throw new Error(res.error?.message || "Failed to generate outreach draft");
          }
          return res;
        }
      );

      if (!draftResult.success || !draftResult.data || !draftResult.data.outreach) {
        continue;
      }

      leadProgress.outreachId = draftResult.data.outreach.outreachId;
      run.stats.outreachDrafted += 1;

      // STAGE 6: HUMAN APPROVAL / SIMULATED DISPATCH (Phase 11)
      if (autoApprove) {
        run.currentStage = "SIMULATED_DISPATCH";
        const dispatchResult = await PipelineQueue.executeLeadStageSafe(
          run,
          lead.leadId,
          "SIMULATED_DISPATCH",
          async () => {
            // Auto-approve outreach record if still in draft
            await outreachRepository.updateOutreachStatus({
              outreachId: draftResult.data!.outreach!.outreachId,
              status: "approved",
              userId,
              notes: "Auto-approved by autonomous pipeline run",
            });

            // Simulate dispatch
            const receipt = await localSimulationProvider.simulateDispatch(
              draftResult.data!.outreach!.outreachId,
              userId
            );

            // Create CRM conversation and set status to OUTREACH_SENT
            const conv = await crmRepository.createConversation({
              leadId: lead.leadId,
              channel,
              userId,
            });

            await crmRepository.updateLeadStatus(
              lead.leadId,
              "OUTREACH_SENT",
              "Simulated outreach sent via autonomous pipeline",
              "simulation",
              undefined,
              conv.id,
              userId
            );

            // STAGE 7: FOLLOW_UP_QUEUE
            const fuJob = await FollowUpQueue.scheduleFollowUp({
              runId: run.id,
              leadId: lead.leadId,
              conversationId: conv.id,
              outreachId: draftResult.data!.outreach!.outreachId,
              channel,
            });

            return { receipt, conversationId: conv.id, followUpJobId: fuJob?.id };
          }
        );

        if (dispatchResult.success && dispatchResult.data) {
          run.stats.outreachDispatched += 1;
          if (dispatchResult.data.followUpJobId) {
            run.stats.followUpsScheduled += 1;
          }
          leadProgress.conversationId = dispatchResult.data.conversationId;
          leadProgress.currentStage = "WAITING_FOR_REPLY";
          leadProgress.status = "completed";
          leadProgress.completedAt = new Date().toISOString();
        }
      } else {
        // Requires human approval: pause at HUMAN_APPROVAL stage
        leadProgress.currentStage = "HUMAN_APPROVAL";
        leadProgress.status = "pending";
        leadProgress.timeline.push({
          stage: "HUMAN_APPROVAL",
          status: "started",
          timestamp: new Date().toISOString(),
          details: "Awaiting human review in outreach queue",
        });
      }

      await PipelineQueue.savePipelineRun(run);
    }
  }

  /**
   * Pauses an active pipeline run
   */
  static async pauseRun(runId: string): Promise<PipelineRun> {
    const run = await PipelineQueue.getPipelineRun(runId);
    if (!run) throw new Error(`Pipeline run '${runId}' not found`);

    if (run.status !== "RUNNING" && run.status !== "PENDING") {
      throw new Error(`Cannot pause pipeline run in status '${run.status}'`);
    }

    assertValidStageTransition(run.currentStage, "PAUSED");

    run.status = "PAUSED";
    run.pausedAt = new Date().toISOString();
    run.updatedAt = new Date().toISOString();
    await PipelineQueue.savePipelineRun(run);

    emitAgentEvent({
      event: "pipeline_paused",
      agent: "boss",
      requestId: runId,
      reason: "User requested pipeline pause",
    });

    return run;
  }

  /**
   * Resumes a paused pipeline run
   */
  static async resumeRun(runId: string, userId?: string): Promise<PipelineRun> {
    const run = await PipelineQueue.getPipelineRun(runId);
    if (!run) throw new Error(`Pipeline run '${runId}' not found`);

    if (run.status !== "PAUSED") {
      throw new Error(`Cannot resume pipeline run in status '${run.status}'`);
    }

    run.status = "RUNNING";
    run.pausedAt = undefined;
    run.updatedAt = new Date().toISOString();
    await PipelineQueue.savePipelineRun(run);

    emitAgentEvent({
      event: "pipeline_resumed",
      agent: "boss",
      requestId: runId,
      reason: "User requested pipeline resume",
    });

    // Resume any pending leads
    const pendingLeads = Object.values(run.leads).filter(
      (l) => l.status === "pending" || l.status === "running"
    );

    if (pendingLeads.length > 0) {
      const resolvedLeads: BusinessLead[] = [];
      for (const pl of pendingLeads) {
        const found = await leadRepository.findLeadById(pl.leadId, userId);
        if (found) resolvedLeads.push(found);
      }
      if (resolvedLeads.length > 0) {
        await this.processLeadBatch(run, resolvedLeads, userId);
      }
    }

    return run;
  }

  /**
   * Cancels a pipeline run and aborts scheduled follow-ups
   */
  static async cancelRun(runId: string, reason = "User requested cancellation"): Promise<PipelineRun> {
    const run = await PipelineQueue.getPipelineRun(runId);
    if (!run) throw new Error(`Pipeline run '${runId}' not found`);

    if (run.status === "COMPLETED" || run.status === "CANCELLED") {
      return run; // Already terminal
    }

    run.status = "CANCELLED";
    run.cancelledAt = new Date().toISOString();
    run.updatedAt = new Date().toISOString();
    run.error = reason;

    // Cancel all scheduled follow-ups for leads in this run
    for (const leadId of Object.keys(run.leads)) {
      await FollowUpQueue.cancelFollowUpsForLead(leadId, `Pipeline run ${runId} was cancelled: ${reason}`);
    }

    await PipelineQueue.savePipelineRun(run);

    emitAgentEvent({
      event: "pipeline_cancelled",
      agent: "boss",
      requestId: runId,
      reason,
    });

    return run;
  }

  /**
   * Retries all failed jobs for a given pipeline run
   */
  static async retryFailedJobs(runId: string, userId?: string): Promise<PipelineRun> {
    const run = await PipelineQueue.getPipelineRun(runId);
    if (!run) throw new Error(`Pipeline run '${runId}' not found`);

    const failedLeads = Object.values(run.leads).filter((l) => l.status === "failed");
    if (failedLeads.length === 0) {
      return run;
    }

    run.status = "RUNNING";
    run.updatedAt = new Date().toISOString();

    for (const lead of failedLeads) {
      lead.status = "pending";
      lead.retryCount = 0;
      lead.lastError = undefined;
    }

    await PipelineQueue.savePipelineRun(run);

    const resolvedLeads: BusinessLead[] = [];
    for (const fl of failedLeads) {
      const found = await leadRepository.findLeadById(fl.leadId, userId);
      if (found) resolvedLeads.push(found);
    }

    if (resolvedLeads.length > 0) {
      await this.processLeadBatch(run, resolvedLeads, userId);
    }

    return run;
  }

  /**
   * Simulates an inbound reply for a lead within an active or completed pipeline run
   */
  static async simulateReplyForRunLead(
    runId: string,
    leadId: string,
    messageText: string,
    channel: OutreachChannel = "email",
    userId?: string
  ) {
    const run = await PipelineQueue.getPipelineRun(runId);
    if (!run) throw new Error(`Pipeline run '${runId}' not found`);

    const lead = run.leads[leadId];
    if (!lead) throw new Error(`Lead '${leadId}' not found in pipeline run '${runId}'`);

    // Execute reply simulation via Phase 12
    const replyRes = await simulateInboundReply({
      leadId,
      messageText,
      channel,
      userId,
    });

    if (replyRes.success) {
      run.stats.repliesReceived += 1;
      lead.currentStage = "REPLY_INTELLIGENCE";

      // If reply is positive / interested, increment interested stat
      const intent =
        replyRes.analysis?.intent ||
        (replyRes.conversation as any)?.currentIntent ||
        (replyRes.conversation as any)?.intent;
      const sentiment =
        replyRes.analysis?.sentiment ||
        (replyRes.conversation as any)?.currentSentiment ||
        (replyRes.conversation as any)?.sentiment ||
        "NEUTRAL";

      if (
        intent === "INTERESTED" ||
        intent === "ASKING_PRICE" ||
        intent === "ASKING_FOR_DEMO" ||
        intent === "ASKING_FOR_CALL" ||
        intent === "POSITIVE_GENERAL"
      ) {
        run.stats.interested += 1;
      }

      // Cancel pending follow-ups since lead replied
      await FollowUpQueue.cancelFollowUpsForLead(leadId, `Received inbound reply: ${intent || "replied"}`);

      lead.timeline.push({
        stage: "REPLY_INTELLIGENCE",
        status: "completed",
        timestamp: new Date().toISOString(),
        details: `Simulated reply analyzed: Intent=${intent || "UNKNOWN"}, Sentiment=${sentiment}`,
      });

      await PipelineQueue.savePipelineRun(run);
    }

    return replyRes;
  }

  /**
   * Generates the Phase 14 Handoff Contract
   */
  static async getHandoffContract(runId: string): Promise<Phase14HandoffContract | null> {
    const run = await PipelineQueue.getPipelineRun(runId);
    if (!run) return null;

    const leadCount = Object.keys(run.leads).length;

    return {
      pipelineRunId: run.id,
      timestamp: new Date().toISOString(),
      status: run.status,
      metrics: run.stats,
      costMetrics: {
        estimatedTokens: leadCount * 4200,
        estimatedCostUsd: Number((leadCount * 0.012).toFixed(4)),
        durationMs:
          run.completedAt && run.createdAt
            ? new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime()
            : 0,
      },
      conversionFunnel: {
        leadsDiscovered: run.stats.discovered,
        leadsQualified: run.stats.qualified,
        auditsCompleted: run.stats.audited,
        previewsCreated: run.stats.previewsGenerated,
        outreachSent: run.stats.outreachDispatched,
        repliesTotal: run.stats.repliesReceived,
        positiveReplies: run.stats.interested,
      },
    };
  }
}

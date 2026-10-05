// src/lib/automation/pipelineOrchestrator.ts
// Phase 13 — Central Autonomous Lead Pipeline Orchestrator

import crypto from "crypto";
import {
  PipelineRun,
  PipelineRunCriteria,
  Phase14HandoffContract,
  assertValidStageTransition,
} from "./pipelineTypes";
import { PipelineQueue } from "./pipelineQueue";
import { isPipelineSuspended, updatePipelineCompletion } from "./pipelineCompletion";
import { FollowUpQueue } from "./followUpQueue";
import { executeDiscoveryRun } from "@/lib/discovery/discoveryService";
import { auditQualifiedLead } from "@/lib/audit/auditService";
import { canonicalGenerationOrchestrator } from "@/lib/intelligence/orchestration/canonicalGenerationOrchestrator";
import { generateOutreachDraft } from "@/lib/outreach/personalizationEngine";
import { outreachRepository } from "@/lib/outreach/outreachRepository";
import { localSimulationProvider } from "@/lib/outreach/simulationProvider";
import { crmRepository } from "@/lib/crm/crmRepository";
import { simulateInboundReply } from "@/lib/crm/replySimulation";
import { leadRepository } from "@/lib/discovery/leadRepository";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import type { BusinessLead } from "@/lib/discovery/types";
import type { OutreachChannel } from "@/lib/outreach/types";
import { GenerationHoldError, readGenerationHold } from "@/lib/intelligence/orchestration/generationHold";
import { readResearchResume } from "@/lib/intelligence/orchestration/researchGovernance";
import { readResearchObservation } from "@/lib/intelligence/orchestration/researchObservation";
import { pipelineExecutionFence, PipelineExecutionLostError } from "./pipelineExecutionLease";

export class PipelineOrchestrator {
  /**
   * Initializes and executes an end-to-end autonomous pipeline run
   */
  static async startRun(criteria: PipelineRunCriteria, userId?: string, tenantId?: string): Promise<PipelineRun> {
    const owner = tenantId || userId;
    if (!owner) throw new Error("Trusted autonomous pipeline tenant required");
    const runId = `run_pipe_${Date.now()}_${crypto.randomBytes(3).toString("hex")}`;
    const now = new Date().toISOString();

    const run: PipelineRun = {
      tenantId: owner, userId,
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

    return PipelineQueue.withRunExecution(run, ["RUNNING"], async () => {
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

      const candidateLimit = Math.min(Math.max((criteria.limit || 5) * 3, 6), 50);
      const discoveryResponse = await executeDiscoveryRun(
        {
          query: criteria.industry,
          location: criteria.city,
          limit: candidateLimit,
        },
        userId || owner
      );

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
      if (isPipelineSuspended(run)) return run;

      // Check run status
      updatePipelineCompletion(run);
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
      if (err instanceof PipelineExecutionLostError) throw err;
      await PipelineQueue.assertExecution(run);
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
    });
  }

  /**
   * Processes all stages for a batch of leads with strict per-lead isolation
   */
  private static async processLeadBatch(
    run: PipelineRun,
    leads: BusinessLead[],
    userId?: string
  ): Promise<void> {
    userId = run.userId || run.tenantId;
    if (!userId) throw new Error("Trusted lead batch owner required");
    const channel: OutreachChannel = (run.criteria.channel as OutreachChannel) || "email";
    const autoApprove = run.criteria.autoApproveOutreach ?? true;

    for (const lead of leads) {
      // Check if run was paused or cancelled mid-execution
      const refreshedRun = await PipelineQueue.getPipelineRun(run.id, run.tenantId);
      if (refreshedRun && (refreshedRun.status === "PAUSED" || refreshedRun.status === "CANCELLED")) {
        run.status = refreshedRun.status;
        return;
      }

      const leadProgress = run.leads[lead.leadId];
      if (!leadProgress) continue;

      // Check DO_NOT_CONTACT
      const leadState = await crmRepository.getLeadCRMState(lead.leadId, userId);
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

      if (!leadProgress.auditId) run.stats.audited += 1;
      leadProgress.auditId = auditResult.data.auditId;

      // STAGE 4: PERSONALIZED PREVIEW GENERATION (Phase 10)
      run.currentStage = "PREVIEW_GENERATION";
      const previewResult = await PipelineQueue.executeLeadStageSafe(
        run,
        lead.leadId,
        "PREVIEW_GENERATION",
        async () => {
          const tenantId = run.tenantId || run.userId;
          if (!tenantId) throw new Error("Owned autonomous pipeline identity required");
          const resumed = leadProgress.researchId ? await readResearchResume(leadProgress.researchId, tenantId) : null;
          if (leadProgress.researchId && !resumed?.result) {
            const observation = await readResearchObservation(leadProgress.researchId, { kind: "automation", tenantId });
            if (!observation) throw new Error("Owned research record not found; resume denied");
            if (["REJECTED", "FAILED", "QUALITY_BLOCKED"].includes(observation.status)) throw new Error(`Business research ${observation.status.toLowerCase()}; generation cannot resume`);
            throw new GenerationHoldError({ status: "WAITING_HUMAN_APPROVAL", researchId: leadProgress.researchId,
              correlationId: leadProgress.generationCorrelationId });
          }
          const result = resumed?.result || await canonicalGenerationOrchestrator.generateWebsite({
            businessName: lead.businessName,
            source: "autonomous_pipeline",
            leadId: lead.leadId,
            overrideLead: lead,
            overrideAudit: auditResult.data,
            userId: run.userId,
            tenantId,
          }, undefined, pipelineExecutionFence(run));
          if (!result.success) {
            const hold = readGenerationHold(result);
            if (hold) throw new GenerationHoldError(hold);
            throw new Error(result.error?.message || "Preview generation failed");
          }
          return result;
        },
        { maxAttempts: 1 }
      );

      if (!previewResult.success || !previewResult.data?.preview) {
        if (run.status === "PAUSED") return;
        continue;
      }

      if (!leadProgress.previewId) run.stats.previewsGenerated += 1;
      leadProgress.previewId = previewResult.data.preview.id;
      leadProgress.previewUrl =
        previewResult.data.preview.url || (previewResult.data.preview as any).previewUrl;

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
            overridePreview: previewResult.data?.preview
              ? {
                  ...(previewResult.data.preview as any),
                  previewId: previewResult.data.preview.id,
                  previewUrl: previewResult.data.preview.url,
                }
              : undefined,
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

      if (!leadProgress.outreachId) run.stats.outreachDrafted += 1;
      leadProgress.outreachId = draftResult.data.outreach.outreachId;

      // STAGE 6: HUMAN APPROVAL / DISPATCH
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
              notes: "Auto-approved by autonomous pipeline run (dry-run)",
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
        // Controlled Live Mode: Requires explicit human approval before sending
        leadProgress.currentStage = "HUMAN_APPROVAL";
        leadProgress.status = "pending";
        leadProgress.timeline.push({
          stage: "HUMAN_APPROVAL",
          status: "started",
          timestamp: new Date().toISOString(),
          details: "Awaiting human review in outreach queue before live send",
        });
      }

      await PipelineQueue.savePipelineRun(run);
    }
  }

  /**
   * Pauses an active pipeline run
   */
  static async pauseRun(runId: string, tenantId?: string): Promise<PipelineRun> {
    if (!tenantId) throw new Error("Trusted pipeline tenant required");
    const run = await PipelineQueue.getPipelineRun(runId, tenantId);
    if (!run) throw new Error(`Pipeline run '${runId}' not found`);

    if (run.status !== "RUNNING" && run.status !== "PENDING") {
      throw new Error(`Cannot pause pipeline run in status '${run.status}'`);
    }

    assertValidStageTransition(run.currentStage, "PAUSED");

    run.status = "PAUSED";
    run.pausedAt = new Date().toISOString();
    run.pauseReason = "human";
    run.updatedAt = new Date().toISOString();
    await PipelineQueue.suspendRun(run);

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
  static async resumeRun(runId: string, userId?: string, tenantId?: string, researchId?: string): Promise<PipelineRun> {
    if (!tenantId && !userId) throw new Error("Trusted pipeline tenant required");
    const owner = tenantId || userId;
    if (!owner) throw new Error("Trusted pipeline tenant required");
    const run = await PipelineQueue.getPipelineRun(runId, owner);
    if (!run) throw new Error("Owned pipeline run not found");
    if (!run.tenantId || run.tenantId !== owner) throw new Error("Pipeline ownership validation failed");
    userId = run.userId;

    // RUNNING is recoverable only when its prior lease is absent/expired; the
    // atomic claim still rejects every worker holding a live execution lease.
    return PipelineQueue.withRunExecution(run, ["PAUSED", "RUNNING"], async () => {

    emitAgentEvent({
      event: "pipeline_resumed",
      agent: "boss",
      requestId: runId,
      reason: "User requested pipeline resume",
    });

    // Resume any pending or paused leads
    const pendingLeads = Object.values(run.leads).filter(
      (l) => l.status === "pending" || l.status === "running" || l.status === "paused"
    );

    if (pendingLeads.length > 0) {
      const resolvedLeads: BusinessLead[] = [];
      for (const pl of pendingLeads) {
        const found = await leadRepository.findLeadById(pl.leadId, userId || run.tenantId);
        if (!found) throw new Error("Original owned pipeline lead unavailable; resume denied");
        resolvedLeads.push(found);
      }
      if (resolvedLeads.length > 0) {
        await this.processLeadBatch(run, resolvedLeads, userId);
      }
    }
    updatePipelineCompletion(run);
    await PipelineQueue.savePipelineRun(run);
    return run;
    }, researchId);
  }

  /**
   * Cancels a pipeline run and aborts scheduled follow-ups
   */
  static async cancelRun(runId: string, reason = "User requested cancellation", tenantId?: string): Promise<PipelineRun> {
    if (!tenantId) throw new Error("Trusted pipeline tenant required");
    const run = await PipelineQueue.getPipelineRun(runId, tenantId);
    if (!run) throw new Error(`Pipeline run '${runId}' not found`);

    if (run.status === "COMPLETED" || run.status === "CANCELLED") {
      return run; // Already terminal
    }

    run.status = "CANCELLED";
    run.cancelledAt = new Date().toISOString();
    run.updatedAt = new Date().toISOString();
    run.error = reason;

    await PipelineQueue.suspendRun(run);

    // Cancel all scheduled follow-ups for leads in this run
    const { cancelPipelineContinuations } = await import("@/lib/intelligence/orchestration/pipelineResearchContinuation");
    await cancelPipelineContinuations(run.id, tenantId);
    for (const leadId of Object.keys(run.leads)) {
      await FollowUpQueue.cancelFollowUpsForLead(leadId, `Pipeline run ${runId} was cancelled: ${reason}`);
    }

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
  static async retryFailedJobs(runId: string, userId?: string, tenantId?: string): Promise<PipelineRun> {
    if (!tenantId && !userId) throw new Error("Trusted pipeline tenant required");
    const run = await PipelineQueue.getPipelineRun(runId, tenantId || userId);
    if (!run) throw new Error(`Pipeline run '${runId}' not found`);
    userId = run.userId || run.tenantId;

    return PipelineQueue.withRunExecution(run, ["FAILED", "PARTIAL_SUCCESS"], async () => {

    // Handle discovery stage failure retry
    if (run.currentStage === "DISCOVERY" || Object.keys(run.leads).length === 0) {
      run.status = "RUNNING";
      run.error = undefined;
      run.updatedAt = new Date().toISOString();
      await PipelineQueue.savePipelineRun(run);

      try {
        const candidateLimit = Math.min(Math.max((run.criteria.limit || 5) * 3, 6), 50);
        const discoveryResponse = await executeDiscoveryRun(
          {
            query: run.criteria.industry,
            location: run.criteria.city,
            limit: candidateLimit,
          },
          userId
        );

        const targetLimit = run.criteria.limit || 5;
        discoveryResponse.qualifiedLeads = discoveryResponse.qualifiedLeads.slice(0, targetLimit);
        run.stats.discovered =
          discoveryResponse.summary?.discovered ?? discoveryResponse.qualifiedLeads.length;
        run.stats.qualified = discoveryResponse.qualifiedLeads.length;

        const now = new Date().toISOString();
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

        if (discoveryResponse.qualifiedLeads.length === 0) {
          run.status = "COMPLETED";
          run.completedAt = new Date().toISOString();
          run.updatedAt = new Date().toISOString();
          await PipelineQueue.savePipelineRun(run);
          return run;
        }

        await this.processLeadBatch(run, discoveryResponse.qualifiedLeads, userId);
        if (isPipelineSuspended(run)) return run;

        updatePipelineCompletion(run);
        await PipelineQueue.savePipelineRun(run);
        return run;
      } catch (err) {
        if (err instanceof PipelineExecutionLostError) throw err;
        await PipelineQueue.assertExecution(run);
        const errMsg = (err as Error)?.message || String(err);
        run.status = "FAILED";
        run.error = errMsg;
        run.updatedAt = new Date().toISOString();
        await PipelineQueue.savePipelineRun(run);
        return run;
      }
    }

    const failedLeads = Object.values(run.leads).filter((l) => l.status === "failed");
    if (failedLeads.length === 0) {
      updatePipelineCompletion(run);
      await PipelineQueue.savePipelineRun(run);
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
      if (!found) throw new Error("Original owned pipeline lead unavailable; retry denied");
      resolvedLeads.push(found);
    }

    if (resolvedLeads.length > 0) {
      await this.processLeadBatch(run, resolvedLeads, userId);
    }

    updatePipelineCompletion(run);
    await PipelineQueue.savePipelineRun(run);
    return run;
    });
  }

  /**
   * Simulates an inbound reply for a lead within an active or completed pipeline run
   */
  static async simulateReplyForRunLead(
    runId: string,
    leadId: string,
    messageText: string,
    channel: OutreachChannel = "email",
    userId?: string,
    tenantId?: string
  ) {
    const owner = tenantId || userId;
    if (!owner) throw new Error("Trusted pipeline tenant required");
    const run = await PipelineQueue.getPipelineRun(runId, owner);
    if (!run) throw new Error(`Pipeline run '${runId}' not found`);
    if (run.tenantId !== owner) throw new Error("Pipeline ownership validation failed");
    userId = run.userId || run.tenantId;
    if (channel === "whatsapp") throw new Error("WhatsApp outreach simulation is disabled");

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
  static async getHandoffContract(runId: string, tenantId?: string): Promise<Phase14HandoffContract | null> {
    if (!tenantId) throw new Error("Trusted pipeline tenant required");
    const run = await PipelineQueue.getPipelineRun(runId, tenantId);
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

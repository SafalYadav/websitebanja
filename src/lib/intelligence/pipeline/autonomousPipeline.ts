// src/lib/intelligence/pipeline/autonomousPipeline.ts
import { randomUUID } from "crypto";
import type {
  AutonomousPipelineRun,
  PipelineCriteria,
  LeadExecutionRecord,
  PipelineRunStats,
} from "./pipelineTypes";
import { PipelineCriteriaSchema } from "./pipelineTypes";
import { approvalGate } from "./approvalGate";
import { opsToolExecutor } from "../ops/opsToolExecutor";
import { GmailEmailProvider } from "@/lib/integrations/gmailEmailProvider";
import { crmRepository } from "@/lib/crm/crmRepository";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { readGenerationHold } from "../orchestration/generationHold";
import { registerAutonomousRun, checkpointAutonomousRun, readAutonomousRun, listAutonomousRuns,
  claimAutonomousResearch, assertAutonomousResearchLease, releaseAutonomousResearchLease } from "./autonomousRunStore";

export class AutonomousPipeline {
  private static instance: AutonomousPipeline;
  private runs: Map<string, AutonomousPipelineRun> = new Map();
  private processedReplyIds: Set<string> = new Set();
  private researchResumes: Map<string, Promise<AutonomousPipelineRun>> = new Map();
  private runRevisions: Map<string, number> = new Map();
  private researchLeaseTokens: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): AutonomousPipeline {
    if (!AutonomousPipeline.instance) {
      AutonomousPipeline.instance = new AutonomousPipeline();
    }
    return AutonomousPipeline.instance;
  }

  /**
   * Executes the full autonomous pipeline starting with Lead Discovery.
   * DISCOVER -> QUALIFY -> AUDIT -> RESEARCH -> PREVIEW DECISION -> VALIDATION -> OUTREACH DRAFT.
   * Halts at HUMAN APPROVAL GATE before sending any external email.
   */
  public async startPipeline(
    criteriaInput: PipelineCriteria,
    options: {
      tenantId?: string | null;
      taskId?: string;
      projectId?: string | null;
      userId?: string;
      idempotencyKey?: string;
    } = {}
  ): Promise<AutonomousPipelineRun> {
    const parseResult = PipelineCriteriaSchema.safeParse(criteriaInput);
    if (!parseResult.success) {
      const errMsgs = parseResult.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      throw new Error(`Invalid PipelineCriteria: ${errMsgs.join("; ")}`);
    }

    const criteria = parseResult.data as PipelineCriteria;

    const requestIdentity = JSON.stringify({ criteria, projectId: options.projectId || null, taskId: options.taskId || null, userId: options.userId || null });

    const runId = `run_pipe23_${Date.now()}_${randomUUID().slice(0, 6)}`;
    const taskId = options.taskId || `task_ceo_${Date.now()}`;
    const now = new Date().toISOString();

    const initialStats: PipelineRunStats = {
      discovered: 0,
      qualified: 0,
      disqualified: 0,
      audited: 0,
      previewsGenerated: 0,
      previewsSkippedGoodWebsite: 0,
      previewsFailedValidation: 0,
      outreachDrafted: 0,
      pendingApproval: 0,
      approved: 0,
      rejected: 0,
      sent: 0,
      repliesReceived: 0,
      interested: 0,
      meetingsScheduled: 0,
      followUpsScheduled: 0,
      won: 0,
      lost: 0,
      failed: 0,
    };

    const run: AutonomousPipelineRun = {
      pipelineRunId: runId,
      taskId,
      tenantId: options.tenantId || options.userId || null,
      userId: options.userId || null,
      projectId: options.projectId || null,
      status: "running",
      currentStage: "DISCOVER",
      criteria,
      stats: initialStats,
      leads: {},
      errors: [],
      createdAt: now,
      updatedAt: now,
    };

    const registered = await registerAutonomousRun(run, options.idempotencyKey, requestIdentity);
    if (!registered.created) return registered.run;
    this.runRevisions.set(runId, registered.revision);
    this.runs.set(runId, run);
    // The durable registration above claims discovery before any async tool call.

    emitAgentEvent({
      agent: "executive",
      event: "executive.planning",
      requestId: runId,
      metadata: {
        operation: "pipeline.start",
        criteria,
        runId,
      },
    });

    try {
      // ─── STAGE 1: DISCOVER ───────────────────────────────────────────────
      run.currentStage = "DISCOVER";
      const discResp = await opsToolExecutor.executeTool({
        tool: "discover_leads",
        requestId: `req_disc_${runId}`,
        taskId,
        tenantId: run.tenantId,
        userId: run.userId || undefined,
        input: {
          query: criteria.niche,
          location: criteria.location,
          limit: criteria.limit || 5,
        },
      });

      if (!discResp.success || !discResp.result) {
        throw new Error(`Discovery failed: ${discResp.errors.join("; ")}`);
      }

      const discoveredLeads: any[] = Array.isArray(discResp.result.leads)
        ? discResp.result.leads
        : [];

      run.stats.discovered = discResp.result.totalDiscovered ?? discoveredLeads.length;

      // Initialize per-lead execution records
      for (const rawLead of discoveredLeads) {
        const leadId = String(rawLead.leadId || `lead_${Date.now()}_${randomUUID().slice(0, 6)}`);
        rawLead.leadId = leadId;

        run.leads[leadId] = {
          leadId,
          userId: options.userId,
          businessName: rawLead.businessName || "Local Business",
          category: rawLead.category || criteria.niche,
          city: rawLead.city || criteria.location,
          email: rawLead.email,
          phone: rawLead.phone,
          website: rawLead.website,
          currentStage: "DISCOVER",
          status: "pending",
          approvalStatus: "DRAFT_CREATED",
          crmStatus: "DISCOVERED",
          retryCount: 0,
          timeline: [
            {
              stage: "DISCOVER",
              status: "completed",
              timestamp: new Date().toISOString(),
              details: `Discovered business in ${criteria.location}`,
            },
          ],
        };
      }

      // If no leads discovered, complete early
      if (discoveredLeads.length === 0) {
        run.status = "completed";
        run.completedAt = new Date().toISOString();
        run.updatedAt = new Date().toISOString();
        await this.reportProgressToCeo(runId);
        return run;
      }

      // ─── PROCESS EACH DISCOVERED LEAD THROUGH STAGES ─────────────────────
      // Preserve original discovered inputs before any downstream generation.
      await this.checkpoint(run);
      for (const lead of discoveredLeads) {
        await this.processLead(run, lead, options.userId);
        run.currentStage = run.leads[lead.leadId]?.currentStage || run.currentStage;
        await this.checkpoint(run);
      }

      // Determine overall pipeline run status
      const leadRecords = Object.values(run.leads);
      const hasPendingApproval = leadRecords.some((l) => l.approvalStatus === "PENDING_HUMAN_APPROVAL");
      const hasFailed = leadRecords.some((l) => l.status === "failed");
      const researchHold = leadRecords.find(record => record.generationHold);

      if (researchHold) {
        run.status = researchHold.generationHold?.status === "WAITING_HUMAN_APPROVAL" ? "waiting_research_approval" : "research_required";
        run.currentStage = "RESEARCH";
      } else if (hasPendingApproval) {
        run.status = "waiting_approval";
      } else if (hasFailed) {
        run.status = "partial_success";
      } else {
        run.status = "completed";
        run.completedAt = new Date().toISOString();
      }

      run.updatedAt = new Date().toISOString();

      // Report progress to CEO
      await this.reportProgressToCeo(runId);

      return run;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Pipeline execution failed";
      run.status = "failed";
      run.errors.push({
        stage: run.currentStage,
        message: errMsg,
        timestamp: new Date().toISOString(),
      });
      run.updatedAt = new Date().toISOString();
      await this.reportProgressToCeo(runId);
      return run;
    }
  }

  /**
   * Processes a single lead through Qualification, Audit, Research, Preview Decision, Preview QA, and Outreach Drafting.
   */
  private async processLead(
    run: AutonomousPipelineRun,
    lead: any,
    userId?: string
  ): Promise<void> {
    const leadRecord = run.leads[lead.leadId];
    if (!leadRecord) return;

    // Check DO_NOT_CONTACT check first
    const crmState = await crmRepository.getLeadCRMState(lead.leadId, userId);
    if (crmState && crmState.status === "DO_NOT_CONTACT") {
      leadRecord.status = "skipped";
      leadRecord.crmStatus = "DO_NOT_CONTACT";
      leadRecord.terminalOutcome = "LOST";
      leadRecord.terminalReason = "Lead has DO_NOT_CONTACT status";
      leadRecord.timeline.push({
        stage: "DISCOVER",
        status: "skipped",
        timestamp: new Date().toISOString(),
        details: "Skipped: Lead has DO_NOT_CONTACT status",
      });
      run.stats.lost += 1;
      return;
    }

    // ─── STAGE 2: QUALIFY ────────────────────────────────────────────────
    leadRecord.currentStage = "QUALIFY";
    leadRecord.status = "running";

    const qualResp = await opsToolExecutor.executeTool({
      tool: "qualify_lead",
      requestId: `req_qual_${lead.leadId}`,
      taskId: run.taskId,
      tenantId: run.tenantId,
      userId: run.userId || undefined,
      input: { lead, leadId: lead.leadId },
    });

    if (!qualResp.success || !qualResp.result) {
      leadRecord.status = "failed";
      leadRecord.error = "Qualification evaluation failed";
      run.stats.failed += 1;
      return;
    }

    leadRecord.qualificationScore = qualResp.result.score;
    leadRecord.qualificationStatus = qualResp.result.status;

    if (!qualResp.result.qualified) {
      // Disqualified leads are stopped early before expensive downstream operations
      leadRecord.status = "skipped";
      leadRecord.crmStatus = "LOST";
      leadRecord.terminalOutcome = "LOST";
      leadRecord.terminalReason = `Disqualified during qualification: ${qualResp.result.reasonCodes?.join(", ")}`;
      leadRecord.timeline.push({
        stage: "QUALIFY",
        status: "skipped",
        timestamp: new Date().toISOString(),
        details: leadRecord.terminalReason,
      });

      await crmRepository.updateLeadStatus(
        lead.leadId,
        "LOST",
        leadRecord.terminalReason,
        "system",
        undefined,
        undefined,
        userId
      );

      run.stats.disqualified += 1;
      run.stats.lost += 1;
      return;
    }

    run.stats.qualified += 1;
    leadRecord.crmStatus = "QUALIFIED";
    leadRecord.timeline.push({
      stage: "QUALIFY",
      status: "completed",
      timestamp: new Date().toISOString(),
      details: `Qualified with score ${qualResp.result.score}`,
    });

    await crmRepository.updateLeadStatus(
      lead.leadId,
      "QUALIFIED",
      `Qualified with score ${qualResp.result.score}`,
      "system",
      undefined,
      undefined,
      userId
    );

    // ─── STAGE 3: AUDIT ──────────────────────────────────────────────────
    leadRecord.currentStage = "AUDIT";
    const auditResp = await opsToolExecutor.executeTool({
      tool: "audit_website",
      requestId: `req_audit_${lead.leadId}`,
      taskId: run.taskId,
      tenantId: run.tenantId,
      userId: run.userId || undefined,
      input: { lead, leadId: lead.leadId },
    });

    if (auditResp.success && auditResp.result) {
      leadRecord.auditId = auditResp.result.auditId;
      leadRecord.auditScore = auditResp.result.auditScore;
      leadRecord.hasWebsite = auditResp.result.websiteStatus === "present";
      leadRecord.crmStatus = "AUDITED";
      run.stats.audited += 1;

      leadRecord.timeline.push({
        stage: "AUDIT",
        status: "completed",
        timestamp: new Date().toISOString(),
        details: `Audit completed. Score: ${auditResp.result.auditScore}, Status: ${auditResp.result.websiteStatus}`,
      });

      await crmRepository.updateLeadStatus(
        lead.leadId,
        "AUDITED",
        `Website audit completed with score ${auditResp.result.auditScore}`,
        "system",
        undefined,
        undefined,
        userId
      );
    }

    // ─── STAGE 4: RESEARCH ───────────────────────────────────────────────
    leadRecord.currentStage = "RESEARCH";
    const resResp = await opsToolExecutor.executeTool({
      tool: "research_business",
      requestId: `req_res_${lead.leadId}`,
      taskId: run.taskId,
      tenantId: run.tenantId,
      userId: run.userId || undefined,
      input: { lead, leadId: lead.leadId },
    });

    if (resResp.success && resResp.result) {
      leadRecord.timeline.push({
        stage: "RESEARCH",
        status: "completed",
        timestamp: new Date().toISOString(),
        details: "Business research summary compiled",
      });
    }

    // ─── STAGE 5: PREVIEW DECISION ───────────────────────────────────────
    leadRecord.currentStage = "PREVIEW_DECISION";
    const auditScore = leadRecord.auditScore ?? 50;
    const hasWebsite = Boolean(leadRecord.hasWebsite);

    // If website is already strong/good enough (audit opportunity score < 30 and website present), skip preview
    const shouldSkipPreview = hasWebsite && auditScore < 30;

    if (shouldSkipPreview) {
      leadRecord.websiteDecision = "skip_good_website";
      run.stats.previewsSkippedGoodWebsite += 1;
      leadRecord.timeline.push({
        stage: "PREVIEW_DECISION",
        status: "completed",
        timestamp: new Date().toISOString(),
        details: "Skipped preview generation: business already has a strong website.",
      });
    } else {
      // Prioritize bespoke preview generation for missing or weak websites
      leadRecord.websiteDecision = hasWebsite ? "generate_preview" : "missing_website";

      // ─── STAGE 6: PREVIEW GENERATION ────────────────────────────────────
      leadRecord.currentStage = "PREVIEW_GENERATION";
      const prevResp = await opsToolExecutor.executeTool({
        tool: "generate_preview",
        requestId: `req_prev_${lead.leadId}`,
        taskId: run.taskId,
        tenantId: run.tenantId,
        userId: run.userId || undefined,
        input: { lead, leadId: lead.leadId },
      });

      const hold = readGenerationHold(prevResp.result);
      if (hold) {
        leadRecord.generationHold = hold;
        leadRecord.status = hold.status === "WAITING_HUMAN_APPROVAL" ? "waiting_research_approval" : "research_required";
        leadRecord.timeline.push({ stage: "PREVIEW_GENERATION", status: "research_required",
          timestamp: new Date().toISOString(), details: `Generation paused for research ${hold.researchId}; no preview or outreach was created` });
        return;
      }

      if (!prevResp.success || !prevResp.result?.previewId) {
        leadRecord.status = "failed";
        leadRecord.error = "Preview generation failed";
        run.stats.failed += 1;
        return;
      }

      leadRecord.previewId = prevResp.result.previewId;
      leadRecord.previewUrl = prevResp.result.previewUrl;
      run.stats.previewsGenerated += 1;

      if (!await this.validateGeneratedPreview(run, leadRecord, lead, userId)) return;
    }
    await this.createVerifiedOutreach(run, leadRecord, lead, userId, resResp.result?.publicContact?.email);
  }

  private async validateGeneratedPreview(run: AutonomousPipelineRun, leadRecord: LeadExecutionRecord,
    lead: { leadId: string; businessName: string; email?: string }, userId?: string): Promise<boolean> {
    // ─── STAGE 7: PREVIEW VALIDATION ────────────────────────────────────
    leadRecord.currentStage = "PREVIEW_VALIDATION";
    const valResp = await this.executeResearchCheckedTool(run, {
      tool: "validate_preview",
      requestId: `req_val_${lead.leadId}`,
      taskId: run.taskId,
      tenantId: run.tenantId,
      userId: run.userId || undefined,
      input: {
        previewId: leadRecord.previewId,
        businessName: lead.businessName,
        lead,
      },
    });
    if (leadRecord.terminalOutcome || ["paused", "cancelled"].includes(run.status)) return false;

    if (!valResp.success || !valResp.result?.passed) {
      leadRecord.previewValidated = false;
      leadRecord.status = "failed";
      leadRecord.error = "Preview failed deterministic quality validation checks";
      run.stats.previewsFailedValidation += 1;
      run.stats.failed += 1;

      leadRecord.timeline.push({
        stage: "PREVIEW_VALIDATION",
        status: "failed",
        timestamp: new Date().toISOString(),
        details: "Quality gate blocked outreach: Preview validation failed.",
      });
      return false; // DO NOT send outreach for invalid previews
    }

    leadRecord.previewValidated = true;
    leadRecord.crmStatus = "PREVIEW_READY";
    leadRecord.timeline.push({
      stage: "PREVIEW_VALIDATION",
      status: "completed",
      timestamp: new Date().toISOString(),
      details: `Preview verified. Quality score: ${valResp.result.score}`,
    });

    await crmRepository.updateLeadStatus(
      lead.leadId,
      "PREVIEW_READY",
      `Preview generated and validated: ${leadRecord.previewUrl}`,
      "system",
      undefined,
      undefined,
      userId
    );

    return true;
  }

  private async createVerifiedOutreach(run: AutonomousPipelineRun, leadRecord: LeadExecutionRecord,
    lead: { leadId: string; businessName: string; email?: string }, userId?: string, researchedEmail?: string): Promise<void> {
    if (leadRecord.terminalOutcome || ["paused", "cancelled"].includes(run.status)) return;
    // ─── STAGE 8: OUTREACH DRAFT ─────────────────────────────────────────
    leadRecord.currentStage = "OUTREACH_DRAFT";

    // Validate email exists; never invent email addresses
    const recipientEmail = lead.email || researchedEmail || "";
    if (!recipientEmail || !recipientEmail.includes("@")) {
      leadRecord.status = "skipped";
      leadRecord.terminalReason = "UNREACHABLE_NO_EMAIL";
      leadRecord.timeline.push({
        stage: "OUTREACH_DRAFT",
        status: "skipped",
        timestamp: new Date().toISOString(),
        details: "Skipped outreach: No valid email address found for business.",
      });
      return;
    }

    const draftResp = await this.executeResearchCheckedTool(run, {
      tool: "create_outreach",
      requestId: `req_draft_${lead.leadId}`,
      taskId: run.taskId,
      tenantId: run.tenantId,
      userId: run.userId || undefined,
      input: {
        leadId: lead.leadId,
        lead,
        previewId: leadRecord.previewId,
      },
    });

    if (!draftResp.success || !draftResp.result?.outreachId) {
      leadRecord.status = "failed";
      leadRecord.error = "Failed to create outreach draft";
      run.stats.failed += 1;
      return;
    }

    leadRecord.outreachId = draftResp.result.outreachId;
    leadRecord.outreachSubject = draftResp.result.subject;
    leadRecord.outreachBody = draftResp.result.body;
    leadRecord.email = recipientEmail;

    // Invariant: Draft creation enforces requiresHumanApproval = true
    run.stats.outreachDrafted += 1;

    // ─── STAGE 9: HUMAN APPROVAL REGISTRATION ────────────────────────────
    leadRecord.currentStage = "HUMAN_APPROVAL";
    leadRecord.status = "waiting_approval";
    leadRecord.approvalStatus = "PENDING_HUMAN_APPROVAL";
    run.stats.pendingApproval += 1;

    await this.assertResearchLease(run);
    await approvalGate.registerDraft({
      pipelineRunId: run.pipelineRunId,
      leadId: lead.leadId,
      outreachId: draftResp.result.outreachId,
      businessName: lead.businessName,
      recipientEmail,
      subject: draftResp.result.subject || `Website upgrade for ${lead.businessName}`,
      body: draftResp.result.body || "",
      previewUrl: leadRecord.previewUrl,
      qualificationScore: leadRecord.qualificationScore,
      auditHighlights: [`Score: ${leadRecord.auditScore}`],
      tenantId: run.tenantId,
      userId: run.userId || undefined,
    });

    leadRecord.crmStatus = "OUTREACH_DRAFTED";
    leadRecord.timeline.push({
      stage: "HUMAN_APPROVAL",
      status: "waiting_approval",
      timestamp: new Date().toISOString(),
      details: "Outreach draft created. Paused awaiting explicit human approval.",
    });

    await crmRepository.updateLeadStatus(
      lead.leadId,
      "OUTREACH_DRAFTED",
      "Outreach draft generated. Awaiting human approval before Gmail send.",
      "system",
      undefined,
      undefined,
      userId
    );

  }

  /** Consume the owned approved result; never repeat discovery, research or generation. */
  public async resumeResearch(runId: string, tenantId: string): Promise<AutonomousPipelineRun> {
    const run = this.runs.get(runId);
    if (!tenantId.trim() || (run && run.tenantId !== tenantId)) throw new Error("Owned pipeline run not found");
    const key = JSON.stringify([tenantId, runId]);
    const active = this.researchResumes.get(key);
    if (active) return active;
    const task = (async () => {
      const claim = await claimAutonomousResearch(runId, tenantId);
      if (!claim) {
        const stored = await readAutonomousRun(runId, tenantId);
        if (!stored) throw new Error("Owned pipeline run not found");
        return stored;
      }
      this.runs.set(runId, claim.run);
      this.runRevisions.set(runId, claim.revision);
      this.researchLeaseTokens.set(runId, claim.token);
      try { return await this.consumeApprovedResearch(claim.run, tenantId); }
      finally {
        this.researchLeaseTokens.delete(runId);
        await releaseAutonomousResearchLease(runId, tenantId, claim.token);
      }
    })();
    this.researchResumes.set(key, task);
    try { return await task; } finally { this.researchResumes.delete(key); }
  }

  private async consumeApprovedResearch(run: AutonomousPipelineRun, tenantId: string): Promise<AutonomousPipelineRun> {
    const { readResearchObservation } = await import("../orchestration/researchObservation");
    for (const record of Object.values(run.leads)) {
      if (!record.generationHold) continue;
      if (record.terminalOutcome) { delete record.generationHold; continue; }
      const observed = await readResearchObservation(record.generationHold.researchId, { kind: "automation", tenantId });
      await this.assertResearchLease(run);
      if (["paused", "cancelled"].includes(run.status)) return run;
      if (record.terminalOutcome) { delete record.generationHold; continue; }
      if (!observed) throw new Error("Original owned research no longer available");
      if (["FAILED", "REJECTED", "CANCELLED"].includes(observed.status)) {
        record.status = "failed"; record.error = "Approved research rejected or generation recovery failed";
        delete record.generationHold; run.stats.failed++;
        continue;
      }
      if (!["READY", "REPAIRED"].includes(observed.status)) continue;
      const result = observed.result;
      if (!result?.success || !("preview" in result) || !result.preview?.id || !result.preview.url || result.leadId !== record.leadId) {
        throw new Error("Reviewed research handoff does not match the original lead");
      }
      record.previewId = result.preview.id; record.previewUrl = result.preview.url;
      record.status = "running"; delete record.generationHold; run.stats.previewsGenerated++;
      try {
        if (await this.validateGeneratedPreview(run, record, record, run.userId || undefined)) {
          await this.createVerifiedOutreach(run, record, record, run.userId || undefined);
        }
      } catch {
        record.status = "failed"; record.error = "Approved preview continuation failed; administrator review required";
        run.stats.failed++;
      }
    }
    const records = Object.values(run.leads);
    const hold = records.find(record => record.generationHold);
    if (hold) run.status = hold.generationHold?.status === "WAITING_HUMAN_APPROVAL" ? "waiting_research_approval" : "research_required";
    else if (records.some(record => record.status === "waiting_approval")) run.status = "waiting_approval";
    else if (records.some(record => record.status === "failed")) run.status = "partial_success";
    else { run.status = "completed"; run.completedAt = new Date().toISOString(); }
    run.updatedAt = new Date().toISOString();
    await this.checkpoint(run);
    return run;
  }

  /**
   * Dispatches an approved outreach draft via Gmail.
   * STRICTLY gates on human approval verification:
   * approvalStatus must be APPROVED or READY_TO_SEND.
   */
  public async executeApprovedSend(
    pipelineRunId: string,
    leadId: string,
    outreachId: string,
    options: { approvedBy?: string; userId?: string } = {}
  ): Promise<{ success: boolean; messageId?: string; error?: string; isSimulated?: boolean }> {
    const run = this.runs.get(pipelineRunId);
    const leadRecord = run?.leads[leadId];

    // 1. Strict Human Approval Gate Check
    const effectiveUserId = options.userId || leadRecord?.userId || run?.userId || run?.tenantId || undefined;
    if (!effectiveUserId) throw new Error("Trusted send owner required");
    const approvalRecord = await approvalGate.getStoredApprovalRecord(outreachId, effectiveUserId);
    if (!approvalRecord || approvalRecord.pipelineRunId !== pipelineRunId || approvalRecord.leadId !== leadId) {
      throw new Error("Send must match the original owned approval, run and lead");
    }
    if (approvalRecord?.status === "SENT") {
      return { success: false, error: "Duplicate send prevented: Outreach email has already been sent." };
    }

    const canSend = approvalGate.canSend(outreachId);
    if (!canSend) {
      throw new Error(`Safety Invariant Violation: Outreach '${outreachId}' has not received explicit human approval. Dispatch rejected.`);
    }

    // 2. Check if lead opted out (DO_NOT_CONTACT)
    const crmState = await crmRepository.getLeadCRMState(leadId, effectiveUserId);
    if (crmState && crmState.status === "DO_NOT_CONTACT") {
      throw new Error("Pre-flight check failed: Lead is marked as DO_NOT_CONTACT.");
    }

    // 3. Dispatch via existing Gmail integration
    const sendResult = await GmailEmailProvider.sendOutreachEmail(outreachId, {
      userId: effectiveUserId,
    });

    if (!sendResult.success) {
      const errMsg = sendResult.error?.message || "Gmail dispatch failed";
      if (leadRecord) {
        leadRecord.status = "failed";
        leadRecord.error = errMsg;
        leadRecord.timeline.push({
          stage: "GMAIL_SEND",
          status: "failed",
          timestamp: new Date().toISOString(),
          details: errMsg,
        });
      }
      return { success: false, error: errMsg };
    }

    // 4. Update approval gate and lead record
    if (sendResult.isSimulated) {
      return { success: true, messageId: sendResult.messageId, isSimulated: true };
    }
    if (!sendResult.messageId?.trim()) return { success: false, error: "No verified Gmail message ID; delivery reconciliation required." };
    const messageId = sendResult.messageId;
    approvalGate.markSent(outreachId, messageId);

    if (leadRecord) {
      leadRecord.currentStage = "WAIT_REPLY";
      leadRecord.status = "running";
      leadRecord.approvalStatus = "SENT";
      leadRecord.gmailMessageId = messageId;
      leadRecord.sentAt = new Date().toISOString();
      leadRecord.crmStatus = "OUTREACH_SENT";
      leadRecord.timeline.push({
        stage: "GMAIL_SEND",
        status: "completed",
        timestamp: new Date().toISOString(),
        details: `Dispatched via Gmail. Message ID: ${messageId}`,
      });
    }

    if (run) {
      run.stats.approved += 1;
      run.stats.sent += 1;
      run.stats.pendingApproval = Math.max(0, run.stats.pendingApproval - 1);
      run.updatedAt = new Date().toISOString();
      await this.reportProgressToCeo(pipelineRunId);
    }

    return { success: true, messageId };
  }

  /**
   * Ingests and processes an inbound reply from a prospective customer.
   * Pipes to reply intelligence, updates CRM, handles opt-outs, and routes meeting intent.
   */
  public async ingestReply(payload: {
    pipelineRunId?: string;
    leadId: string;
    messageText: string;
    senderEmail?: string;
    messageId?: string;
    userId?: string;
  }): Promise<{
    success: boolean;
    intent: string;
    crmStatus: string;
    nextAction: string;
  }> {
    const dedupeKey = payload.messageId || `${payload.leadId}_${payload.messageText.slice(0, 30)}`;
    if (this.processedReplyIds.has(dedupeKey)) {
      return {
        success: true,
        intent: "DUPLICATE",
        crmStatus: "REPLIED",
        nextAction: "Duplicate reply already processed",
      };
    }
    this.processedReplyIds.add(dedupeKey);

    const run = payload.pipelineRunId ? this.runs.get(payload.pipelineRunId) : undefined;
    const leadRecord = run?.leads[payload.leadId];
    const effectiveUserId = payload.userId || leadRecord?.userId || run?.userId || run?.tenantId || undefined;

    // Analyze reply via opsToolExecutor
    const analysisResp = await opsToolExecutor.executeTool({
      tool: "analyze_reply",
      requestId: `req_reply_${payload.leadId}`,
      taskId: run?.taskId || `task_reply_${Date.now()}`,
      tenantId: run?.tenantId,
      userId: effectiveUserId,
      input: {
        messageText: payload.messageText,
        leadId: payload.leadId,
      },
    });

    if (!analysisResp.success || !analysisResp.result) {
      throw new Error(`Reply analysis failed: ${analysisResp.errors.join("; ")}`);
    }

    const { intent, sentiment, recommendedAction } = analysisResp.result;

    if (leadRecord) {
      leadRecord.currentStage = "REPLY_INTELLIGENCE";
      leadRecord.replyReceived = true;
      leadRecord.replyIntent = intent;
      leadRecord.replySentiment = sentiment;
    }

    if (run) {
      run.stats.repliesReceived += 1;
    }

    let nextCrmStatus = "REPLIED";

    // ─── ROUTING BASED ON REPLY INTENT ───────────────────────────────────
    if (intent === "DO_NOT_CONTACT") {
      // Opt-out signal: strictly transition to DO_NOT_CONTACT and halt all follow-ups
      nextCrmStatus = "DO_NOT_CONTACT";
      if (leadRecord) {
        leadRecord.crmStatus = "DO_NOT_CONTACT";
        leadRecord.terminalOutcome = "LOST";
        leadRecord.terminalReason = "Customer requested opt-out (DO_NOT_CONTACT)";
        leadRecord.timeline.push({
          stage: "REPLY_INTELLIGENCE",
          status: "completed",
          timestamp: new Date().toISOString(),
          details: "Opt-out received: Lead marked DO_NOT_CONTACT. All follow-ups cancelled.",
        });
      }
      if (run) run.stats.lost += 1;

      await crmRepository.updateLeadStatus(
        payload.leadId,
        "DO_NOT_CONTACT",
        "Opt-out reply received: DO_NOT_CONTACT",
        "ai_classification",
        undefined,
        undefined,
        effectiveUserId
      );
    } else if (
      intent === "INTERESTED" ||
      intent === "ASKING_FOR_CALL" ||
      intent === "ASKING_FOR_DEMO"
    ) {
      // Meeting / Conversion intent: route to MEETING_REQUESTED in CRM
      nextCrmStatus = "MEETING_REQUESTED";
      if (leadRecord) {
        leadRecord.crmStatus = "MEETING_REQUESTED";
        leadRecord.meetingScheduled = true;
        leadRecord.currentStage = "MEETING";
        leadRecord.timeline.push({
          stage: "MEETING",
          status: "completed",
          timestamp: new Date().toISOString(),
          details: `Prospect indicated meeting interest: ${intent}`,
        });
      }
      if (run) {
        run.stats.interested += 1;
        run.stats.meetingsScheduled += 1;
      }

      await crmRepository.updateLeadStatus(
        payload.leadId,
        "MEETING_REQUESTED",
        `Meeting interest indicated: ${intent}`,
        "ai_classification",
        undefined,
        undefined,
        effectiveUserId
      );
    } else if (intent === "NOT_INTERESTED") {
      nextCrmStatus = "NOT_INTERESTED";
      if (leadRecord) {
        leadRecord.crmStatus = "NOT_INTERESTED";
        leadRecord.terminalOutcome = "LOST";
        leadRecord.terminalReason = "Prospect replied not interested";
        leadRecord.timeline.push({
          stage: "REPLY_INTELLIGENCE",
          status: "completed",
          timestamp: new Date().toISOString(),
          details: "Prospect expressed no interest.",
        });
      }
      if (run) run.stats.lost += 1;

      await crmRepository.updateLeadStatus(
        payload.leadId,
        "NOT_INTERESTED",
        "Prospect replied not interested",
        "ai_classification",
        undefined,
        undefined,
        effectiveUserId
      );
    } else {
      // Questions / price inquiries: schedule follow-up if not opted out
      nextCrmStatus = "FOLLOW_UP";
      const crmState = await crmRepository.getLeadCRMState(payload.leadId, effectiveUserId);
      if (crmState && crmState.status !== "DO_NOT_CONTACT") {
        const followUpResp = await opsToolExecutor.executeTool({
          tool: "schedule_followup",
          requestId: `req_followup_${payload.leadId}`,
          taskId: run?.taskId || `task_followup_${Date.now()}`,
          tenantId: run?.tenantId,
          userId: effectiveUserId,
          input: {
            leadId: payload.leadId,
            delayDays: 3,
          },
        });

        if (followUpResp.success && followUpResp.result?.scheduled) {
          if (leadRecord) {
            leadRecord.followUpScheduled = true;
            leadRecord.followUpJobId = followUpResp.result.jobId;
            leadRecord.currentStage = "FOLLOW_UP";
            leadRecord.timeline.push({
              stage: "FOLLOW_UP",
              status: "completed",
              timestamp: new Date().toISOString(),
              details: `Follow-up queued for 3 days later. Job: ${followUpResp.result.jobId}`,
            });
          }
          if (run) run.stats.followUpsScheduled += 1;
        }
      }

      await crmRepository.updateLeadStatus(
        payload.leadId,
        "FOLLOW_UP",
        `Reply received (${intent}). Follow-up queued.`,
        "ai_classification",
        undefined,
        undefined,
        effectiveUserId
      );
    }

    if (run) {
      run.updatedAt = new Date().toISOString();
      await this.reportProgressToCeo(run.pipelineRunId);
    }

    return {
      success: true,
      intent,
      crmStatus: nextCrmStatus,
      nextAction: recommendedAction || "Updated CRM state",
    };
  }

  /**
   * Marks a lead as WON or LOST (terminal lifecycle state).
   */
  public async markTerminalOutcome(
    pipelineRunIdOrParams:
      | string
      | {
          pipelineRunId: string;
          leadId: string;
          outcome: "WON" | "LOST";
          notes?: string;
          reason?: string;
          userId?: string;
        },
    leadIdParam?: string,
    outcomeParam?: "WON" | "LOST",
    reasonParam?: string,
    userIdParam?: string
  ): Promise<{ success: boolean; leadRecord?: LeadExecutionRecord }> {
    let pipelineRunId: string;
    let leadId: string;
    let outcome: "WON" | "LOST";
    let reason: string;
    let userId: string | undefined;

    if (typeof pipelineRunIdOrParams === "object") {
      pipelineRunId = pipelineRunIdOrParams.pipelineRunId;
      leadId = pipelineRunIdOrParams.leadId;
      outcome = pipelineRunIdOrParams.outcome;
      reason = pipelineRunIdOrParams.notes || pipelineRunIdOrParams.reason || `Marked ${outcome}`;
      userId = pipelineRunIdOrParams.userId;
    } else {
      pipelineRunId = pipelineRunIdOrParams;
      leadId = leadIdParam!;
      outcome = outcomeParam!;
      reason = reasonParam || `Marked ${outcome}`;
      userId = userIdParam;
    }

    const run = this.runs.get(pipelineRunId);
    const leadRecord = run?.leads[leadId];

    if (leadRecord) {
      leadRecord.terminalOutcome = outcome;
      leadRecord.terminalReason = reason;
      leadRecord.crmStatus = outcome;
      leadRecord.currentStage = "TERMINAL";
      leadRecord.status = outcome === "WON" ? "completed" : "skipped";
      leadRecord.timeline.push({
        stage: "TERMINAL",
        status: outcome === "WON" ? "completed" : "skipped",
        timestamp: new Date().toISOString(),
        details: `Marked ${outcome}: ${reason}`,
      });
    }

    if (run) {
      if (outcome === "WON") run.stats.won += 1;
      else run.stats.lost += 1;
      run.updatedAt = new Date().toISOString();
      await this.reportProgressToCeo(pipelineRunId);
    }

    await crmRepository.updateLeadStatus(
      leadId,
      outcome,
      reason,
      "admin",
      undefined,
      undefined,
      userId
    );

    return { success: true, leadRecord };
  }

  /**
   * Reports consolidated pipeline progress to the WebsiteBanja CEO memory layer.
   */
  public async reportProgressToCeo(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) return;
    await this.checkpoint(run);

    const summary = `Autonomous Pipeline Report: ${run.stats.discovered} discovered, ${run.stats.qualified} qualified, ${run.stats.previewsGenerated} previews built, ${run.stats.outreachDrafted} drafts created, ${run.stats.pendingApproval} awaiting human approval, ${run.stats.sent} sent, ${run.stats.repliesReceived} replies, ${run.stats.meetingsScheduled} meetings, ${run.stats.won} won, ${run.stats.lost} lost.`;

    await opsToolExecutor.executeTool({
      tool: "report_to_ceo",
      requestId: `req_rep_${runId}`,
      taskId: run.taskId,
      tenantId: run.tenantId,
      userId: run.userId || undefined,
      input: {
        status: run.status,
        summary,
        stats: run.stats,
        keyLearnings: [
          `Niche: ${run.criteria.niche}, Location: ${run.criteria.location}`,
          `Qualified ${run.stats.qualified}/${run.stats.discovered} leads (${Math.round((run.stats.qualified / Math.max(1, run.stats.discovered)) * 100)}%)`,
          `Preview decision: ${run.stats.previewsGenerated} generated, ${run.stats.previewsSkippedGoodWebsite} skipped due to acceptable website.`,
        ],
      },
    });

    emitAgentEvent({
      agent: "executive",
      event: "pipeline.completed",
      requestId: runId,
      metadata: {
        summary,
        status: run.status,
      },
    });
  }

  /**
   * Returns a specific pipeline run by ID.
   */
  public getRun(runId: string): AutonomousPipelineRun | undefined {
    return this.runs.get(runId);
  }

  private async checkpoint(run: AutonomousPipelineRun): Promise<void> {
    const revision = this.runRevisions.get(run.pipelineRunId);
    if (revision === undefined) throw new Error("Durable autonomous execution revision missing");
    this.runRevisions.set(run.pipelineRunId, await checkpointAutonomousRun(run, revision, this.researchLeaseTokens.get(run.pipelineRunId)));
  }

  private async assertResearchLease(run: AutonomousPipelineRun): Promise<void> {
    const token = this.researchLeaseTokens.get(run.pipelineRunId);
    if (token) await assertAutonomousResearchLease(run.pipelineRunId, run.tenantId || "", token);
  }

  private async executeResearchCheckedTool(run: AutonomousPipelineRun, request: Parameters<typeof opsToolExecutor.executeTool>[0]) {
    await this.assertResearchLease(run);
    const result = await opsToolExecutor.executeTool(request);
    await this.assertResearchLease(run);
    return result;
  }

  public readStoredRun(runId: string, tenantId: string): Promise<AutonomousPipelineRun | undefined> {
    return readAutonomousRun(runId, tenantId);
  }

  public listStoredRuns(limit: number, tenantId: string): Promise<AutonomousPipelineRun[]> {
    return listAutonomousRuns(tenantId, limit);
  }

  /**
   * Lists recent pipeline runs.
   */
  public listRuns(limit = 20, tenantId?: string | null): AutonomousPipelineRun[] {
    let allRuns = Array.from(this.runs.values());
    if (tenantId) {
      allRuns = allRuns.filter((r) => r.tenantId === tenantId);
    }
    return allRuns.slice(-limit).reverse();
  }

  /**
   * Resets in-memory pipeline state (used for isolated test suites).
   */
  public clear(): void {
    this.runs.clear();
    this.processedReplyIds.clear();
    this.runRevisions.clear();
    this.researchLeaseTokens.clear();
  }
}

export const autonomousPipeline = AutonomousPipeline.getInstance();

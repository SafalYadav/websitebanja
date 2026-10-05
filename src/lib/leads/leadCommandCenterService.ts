// src/lib/leads/leadCommandCenterService.ts
/**
 * WebsiteBanja Lead Command Center — Read Model & Aggregation Service
 * Phase: Phase 15 (Lead Command Center)
 *
 * Unifies Phase 8–14 services into a high-performance, non-duplicative
 * read-only view layer. Authoritative canonical state remains in the
 * respective Phase 8–14 repositories.
 */

import fs from "fs";
import path from "path";
import { leadRepository } from "@/lib/discovery/leadRepository";
import { auditRepository } from "@/lib/audit/auditRepository";
import { outreachRepository } from "@/lib/outreach/outreachRepository";
import { crmRepository } from "@/lib/crm/crmRepository";
import { PipelineQueue } from "@/lib/automation/pipelineQueue";
import { FollowUpQueue } from "@/lib/automation/followUpQueue";
import { AnalyticsService } from "@/lib/analytics/analyticsService";
import type {
  CommandCenterKPIs,
  CommandCenterLead,
  LeadDetailView,
  LeadFilterCriteria,
  LeadReviewItem,
  LeadTimelineEvent,
} from "./types";
import type { StoredPreviewRecord } from "@/lib/personalization/types";
import type { BusinessLead } from "@/lib/discovery/types";
import type { LeadAuditReport } from "@/lib/audit/types";
import type { OutreachRecord } from "@/lib/outreach/types";
import type { LeadCRMState } from "@/lib/crm/types";
import type { PipelineRun, PipelineStage, PipelineStatus } from "@/lib/automation/pipelineTypes";

const PREVIEW_MANIFEST_FILE = path.resolve(process.cwd(), "scratch/previews/manifest.json");
const PREVIEWS_DIR = path.resolve(process.cwd(), "scratch/previews");

function readStoredPreviews(): StoredPreviewRecord[] {
  try {
    if (!fs.existsSync(PREVIEW_MANIFEST_FILE)) return [];
    const content = fs.readFileSync(PREVIEW_MANIFEST_FILE, "utf-8");
    return JSON.parse(content) as StoredPreviewRecord[];
  } catch (err) {
    console.warn("[LeadCommandCenterService] Failed to read preview manifest:", err);
    return [];
  }
}

export class LeadCommandCenterService {
  /**
   * Lists enriched Command Center leads matching search, filter, and pagination.
   */
  static async listCommandCenterLeads(criteria: LeadFilterCriteria = {}): Promise<{
    leads: CommandCenterLead[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
    kpis: CommandCenterKPIs;
    facets: {
      industries: Array<{ industry: string; count: number }>;
      stages: Array<{ stage: string; count: number }>;
      presets: Record<string, number>;
    };
  }> {
    const userId = criteria.userId;

    // 1. Ingest raw canonical sources
    const [rawLeads, rawAudits, storedPreviews, rawOutreach, rawRuns, followUps, analytics] =
      await Promise.all([
        leadRepository.getAllLeadsForUser(userId),
        auditRepository.listAudits(userId),
        readStoredPreviews(),
        outreachRepository.listOutreachRecords({ userId }),
        PipelineQueue.listPipelineRuns(),
        FollowUpQueue.listFollowUps(),
        AnalyticsService.getAnalyticsDashboard("all").catch(() => null),
      ]);

    // 2. Build indexed lookups for O(1) correlation
    const auditsByLeadId = new Map<string, LeadAuditReport>();
    for (const a of rawAudits) {
      if (a.leadId) auditsByLeadId.set(a.leadId, a);
    }

    const previewsByLeadId = new Map<string, StoredPreviewRecord>();
    for (const p of storedPreviews) {
      if (p.leadId) previewsByLeadId.set(p.leadId, p);
    }

    const outreachByLeadId = new Map<string, OutreachRecord>();
    for (const o of rawOutreach) {
      if (o.leadId) {
        // Keep latest outreach record
        const existing = outreachByLeadId.get(o.leadId);
        if (!existing || new Date(o.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
          outreachByLeadId.set(o.leadId, o);
        }
      }
    }

    // Lead progress mapped from most recent pipeline run
    const leadRunProgress = new Map<
      string,
      { run: PipelineRun; stage: PipelineStage; status: string; retries: number; error?: string }
    >();

    for (const run of rawRuns) {
      if (run.leads) {
        for (const [leadId, leadData] of Object.entries(run.leads)) {
          if (!leadRunProgress.has(leadId)) {
            leadRunProgress.set(leadId, {
              run,
              stage: leadData.currentStage,
              status: leadData.status,
              retries: leadData.retryCount || 0,
              error:
                leadData.lastError ||
                (leadData.errorHistory && leadData.errorHistory.length > 0
                  ? typeof leadData.errorHistory[leadData.errorHistory.length - 1] === "string"
                    ? (leadData.errorHistory[leadData.errorHistory.length - 1] as any)
                    : leadData.errorHistory[leadData.errorHistory.length - 1].error
                  : undefined),
            });
          }
        }
      }
    }

    // Follow-ups mapped by leadId
    const followUpsByLeadId = new Map<string, (typeof followUps)[0]>();
    for (const fu of followUps) {
      if (fu.leadId) {
        const existing = followUpsByLeadId.get(fu.leadId);
        if (!existing || new Date(fu.scheduledAt).getTime() > new Date(existing.scheduledAt).getTime()) {
          followUpsByLeadId.set(fu.leadId, fu);
        }
      }
    }

    // 3. Assemble unified CommandCenterLead list
    const enrichedLeads: CommandCenterLead[] = [];
    const industryCounts: Record<string, number> = {};
    const stageCounts: Record<string, number> = {};

    for (const lead of rawLeads) {
      const audit = auditsByLeadId.get(lead.leadId);
      const preview = previewsByLeadId.get(lead.leadId);
      const outreach = outreachByLeadId.get(lead.leadId);
      const runInfo = leadRunProgress.get(lead.leadId);
      const followUp = followUpsByLeadId.get(lead.leadId);

      // Determine pipeline stage
      let pipelineStage: PipelineStage = "DISCOVERY";
      let pipelineStatus: PipelineStatus = "COMPLETED";
      let hasError = false;
      let errorMessage: string | undefined = undefined;

      if (runInfo) {
        pipelineStage = runInfo.stage;
        pipelineStatus = runInfo.run.status;
        hasError = runInfo.status === "failed";
        errorMessage = runInfo.error;
      } else {
        // Fallback inference from existing artifacts
        if (outreach && (outreach.status === "simulated_sent" || (outreach as any).status === "sent")) {
          pipelineStage = "WAITING_FOR_REPLY";
        } else if (outreach && (outreach.status === "approved" || outreach.status === "review")) {
          pipelineStage = "HUMAN_APPROVAL";
        } else if (outreach && outreach.status === "draft") {
          pipelineStage = "OUTREACH_DRAFT";
        } else if (preview) {
          pipelineStage = "OUTREACH_DRAFT";
        } else if (audit) {
          pipelineStage = "PREVIEW_GENERATION";
        } else if (lead.qualificationStatus === "QUALIFIED") {
          pipelineStage = "RESEARCH_AUDIT";
        } else {
          pipelineStage = "DISCOVERY";
        }
      }

      // Preview status
      let previewStatus: CommandCenterLead["previewStatus"] = "none";
      if (preview) {
        previewStatus = "ready";
      } else if (pipelineStage === "PREVIEW_GENERATION") {
        previewStatus = hasError ? "failed" : "generating";
      }

      // Outreach status
      let outreachStatus: CommandCenterLead["outreachStatus"] = "none";
      if (outreach) {
        outreachStatus = outreach.status as CommandCenterLead["outreachStatus"];
      }

      // CRM Status
      let crmStatus = "DISCOVERED" as CommandCenterLead["crmStatus"];
      if (outreach && (outreach.status === "simulated_sent" || (outreach as any).status === "sent")) {
        crmStatus = "OUTREACH_SENT";
      } else if (preview) {
        crmStatus = "PREVIEW_READY";
      } else if (lead.qualificationStatus === "QUALIFIED") {
        crmStatus = "QUALIFIED";
      }

      // Calculate lastActivityAt
      const timestamps = [
        lead.discoveredAt,
        audit?.auditedAt,
        preview?.generatedAt,
        outreach?.simulatedAt,
        outreach?.updatedAt,
        outreach?.createdAt,
        runInfo?.run?.updatedAt,
      ]
        .filter(Boolean)
        .map((ts) => new Date(ts as string).getTime());

      const lastActivityAt =
        timestamps.length > 0
          ? new Date(Math.max(...timestamps)).toISOString()
          : lead.discoveredAt || new Date().toISOString();

      const enriched: CommandCenterLead = {
        leadId: lead.leadId,
        businessName: lead.businessName,
        industry: lead.industry || lead.category || "General",
        category: lead.category || "business",
        location: [lead.city, lead.state].filter(Boolean).join(", ") || lead.address || "Vadodara, Gujarat",
        city: lead.city,
        state: lead.state,
        website: lead.website,
        websiteStatus: lead.websiteStatus || "missing",
        phone: lead.phone,
        email: lead.email,
        source: lead.source || "local_provider",
        qualificationStatus: lead.qualificationStatus,
        qualificationScore: lead.qualificationScore || 0,
        opportunityScore: lead.opportunityScore || audit?.opportunity?.score || 0,
        reasonCodes: lead.reasonCodes || [],
        runId: runInfo?.run?.id,
        pipelineStage,
        pipelineStatus,
        retryCount: runInfo?.retries || 0,
        maxAttempts: 3,
        hasError,
        errorMessage,
        auditStatus: audit ? "completed" : pipelineStage === "RESEARCH_AUDIT" ? "in_progress" : "none",
        auditOpportunityScore: audit?.opportunity?.score,
        previewStatus,
        previewId: preview?.previewId,
        previewUrl: preview?.previewUrl,
        outreachStatus,
        outreachId: outreach?.outreachId,
        outreachChannel: outreach?.channel,
        crmStatus,
        followUpStatus: followUp ? (followUp.status as any) : "none",
        followUpNumber: followUp?.followUpNumber,
        followUpDueAt: followUp?.dueAt,
        discoveredAt: lead.discoveredAt || new Date().toISOString(),
        lastActivityAt,
        userId: lead.userId,
      };

      enrichedLeads.push(enriched);

      // Track facets
      industryCounts[enriched.industry] = (industryCounts[enriched.industry] || 0) + 1;
      stageCounts[enriched.pipelineStage] = (stageCounts[enriched.pipelineStage] || 0) + 1;
    }

    // 4. Compute High-Level KPIs
    const nowTime = Date.now();
    let totalQualified = 0;
    let previewReady = 0;
    let outreachReady = 0;
    let awaitingReply = 0;
    let interested = 0;
    let meetingsRequested = 0;
    let won = 0;
    let followUpsDue = 0;
    let failed = 0;
    let paused = 0;

    for (const l of enrichedLeads) {
      if (l.qualificationStatus === "QUALIFIED") totalQualified++;
      if (l.previewStatus === "ready") previewReady++;
      if (l.outreachStatus === "drafted" || l.outreachStatus === "review" || l.outreachStatus === "approved") {
        outreachReady++;
      }
      if (l.pipelineStage === "WAITING_FOR_REPLY" || l.crmStatus === "OUTREACH_SENT") {
        awaitingReply++;
      }
      if (l.crmStatus === "INTERESTED" || l.replyIntent === "INTERESTED") interested++;
      if (l.crmStatus === "MEETING_REQUESTED") meetingsRequested++;
      if (l.crmStatus === "WON") won++;
      if (l.followUpStatus === "scheduled" && l.followUpDueAt && new Date(l.followUpDueAt).getTime() <= nowTime) {
        followUpsDue++;
      }
      if (l.hasError || l.pipelineStatus === "FAILED") failed++;
      if (l.pipelineStatus === "PAUSED") paused++;
    }

    const kpis: CommandCenterKPIs = {
      totalLeads: enrichedLeads.length,
      qualifiedLeads: totalQualified,
      previewReady,
      outreachReady,
      awaitingReply,
      interested,
      meetingsRequested,
      won,
      followUpsDue,
      failed,
      paused,
      conversionRate: analytics?.funnel?.overallConversionRate ?? null,
      avgPipelineDurationMs: analytics?.performance?.avgPipelineDurationMs ?? null,
      knownEstimatedCostUsd: analytics?.cost?.knownEstimatedCostUsd ?? null,
    };

    // 5. Preset Counts
    const presetCounts: Record<string, number> = {
      all: enrichedLeads.length,
      new: enrichedLeads.filter((l) => nowTime - new Date(l.discoveredAt).getTime() <= 24 * 3600 * 1000).length,
      qualified: totalQualified,
      preview_ready: previewReady,
      outreach_ready: outreachReady,
      awaiting_reply: awaitingReply,
      interested,
      followup_due: followUpsDue,
      meetings_requested: meetingsRequested,
      won,
      failed,
      paused,
      needs_review: enrichedLeads.filter(
        (l) => l.outreachStatus === "review" || l.hasError || l.crmStatus === "DO_NOT_CONTACT"
      ).length,
      high_opportunity: enrichedLeads.filter((l) => l.opportunityScore >= 80).length,
    };

    // 6. Apply Filter Preset
    let filtered = enrichedLeads;
    if (criteria.preset && criteria.preset !== "all") {
      switch (criteria.preset) {
        case "new":
          filtered = filtered.filter(
            (l) => nowTime - new Date(l.discoveredAt).getTime() <= 24 * 3600 * 1000
          );
          break;
        case "qualified":
          filtered = filtered.filter((l) => l.qualificationStatus === "QUALIFIED");
          break;
        case "preview_ready":
          filtered = filtered.filter((l) => l.previewStatus === "ready");
          break;
        case "outreach_ready":
          filtered = filtered.filter(
            (l) => l.outreachStatus === "drafted" || l.outreachStatus === "review" || l.outreachStatus === "approved"
          );
          break;
        case "awaiting_reply":
          filtered = filtered.filter(
            (l) => l.pipelineStage === "WAITING_FOR_REPLY" || l.crmStatus === "OUTREACH_SENT"
          );
          break;
        case "interested":
          filtered = filtered.filter((l) => l.crmStatus === "INTERESTED" || l.replyIntent === "INTERESTED");
          break;
        case "followup_due":
          filtered = filtered.filter(
            (l) => l.followUpStatus === "scheduled" && l.followUpDueAt && new Date(l.followUpDueAt).getTime() <= nowTime
          );
          break;
        case "meetings_requested":
          filtered = filtered.filter((l) => l.crmStatus === "MEETING_REQUESTED");
          break;
        case "won":
          filtered = filtered.filter((l) => l.crmStatus === "WON");
          break;
        case "failed":
          filtered = filtered.filter((l) => l.hasError || l.pipelineStatus === "FAILED");
          break;
        case "paused":
          filtered = filtered.filter((l) => l.pipelineStatus === "PAUSED");
          break;
        case "needs_review":
          filtered = filtered.filter(
            (l) => l.outreachStatus === "review" || l.hasError || l.crmStatus === "DO_NOT_CONTACT"
          );
          break;
        case "high_opportunity":
          filtered = filtered.filter((l) => l.opportunityScore >= 80);
          break;
      }
    }

    // 7. Apply Specific Field Filters
    if (criteria.stage && criteria.stage !== "ALL") {
      filtered = filtered.filter((l) => l.pipelineStage === criteria.stage);
    }
    if (criteria.industry && criteria.industry !== "ALL") {
      const indLower = criteria.industry.toLowerCase();
      filtered = filtered.filter((l) => l.industry.toLowerCase() === indLower);
    }
    if (criteria.qualification && criteria.qualification !== "ALL") {
      filtered = filtered.filter((l) => l.qualificationStatus === criteria.qualification);
    }
    if (criteria.minOpportunity !== undefined) {
      filtered = filtered.filter((l) => l.opportunityScore >= (criteria.minOpportunity || 0));
    }

    // 8. Apply Search
    if (criteria.search) {
      const q = criteria.search.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.businessName.toLowerCase().includes(q) ||
          (l.website && l.website.toLowerCase().includes(q)) ||
          l.industry.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q) ||
          l.leadId.toLowerCase().includes(q) ||
          (l.runId && l.runId.toLowerCase().includes(q)) ||
          (l.phone && l.phone.toLowerCase().includes(q)) ||
          (l.email && l.email.toLowerCase().includes(q))
      );
    }

    // 9. Apply Sorting
    const sortField = criteria.sortField || "lastActivityAt";
    const sortDir = criteria.sortDir === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === "discoveredAt" || sortField === "lastActivityAt") {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (typeof valA === "string") {
        valA = valA.toLowerCase();
        valB = (valB || "").toLowerCase();
      }

      if (valA < valB) return -1 * sortDir;
      if (valA > valB) return 1 * sortDir;
      return 0;
    });

    // 10. Apply Pagination
    const totalCount = filtered.length;
    const page = Math.max(1, criteria.page || 1);
    const limit = Math.max(1, Math.min(criteria.limit || 25, 100));
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));
    const startIndex = (page - 1) * limit;
    const paginatedLeads = filtered.slice(startIndex, startIndex + limit);

    return {
      leads: paginatedLeads,
      totalCount,
      page,
      limit,
      totalPages,
      kpis,
      facets: {
        industries: Object.entries(industryCounts).map(([industry, count]) => ({ industry, count })),
        stages: Object.entries(stageCounts).map(([stage, count]) => ({ stage, count })),
        presets: presetCounts,
      },
    };
  }

  /**
   * Retrieves full unified 8-section Lead Detail View.
   */
  static async getLeadDetail(leadId: string, userId?: string): Promise<LeadDetailView | null> {
    const [lead, audit, rawPreviews, outreachList, crmState, runs, aiOps] = await Promise.all([
      leadRepository.findLeadById(leadId, userId),
      auditRepository.findAuditByLeadId(leadId, userId),
      readStoredPreviews(),
      outreachRepository.findOutreachByLeadId(leadId, userId),
      crmRepository.getLeadCRMState(leadId, userId),
      PipelineQueue.listPipelineRuns(),
      AnalyticsService.getAIOperations("all"),
    ]);

    if (!lead) return null;

    // Preview record
    const preview = rawPreviews.find((p) => p.leadId === leadId);
    let hasArtifact = false;
    if (preview) {
      const artifactPath = path.join(PREVIEWS_DIR, `${preview.previewId}.json`);
      hasArtifact = fs.existsSync(artifactPath);
    }

    // Outreach record (most recent)
    const outreach = outreachList.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    // Pipeline Run info
    let leadRun: PipelineRun | undefined;
    let leadProgress: any | undefined;
    for (const r of runs) {
      if (r.leads && r.leads[leadId]) {
        leadRun = r;
        leadProgress = r.leads[leadId];
        break;
      }
    }

    // AI operations for this lead or stage
    const leadOps = aiOps.filter(
      (op) =>
        (leadRun && op.id.includes(leadRun.id)) ||
        (audit && op.id.includes(audit.auditId)) ||
        (preview && op.id.includes(preview.previewId)) ||
        (outreach && op.id.includes(outreach.outreachId))
    );

    const totalTokens = leadOps.reduce((acc, o) => acc + o.inputTokens + o.outputTokens, 0);
    const totalLatency = leadOps.reduce((acc, o) => acc + o.latencyMs, 0);
    const estCost = Number(((totalTokens / 1_000_000) * 0.25).toFixed(4));

    // Assemble Chronological Timeline
    const timeline = await this.getLeadTimeline(leadId, userId);

    return {
      profile: {
        leadId: lead.leadId,
        businessName: lead.businessName,
        industry: lead.industry || lead.category || "General",
        category: lead.category || "business",
        location: [lead.city, lead.state].filter(Boolean).join(", ") || lead.address || "Vadodara, Gujarat",
        address: lead.address,
        city: lead.city,
        state: lead.state,
        country: lead.country,
        website: lead.website,
        websiteStatus: lead.websiteStatus || "missing",
        phone: lead.phone,
        email: lead.email,
        source: lead.source || "local_provider",
        discoveredAt: lead.discoveredAt || new Date().toISOString(),
        notes: lead.notes || [],
      },
      qualification: {
        status: lead.qualificationStatus,
        score: lead.qualificationScore || 0,
        opportunityScore: lead.opportunityScore || 0,
        reasonCodes: lead.reasonCodes || [],
        opportunityReasons: lead.opportunityReasons || [],
        disqualificationReason:
          lead.qualificationStatus === "DISQUALIFIED"
            ? lead.reasonCodes.join(", ") || "Does not meet ICP requirements"
            : undefined,
      },
      audit: {
        auditId: audit?.auditId,
        status: audit ? "completed" : "none",
        opportunityScore: audit?.opportunity?.score,
        technicalFindings: (audit?.technical?.issues || []).map((i) => i.evidence || i.recommendation),
        mobileFindings: (audit?.mobile?.issues || []).map((i) => i.evidence || i.recommendation),
        seoFindings: (audit?.seo?.issues || []).map((i) => i.evidence || i.recommendation),
        uxFindings: (audit?.ux?.issues || []).map((i) => i.evidence || i.recommendation),
        conversionFindings: (audit?.conversion?.issues || []).map((i) => i.evidence || i.recommendation),
        accessibilityFindings: (audit?.accessibility?.issues || []).map((i) => i.evidence || i.recommendation),
        recommendations: audit?.recommendations || [],
        auditedAt: audit?.auditedAt,
      },
      preview: {
        previewId: preview?.previewId,
        status: preview ? "ready" : "none",
        url: preview?.previewUrl,
        qualityScore: preview?.qualityScore,
        designArchetype: preview?.designArchetype,
        sectionCount: preview ? 6 : 0,
        generatedAt: preview?.generatedAt,
        hasArtifact,
      },
      outreach: {
        outreachId: outreach?.outreachId,
        channel: outreach?.channel,
        status: outreach?.status || "none",
        subject: outreach?.subject,
        message: outreach?.message,
        recipientEmail: outreach?.business.email,
        personalizationFieldsUsed: [
          ...(outreach?.personalization?.websiteProblems || []),
          ...(outreach?.personalization?.improvements || []),
          ...(outreach?.personalization?.businessSpecificPoints || []),
        ],
        approvedAt: outreach?.approvedAt,
        simulatedAt: outreach?.simulatedAt,
      },
      crm: {
        status: crmState?.status || "DISCOVERED",
        conversationId: crmState?.activeConversation?.id,
        lastMessageAt: crmState?.activeConversation?.lastMessageAt,
        replyIntent: crmState?.latestAnalysis?.intent,
        sentiment: crmState?.latestAnalysis?.sentiment,
        urgency: crmState?.latestAnalysis?.urgency,
        confidence: crmState?.latestAnalysis?.confidence,
        summary: crmState?.latestAnalysis?.summary,
        keySignals: crmState?.latestAnalysis?.keySignals || [],
        recommendedNextAction: crmState?.nextAction?.recommendedAction,
        messagesCount: crmState?.messages?.length || 0,
      },
      pipeline: {
        runId: leadRun?.id,
        currentStage: leadProgress?.currentStage || "DISCOVERY",
        status: leadProgress?.status || "completed",
        attempt: (leadProgress?.retryCount || 0) + 1,
        retryCount: leadProgress?.retryCount || 0,
        maxAttempts: leadProgress?.maxAttempts || 3,
        errorHistory: (leadProgress?.errorHistory || []).map((e: any) =>
          typeof e === "string" ? e : e.error || JSON.stringify(e)
        ),
        createdAt: leadRun?.createdAt,
        updatedAt: leadRun?.updatedAt,
      },
      analytics: {
        operationsCount: leadOps.length,
        estimatedTokens: totalTokens,
        estimatedCostUsd: estCost > 0 ? estCost : null,
        durationMs: totalLatency > 0 ? totalLatency : null,
      },
      timeline,
    };
  }

  /**
   * Generates chronological activity stream for a lead.
   */
  static async getLeadTimeline(leadId: string, userId?: string): Promise<LeadTimelineEvent[]> {
    const events: LeadTimelineEvent[] = [];

    // 1. Lead discovery & qualification events
    const lead = await leadRepository.findLeadById(leadId, userId);
    if (lead) {
      events.push({
        id: `evt_disc_${lead.leadId}`,
        leadId,
        timestamp: lead.discoveredAt || new Date().toISOString(),
        type: "LEAD_DISCOVERED",
        title: "Lead Discovered",
        description: `Discovered business '${lead.businessName}' via ${lead.source || "local directory"}.`,
        actor: "system",
        stage: "DISCOVERY",
        metadata: { category: lead.category, score: lead.opportunityScore },
      });

      events.push({
        id: `evt_qual_${lead.leadId}`,
        leadId,
        timestamp: lead.discoveredAt || new Date().toISOString(),
        type: "LEAD_QUALIFIED",
        title: `Lead ${lead.qualificationStatus === "QUALIFIED" ? "Qualified" : "Evaluated"}`,
        description: `Qualification score: ${lead.qualificationScore}/100. Status: ${lead.qualificationStatus}.`,
        actor: "agent",
        stage: "QUALIFICATION",
        metadata: { reasons: lead.reasonCodes },
      });
    }

    // 2. Audit events
    const audit = await auditRepository.findAuditByLeadId(leadId, userId);
    if (audit) {
      events.push({
        id: `evt_audit_${audit.auditId}`,
        leadId,
        timestamp: audit.auditedAt || new Date().toISOString(),
        type: "WEBSITE_AUDITED",
        title: "Website Audit Completed",
        description: `Opportunity score evaluated at ${audit.opportunity?.score || 0}/100 across 5 dimensions.`,
        actor: "agent",
        stage: "RESEARCH_AUDIT",
        metadata: { auditId: audit.auditId, opportunityScore: audit.opportunity?.score },
      });
    }

    // 3. Preview events
    const storedPreviews = readStoredPreviews();
    const preview = storedPreviews.find((p) => p.leadId === leadId);
    if (preview) {
      events.push({
        id: `evt_prev_${preview.previewId}`,
        leadId,
        timestamp: preview.generatedAt || new Date().toISOString(),
        type: "PREVIEW_GENERATED",
        title: "Personalized Preview Created",
        description: `Bespoke website preview generated with quality score ${preview.qualityScore}/100.`,
        actor: "agent",
        stage: "PREVIEW_GENERATION",
        metadata: { previewId: preview.previewId, url: preview.previewUrl },
      });
    }

    // 4. Outreach events
    const outreachRecords = await outreachRepository.findOutreachByLeadId(leadId, userId);
    for (const o of outreachRecords) {
      events.push({
        id: `evt_draft_${o.outreachId}`,
        leadId,
        timestamp: o.createdAt,
        type: "OUTREACH_DRAFTED",
        title: "Outreach Drafted",
        description: `Personalized ${o.channel.toUpperCase()} message drafted. Status: ${o.status}.`,
        actor: "agent",
        stage: "OUTREACH_DRAFT",
        metadata: { outreachId: o.outreachId, channel: o.channel },
      });

      if (o.approvedAt) {
        events.push({
          id: `evt_appr_${o.outreachId}`,
          leadId,
          timestamp: o.approvedAt,
          type: "OUTREACH_APPROVED",
          title: "Outreach Approved",
          description: `Outreach draft approved for local dispatch.`,
          actor: "human",
          stage: "HUMAN_APPROVAL",
        });
      }

      if (o.simulatedAt) {
        events.push({
          id: `evt_sim_${o.outreachId}`,
          leadId,
          timestamp: o.simulatedAt,
          type: "OUTREACH_SIMULATED",
          title: "Outreach Simulated Sent",
          description: `Dispatched ${o.channel.toUpperCase()} message to local simulated outbox.`,
          actor: "system",
          stage: "SIMULATED_DISPATCH",
        });
      }
    }

    // 5. CRM timeline events
    const crmTimeline = await crmRepository.getTimeline(leadId);
    for (const crmEvt of crmTimeline) {
      events.push({
        id: crmEvt.id,
        leadId,
        timestamp: crmEvt.timestamp,
        type: crmEvt.type,
        title: crmEvt.type.replace(/_/g, " "),
        description: crmEvt.description,
        actor: (crmEvt.actor as any) || "agent",
        metadata: crmEvt.metadata,
      });
    }

    // 6. Pipeline Run lead timeline entries
    const runs = await PipelineQueue.listPipelineRuns();
    for (const run of runs) {
      const leadEntry = run.leads?.[leadId];
      if (leadEntry && Array.isArray(leadEntry.timeline)) {
        for (const item of leadEntry.timeline) {
          events.push({
            id: `evt_pipe_${run.id}_${item.stage}_${item.status}`,
            leadId,
            timestamp: item.timestamp,
            type: `PIPELINE_${item.stage}_${item.status.toUpperCase()}`,
            title: `Pipeline Stage: ${item.stage} (${item.status})`,
            description: item.details || `Stage ${item.stage} marked ${item.status}.`,
            actor: "system",
            stage: item.stage,
          });
        }
      }
    }

    // Deduplicate and sort chronologically (oldest first)
    const uniqueMap = new Map<string, LeadTimelineEvent>();
    for (const evt of events) {
      const key = `${evt.timestamp}_${evt.type}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, evt);
      }
    }

    return Array.from(uniqueMap.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Retrieves Human Attention / Review Queue items.
   */
  static async getReviewQueue(userId?: string): Promise<LeadReviewItem[]> {
    const items: LeadReviewItem[] = [];

    const [leads, outreachRecords, runs, crmStates] = await Promise.all([
      leadRepository.getAllLeadsForUser(userId),
      outreachRepository.listOutreachRecords({ userId }),
      PipelineQueue.listPipelineRuns(),
      crmRepository.listLeadCRMStates({ userId }),
    ]);

    const leadsById = new Map(leads.map((l) => [l.leadId, l]));

    // 1. Outreach pending approval
    for (const o of outreachRecords) {
      if (o.status === "review" || o.status === "draft") {
        const lead = leadsById.get(o.leadId);
        items.push({
          id: `rev_out_${o.outreachId}`,
          leadId: o.leadId,
          businessName: o.business.name || lead?.businessName || "Unknown Business",
          category: "outreach_approval",
          severity: "medium",
          reason: `Personalized ${o.channel.toUpperCase()} outreach draft awaiting human approval.`,
          recommendedAction: "Review message copy and approve or edit draft before dispatch.",
          timestamp: o.createdAt,
          stage: "HUMAN_APPROVAL",
          previewUrl: o.previewUrl,
          outreachId: o.outreachId,
        });
      }
    }

    // 2. Failed pipeline jobs
    for (const run of runs) {
      if (run.leads) {
        for (const [leadId, leadData] of Object.entries(run.leads)) {
          if (leadData.status === "failed") {
            const lead = leadsById.get(leadId);
            const err =
              leadData.lastError ||
              (leadData.errorHistory && leadData.errorHistory.length > 0
                ? typeof leadData.errorHistory[leadData.errorHistory.length - 1] === "string"
                  ? leadData.errorHistory[leadData.errorHistory.length - 1]
                  : leadData.errorHistory[leadData.errorHistory.length - 1].error
                : "Unknown failure in stage execution");

            items.push({
              id: `rev_job_${run.id}_${leadId}`,
              leadId,
              businessName: leadData.businessName || lead?.businessName || "Unknown Business",
              category: "failed_job",
              severity: "high",
              reason: `Stage '${leadData.currentStage}' failed after ${leadData.retryCount || 1} attempts: ${err}`,
              recommendedAction: "Inspect error log and click 'Retry' to re-attempt job execution.",
              timestamp: run.updatedAt || new Date().toISOString(),
              stage: leadData.currentStage,
            });
          }
        }
      }
    }

    // 3. Low confidence or ambiguous replies
    for (const crm of crmStates) {
      if (crm.latestAnalysis) {
        const { confidence, intent, requiresHumanReview } = crm.latestAnalysis;
        if (
          (confidence !== undefined && confidence < 0.6) ||
          intent === "UNCLEAR" ||
          intent === "CONFUSED" ||
          intent === "OTHER" ||
          requiresHumanReview
        ) {
          items.push({
            id: `rev_reply_${crm.leadId}`,
            leadId: crm.leadId,
            businessName: crm.businessName,
            category: "low_confidence_reply",
            severity: "high",
            reason: `Inbound reply classified with low confidence (${Math.round((confidence || 0) * 100)}%) or unclear intent.`,
            recommendedAction: "Open CRM conversation and manually verify prospect intent.",
            timestamp: crm.updatedAt,
            stage: "REPLY_INTELLIGENCE",
          });
        }
      }

      if (crm.status === "DO_NOT_CONTACT") {
        items.push({
          id: `rev_dnc_${crm.leadId}`,
          leadId: crm.leadId,
          businessName: crm.businessName,
          category: "do_not_contact",
          severity: "critical",
          reason: "Prospect requested unsubscribe / DO_NOT_CONTACT. All automated follow-ups aborted.",
          recommendedAction: "Confirm opt-out suppression status in CRM.",
          timestamp: crm.updatedAt,
        });
      }
    }

    // Sort by severity (critical -> high -> medium -> low) then newest timestamp
    const severityWeight: Record<string, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return items.sort((a, b) => {
      const diff = (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0);
      if (diff !== 0) return diff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  }

  /**
   * Retrieves follow-up queue jobs.
   */
  static async getFollowUpQueue(userId?: string) {
    const jobs = await FollowUpQueue.listFollowUps();
    const leads = await leadRepository.getAllLeadsForUser(userId);
    const leadsById = new Map(leads.map((l) => [l.leadId, l]));

    return jobs.map((j) => {
      const lead = leadsById.get(j.leadId);
      return {
        ...j,
        businessName: lead?.businessName || "Unknown Business",
        industry: lead?.industry || lead?.category || "General",
        location: [lead?.city, lead?.state].filter(Boolean).join(", ") || "Vadodara",
      };
    });
  }
}

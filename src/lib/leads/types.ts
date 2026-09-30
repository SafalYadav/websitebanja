// src/lib/leads/types.ts
/**
 * WebsiteBanja Lead Command Center — Unified Types & Data Contracts
 * Phase: Phase 15 (Lead Command Center)
 *
 * Unifies Phase 8 Discovery, Phase 9 Audit, Phase 10 Preview, Phase 11 Outreach,
 * Phase 12 CRM, Phase 13 Pipeline Orchestration, and Phase 14 Analytics into
 * a single coherent read-model contract.
 */

import type { PipelineStage, PipelineStatus } from "@/lib/automation/pipelineTypes";
import type { QualificationStatus, WebsiteStatus } from "@/lib/discovery/types";
import type { CRMLeadStatus } from "@/lib/crm/types";
import type { OutreachChannel, OutreachStatus } from "@/lib/outreach/types";

export type FilterPreset =
  | "all"
  | "new"
  | "qualified"
  | "preview_ready"
  | "outreach_ready"
  | "awaiting_reply"
  | "interested"
  | "followup_due"
  | "meetings_requested"
  | "won"
  | "failed"
  | "paused"
  | "needs_review"
  | "high_opportunity";

/**
 * Composite Lead Model for Command Center Table and List Views
 */
export interface CommandCenterLead {
  leadId: string;
  businessName: string;
  industry: string;
  category: string;
  location: string;
  city?: string;
  state?: string;
  website?: string;
  websiteStatus: WebsiteStatus;
  phone?: string;
  email?: string;
  source: string;

  // Qualification
  qualificationStatus: QualificationStatus;
  qualificationScore: number;
  opportunityScore: number;
  reasonCodes: string[];

  // Pipeline Execution State
  runId?: string;
  pipelineStage: PipelineStage;
  pipelineStatus: PipelineStatus;
  retryCount: number;
  maxAttempts: number;
  hasError: boolean;
  errorMessage?: string;

  // Artifact & Downstream Statuses
  auditStatus: "none" | "in_progress" | "completed" | "failed";
  auditOpportunityScore?: number;

  previewStatus: "none" | "generating" | "ready" | "failed";
  previewId?: string;
  previewUrl?: string;

  outreachStatus: "none" | "drafted" | "review" | "approved" | "rejected" | "simulated_sent" | "sent";
  outreachId?: string;
  outreachChannel?: OutreachChannel;

  // CRM & Reply State
  crmStatus: CRMLeadStatus;
  replyIntent?: string;
  replySentiment?: string;
  nextAction?: string;

  // Follow-up
  followUpStatus: "none" | "scheduled" | "executed" | "exhausted" | "cancelled";
  followUpNumber?: number;
  followUpDueAt?: string;

  // Timestamps
  discoveredAt: string;
  lastActivityAt: string;
  userId?: string;
}

/**
 * Chronological Activity Timeline Event
 */
export interface LeadTimelineEvent {
  id: string;
  leadId: string;
  timestamp: string; // ISO 8601
  type: string;
  title: string;
  description: string;
  actor: "system" | "agent" | "human";
  stage?: PipelineStage | string;
  metadata?: Record<string, unknown>;
}

/**
 * Human Attention / Review Item
 */
export interface LeadReviewItem {
  id: string;
  leadId: string;
  businessName: string;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
  recommendedAction: string;
  timestamp: string;
  category:
    | "low_confidence_reply"
    | "outreach_approval"
    | "failed_job"
    | "missing_data"
    | "do_not_contact"
    | "pipeline_paused";
  stage?: PipelineStage | string;
  previewUrl?: string;
  outreachId?: string;
}

/**
 * Full 8-Section Comprehensive Lead Detail Inspection View
 */
export interface LeadDetailView {
  profile: {
    leadId: string;
    businessName: string;
    industry: string;
    category: string;
    location: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    websiteStatus: WebsiteStatus;
    phone?: string;
    email?: string;
    source: string;
    discoveredAt: string;
    notes?: string[];
  };
  qualification: {
    status: QualificationStatus;
    score: number;
    opportunityScore: number;
    reasonCodes: string[];
    opportunityReasons: string[];
    disqualificationReason?: string;
  };
  audit: {
    auditId?: string;
    status: "none" | "completed" | "failed";
    opportunityScore?: number;
    technicalFindings?: string[];
    mobileFindings?: string[];
    seoFindings?: string[];
    uxFindings?: string[];
    conversionFindings?: string[];
    accessibilityFindings?: string[];
    recommendations?: string[];
    auditedAt?: string;
  };
  preview: {
    previewId?: string;
    status: "none" | "generating" | "ready" | "failed";
    url?: string;
    qualityScore?: number;
    designArchetype?: string;
    sectionCount?: number;
    generatedAt?: string;
    hasArtifact: boolean;
  };
  outreach: {
    outreachId?: string;
    channel?: OutreachChannel;
    status: "none" | "drafted" | "review" | "approved" | "rejected" | "simulated_sent" | "sent";
    subject?: string;
    message?: string;
    personalizationFieldsUsed?: string[];
    approvedAt?: string;
    simulatedAt?: string;
  };
  crm: {
    status: CRMLeadStatus;
    conversationId?: string;
    lastMessageAt?: string;
    replyIntent?: string;
    sentiment?: string;
    urgency?: string;
    confidence?: number;
    summary?: string;
    keySignals?: string[];
    recommendedNextAction?: string;
    messagesCount: number;
  };
  pipeline: {
    runId?: string;
    currentStage: PipelineStage;
    status: PipelineStatus;
    attempt: number;
    retryCount: number;
    maxAttempts: number;
    errorHistory: string[];
    createdAt?: string;
    updatedAt?: string;
  };
  analytics: {
    operationsCount: number;
    estimatedTokens: number;
    estimatedCostUsd: number | null;
    durationMs: number | null;
  };
  timeline: LeadTimelineEvent[];
}

/**
 * Filter and Pagination Criteria
 */
export interface LeadFilterCriteria {
  preset?: FilterPreset;
  search?: string;
  stage?: PipelineStage | "ALL";
  industry?: string;
  status?: CRMLeadStatus | "ALL";
  qualification?: QualificationStatus | "ALL";
  minOpportunity?: number;
  page?: number;
  limit?: number;
  sortField?:
    | "businessName"
    | "discoveredAt"
    | "opportunityScore"
    | "qualificationScore"
    | "lastActivityAt"
    | "pipelineStage";
  sortDir?: "asc" | "desc";
  userId?: string;
}

/**
 * High-Level Command Center KPIs (Non-Fabricated)
 */
export interface CommandCenterKPIs {
  totalLeads: number;
  qualifiedLeads: number;
  previewReady: number;
  outreachReady: number;
  awaitingReply: number;
  interested: number;
  meetingsRequested: number;
  won: number;
  followUpsDue: number;
  failed: number;
  paused: number;
  conversionRate: number | null;
  avgPipelineDurationMs: number | null;
  knownEstimatedCostUsd: number | null;
}

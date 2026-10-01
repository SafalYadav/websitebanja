// src/lib/intelligence/pipeline/pipelineTypes.ts
import { z } from "zod";
import type { OutreachChannel } from "@/lib/outreach/types";
import type { CRMLeadStatus } from "@/lib/crm/types";
import type { ReplyIntent, ReplySentiment } from "@/lib/crm/types";

export type AutonomousPipelineStage =
  | "DISCOVER"
  | "QUALIFY"
  | "AUDIT"
  | "RESEARCH"
  | "PREVIEW_DECISION"
  | "PREVIEW_GENERATION"
  | "PREVIEW_VALIDATION"
  | "OUTREACH_DRAFT"
  | "HUMAN_APPROVAL"
  | "GMAIL_SEND"
  | "WAIT_REPLY"
  | "REPLY_INTELLIGENCE"
  | "FOLLOW_UP"
  | "MEETING"
  | "TERMINAL";

export type AutonomousPipelineStatus =
  | "pending"
  | "running"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "partial_success"
  | "paused"
  | "cancelled";

export type LeadApprovalStatus =
  | "DRAFT_CREATED"
  | "PENDING_HUMAN_APPROVAL"
  | "APPROVED"
  | "READY_TO_SEND"
  | "SENT"
  | "REJECTED";

export interface PipelineCriteria {
  niche: string;
  location: string;
  limit?: number;
  channel?: OutreachChannel;
  autoApproveOutreach?: false; // Invariant: Auto-send always false without explicit human approval
  qualificationRequirements?: {
    minScore?: number;
    commercialOnly?: boolean;
    requireWebsiteOpportunity?: boolean;
  };
}

export interface LeadExecutionRecord {
  leadId: string;
  userId?: string;
  businessName: string;
  category: string;
  city: string;
  email?: string;
  phone?: string;
  website?: string;
  currentStage: AutonomousPipelineStage;
  status: "pending" | "running" | "waiting_approval" | "completed" | "failed" | "skipped";
  qualificationScore?: number;
  qualificationStatus?: string;
  auditId?: string;
  auditScore?: number;
  hasWebsite?: boolean;
  websiteDecision?: "generate_preview" | "skip_good_website" | "missing_website";
  previewId?: string;
  previewUrl?: string;
  previewValidated?: boolean;
  outreachId?: string;
  outreachSubject?: string;
  outreachBody?: string;
  approvalStatus: LeadApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectedReason?: string;
  gmailMessageId?: string;
  sentAt?: string;
  conversationId?: string;
  replyReceived?: boolean;
  replyIntent?: ReplyIntent;
  replySentiment?: ReplySentiment;
  followUpJobId?: string;
  followUpScheduled?: boolean;
  meetingScheduled?: boolean;
  crmStatus: CRMLeadStatus;
  terminalOutcome?: "WON" | "LOST";
  terminalReason?: string;
  error?: string;
  retryCount: number;
  timeline: Array<{
    stage: AutonomousPipelineStage;
    status: "started" | "completed" | "failed" | "skipped" | "waiting_approval";
    timestamp: string;
    details?: string;
  }>;
}

export interface PipelineRunStats {
  discovered: number;
  qualified: number;
  disqualified: number;
  audited: number;
  previewsGenerated: number;
  previewsSkippedGoodWebsite: number;
  previewsFailedValidation: number;
  outreachDrafted: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  sent: number;
  repliesReceived: number;
  interested: number;
  meetingsScheduled: number;
  followUpsScheduled: number;
  won: number;
  lost: number;
  failed: number;
}

export interface AutonomousPipelineRun {
  pipelineRunId: string;
  taskId: string;
  tenantId: string | null;
  userId?: string | null;
  projectId?: string | null;
  status: AutonomousPipelineStatus;
  currentStage: AutonomousPipelineStage;
  criteria: PipelineCriteria;
  stats: PipelineRunStats;
  leads: Record<string, LeadExecutionRecord>;
  errors: Array<{
    leadId?: string;
    stage: AutonomousPipelineStage;
    message: string;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface TelegramApprovalRequest {
  approvalId: string;
  pipelineRunId: string;
  leadId: string;
  businessName: string;
  recipientEmail: string;
  subject: string;
  bodyPreview: string;
  previewUrl?: string;
  qualificationScore?: number;
  auditHighlights: string[];
  status: LeadApprovalStatus;
  actions: {
    approveCallbackData: string;
    rejectCallbackData: string;
    previewUrl?: string;
  };
  createdAt: string;
}

// Zod schemas
export const PipelineCriteriaSchema = z.object({
  niche: z.string().min(1),
  location: z.string().min(1),
  limit: z.number().int().positive().max(50).default(5),
  channel: z.enum(["email", "whatsapp", "instagram"]).default("email"),
  autoApproveOutreach: z.literal(false).default(false),
  qualificationRequirements: z
    .object({
      minScore: z.number().optional(),
      commercialOnly: z.boolean().optional(),
      requireWebsiteOpportunity: z.boolean().optional(),
    })
    .optional(),
});

export const ApproveDraftRequestSchema = z.object({
  pipelineRunId: z.string().min(1),
  leadId: z.string().min(1),
  outreachId: z.string().min(1),
  approvedBy: z.string().default("human_admin"),
  notes: z.string().optional(),
});

export const RejectDraftRequestSchema = z.object({
  pipelineRunId: z.string().min(1),
  leadId: z.string().min(1),
  outreachId: z.string().min(1),
  rejectedBy: z.string().default("human_admin"),
  reason: z.string().min(1),
});

export const IngestReplyRequestSchema = z.object({
  pipelineRunId: z.string().optional(),
  leadId: z.string().min(1),
  messageText: z.string().min(1),
  senderEmail: z.string().optional(),
  messageId: z.string().optional(),
  timestamp: z.string().optional(),
});

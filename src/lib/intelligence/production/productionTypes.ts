// src/lib/intelligence/production/productionTypes.ts
// Phase 28 — Autonomous Production: Type Definitions & State Machine Contracts
//
// Strictly Governed Autonomous Production Lifecycle:
// DISCOVER -> QUALIFY -> RESEARCH -> GROUNDED INTELLIGENCE -> WEBSITE PLAN ->
// WEBSITE GENERATION -> GROUNDED ASSET INTEGRATION -> SELF-CORRECTION ->
// QUALITY VALIDATION -> PREVIEW -> APPROVAL / GOVERNANCE -> OUTREACH ->
// FOLLOW-UP -> CRM UPDATE -> LEARNING

import { z } from "zod";
import type { WebsiteData } from "@/types/website";
import type { ValidationReport } from "../validation/types";
import type { GroundedBusinessProfile } from "../grounding/types";
import type { GroundedAssetSelectionResult } from "../grounding/assetTypes";

/**
 * 22 Deterministic Production Job States
 */
export type ProductionJobState =
  | "CREATED"
  | "DISCOVERING"
  | "QUALIFYING"
  | "RESEARCHING"
  | "GROUNDED"
  | "PLANNING"
  | "GENERATING"
  | "VALIDATING"
  | "REPAIRING"
  | "PREVIEW_READY"
  | "QUALITY_APPROVED"
  | "WAITING_FOR_APPROVAL" // Strict Human/Governance Gate
  | "APPROVED"
  | "OUTREACH_READY"
  | "OUTREACH_SENT"
  | "WAITING_FOR_REPLY"
  | "FOLLOWUP_READY"
  | "MEETING_BOOKED"
  | "WON"
  | "LOST"
  | "PAUSED"
  | "FAILED"
  | "ESCALATED";

/**
 * Valid state transition graph.
 * Any transition not in this map is strictly rejected.
 */
export const VALID_PRODUCTION_TRANSITIONS: Record<ProductionJobState, ProductionJobState[]> = {
  CREATED: ["DISCOVERING", "PAUSED", "FAILED", "ESCALATED"],
  DISCOVERING: ["QUALIFYING", "PAUSED", "FAILED", "ESCALATED"],
  QUALIFYING: ["RESEARCHING", "LOST", "PAUSED", "FAILED", "ESCALATED"],
  RESEARCHING: ["GROUNDED", "PAUSED", "FAILED", "ESCALATED"],
  GROUNDED: ["PLANNING", "PAUSED", "FAILED", "ESCALATED"],
  PLANNING: ["GENERATING", "PAUSED", "FAILED", "ESCALATED"],
  GENERATING: ["VALIDATING", "REPAIRING", "PLANNING", "PAUSED", "FAILED", "ESCALATED"],
  VALIDATING: ["QUALITY_APPROVED", "REPAIRING", "FAILED", "PAUSED", "ESCALATED"],
  REPAIRING: ["VALIDATING", "GENERATING", "PLANNING", "FAILED", "PAUSED", "ESCALATED"],
  QUALITY_APPROVED: ["PREVIEW_READY", "PAUSED", "FAILED", "ESCALATED"],
  PREVIEW_READY: ["WAITING_FOR_APPROVAL", "PAUSED", "FAILED", "ESCALATED"],
  WAITING_FOR_APPROVAL: ["APPROVED", "LOST", "PAUSED", "FAILED", "ESCALATED"], // Requires human action
  APPROVED: ["OUTREACH_READY", "PAUSED", "FAILED", "ESCALATED"],
  OUTREACH_READY: ["OUTREACH_SENT", "PAUSED", "FAILED", "ESCALATED"],
  OUTREACH_SENT: ["WAITING_FOR_REPLY", "PAUSED", "FAILED", "ESCALATED"],
  WAITING_FOR_REPLY: ["FOLLOWUP_READY", "MEETING_BOOKED", "WON", "LOST", "PAUSED", "FAILED"],
  FOLLOWUP_READY: ["OUTREACH_SENT", "MEETING_BOOKED", "LOST", "PAUSED", "FAILED"],
  MEETING_BOOKED: ["WON", "LOST", "PAUSED", "FAILED"],
  WON: [], // Terminal
  LOST: [], // Terminal
  PAUSED: [
    "CREATED",
    "DISCOVERING",
    "QUALIFYING",
    "RESEARCHING",
    "GROUNDED",
    "PLANNING",
    "GENERATING",
    "VALIDATING",
    "REPAIRING",
    "PREVIEW_READY",
    "QUALITY_APPROVED",
    "WAITING_FOR_APPROVAL",
    "APPROVED",
    "OUTREACH_READY",
    "OUTREACH_SENT",
    "WAITING_FOR_REPLY",
    "FOLLOWUP_READY",
    "MEETING_BOOKED",
    "FAILED",
    "ESCALATED",
  ],
  FAILED: ["CREATED", "DISCOVERING", "GENERATING", "VALIDATING"], // Allow explicit restart on failure if permitted
  ESCALATED: ["PAUSED", "WAITING_FOR_APPROVAL", "APPROVED", "FAILED"], // Human/CEO intervention resolves escalation
};

/**
 * Bounded resource and budget controls for a production job.
 */
export interface ProductionBudget {
  maxTimeMs: number;
  maxRetries: number;
  maxModelCalls: number;
  modelCallsUsed: number;
  retryCount: number;
  executionTimeMs: number;
}

export const DEFAULT_PRODUCTION_BUDGET: ProductionBudget = {
  maxTimeMs: 120_000, // 2 minutes maximum per job
  maxRetries: 3,
  maxModelCalls: 20,
  modelCallsUsed: 0,
  retryCount: 0,
  executionTimeMs: 0,
};

export interface ProductionTimelineEntry {
  state: ProductionJobState;
  timestamp: string;
  details?: string;
  actor?: string;
  durationMs?: number;
}

export interface ProductionFailureRecord {
  stage: string;
  error: string;
  fingerprint: string;
  timestamp: string;
  retryCount: number;
}

export interface ProductionSideEffectRecord {
  effectKey: string;
  executedAt: string;
  resultSummary: string;
}

/**
 * Full autonomous production job record.
 */
export interface AutonomousProductionJob {
  jobId: string;
  tenantId: string | null;
  idempotencyKey: string;
  businessId: string;
  businessName: string;
  location: string;
  niche: string;
  contactEmail?: string;
  contactPhone?: string;
  state: ProductionJobState;
  objective: string;
  budget: ProductionBudget;

  // Domain Artefacts
  leadId?: string;
  auditId?: string;
  auditScore?: number;
  groundedProfileId?: string;
  groundedProfile?: GroundedBusinessProfile;
  assetSelection?: GroundedAssetSelectionResult;
  websiteData?: WebsiteData;
  previewId?: string;
  previewUrl?: string;
  validationReport?: ValidationReport;

  // Governance & Human Gate
  approvalId?: string;
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;

  // Outreach & CRM
  outreachDraft?: {
    id: string;
    subject: string;
    body: string;
    recipientEmail: string;
  };
  gmailMessageId?: string;
  sentAt?: string;
  crmLeadId?: string;
  crmStatus?: string;

  // Learning Loop
  learningCandidateIds: string[];

  // Fault Tolerance & Recovery
  failureFingerprint?: string;
  failureHistory: ProductionFailureRecord[];
  pausedReason?: string;
  escalatedReason?: string;

  // State & Side Effect Tracking
  timeline: ProductionTimelineEntry[];
  sideEffectsExecuted: Record<string, ProductionSideEffectRecord>;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateProductionJobParams {
  businessName: string;
  location: string;
  niche: string;
  contactEmail?: string;
  contactPhone?: string;
  objective?: string;
  tenantId?: string | null;
  idempotencyKey?: string;
  budget?: Partial<ProductionBudget>;
  customLeadId?: string;
  initialWebsiteData?: Partial<WebsiteData>;
}

export interface ProductionStepResult {
  job: AutonomousProductionJob;
  transitioned: boolean;
  previousState: ProductionJobState;
  newState: ProductionJobState;
  actionTaken: string;
  requiresHumanAction: boolean;
  error?: string;
}

// Zod Schemas
export const CreateProductionJobSchema = z.object({
  businessName: z.string().min(1),
  location: z.string().min(1),
  niche: z.string().min(1),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  objective: z.string().optional(),
  tenantId: z.string().nullable().optional(),
  idempotencyKey: z.string().optional(),
  budget: z
    .object({
      maxTimeMs: z.number().positive().optional(),
      maxRetries: z.number().int().nonnegative().optional(),
      maxModelCalls: z.number().int().positive().optional(),
    })
    .optional(),
});

export const ApproveJobSchema = z.object({
  jobId: z.string().min(1),
  tenantId: z.string().nullable().optional(),
  approver: z.string().min(1).default("human_admin"),
  notes: z.string().optional(),
});

export const RejectJobSchema = z.object({
  jobId: z.string().min(1),
  tenantId: z.string().nullable().optional(),
  rejector: z.string().min(1).default("human_admin"),
  reason: z.string().min(1),
});

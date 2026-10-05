// src/lib/automation/pipelineTypes.ts
// Phase 13 — Autonomous Lead Pipeline Data Models and State Machine
import { z } from "zod";

export const PipelineRunIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,160}$/);
export const PipelineRunMutationSchema = z.object({ runId: PipelineRunIdSchema, reason: z.string().trim().max(500).optional() });
export const PipelineReplySimulationSchema = z.object({
  leadId: z.string().trim().min(1).max(160),
  messageText: z.string().trim().min(1).max(4000),
  channel: z.enum(["email", "instagram", "sms"]).default("email"),
});

export const PipelineRunCriteriaSchema = z.object({
  industry: z.string().trim().min(2).max(200),
  city: z.string().trim().min(2).max(200),
  limit: z.number().int().min(1).max(50).optional(),
  autoApproveOutreach: z.boolean().optional(),
  channel: z.enum(["email", "instagram", "sms"]).optional(),
});

export type PipelineStage =
  | "DISCOVERY"
  | "QUALIFICATION"
  | "RESEARCH_AUDIT"
  | "PREVIEW_GENERATION"
  | "OUTREACH_DRAFT"
  | "HUMAN_APPROVAL"
  | "SIMULATED_DISPATCH"
  | "WAITING_FOR_REPLY"
  | "REPLY_INTELLIGENCE"
  | "FOLLOW_UP_QUEUE"
  | "COMPLETED"
  | "PAUSED"
  | "CANCELLED"
  | "FAILED";

export type PipelineStatus =
  | "PENDING"
  | "RUNNING"
  | "PAUSED"
  | "CANCELLED"
  | "COMPLETED"
  | "FAILED"
  | "PARTIAL_SUCCESS";

export interface PipelineStats {
  discovered: number;
  qualified: number;
  audited: number;
  previewsGenerated: number;
  outreachDrafted: number;
  outreachDispatched: number;
  repliesReceived: number;
  interested: number;
  followUpsScheduled: number;
  failed: number;
}

export interface LeadStageError {
  stage: PipelineStage;
  error: string;
  timestamp: string;
}

export interface LeadTimelineEvent {
  stage: PipelineStage;
  status: "started" | "completed" | "failed" | "skipped" | "paused" | "retried";
  timestamp: string;
  details?: string;
}

export interface LeadPipelineProgress {
  researchId?: string;
  generationCorrelationId?: string;
  leadId: string;
  businessName: string;
  currentStage: PipelineStage;
  status: "pending" | "running" | "completed" | "failed" | "paused" | "skipped";
  auditId?: string;
  previewId?: string;
  previewUrl?: string;
  outreachId?: string;
  conversationId?: string;
  retryCount: number;
  maxAttempts: number;
  lastError?: string;
  errorHistory: LeadStageError[];
  timeline: LeadTimelineEvent[];
  completedAt?: string;
}

export interface PipelineJob {
  id: string;
  runId: string;
  leadId: string;
  stage: PipelineStage;
  status: "queued" | "running" | "completed" | "failed" | "skipped" | "paused";
  attempt: number;
  maxAttempts: number;
  idempotencyKey: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

import type { OutreachChannel } from "@/lib/outreach/types";

export interface PipelineRunCriteria {
  industry: string;
  city: string;
  limit?: number;
  autoApproveOutreach?: boolean;
  channel?: OutreachChannel;
}

export interface PipelineRunError {
  leadId?: string;
  stage: PipelineStage;
  error: string;
  timestamp: string;
}

export interface PipelineRun {
  tenantId?: string;
  userId?: string;
  id: string;
  status: PipelineStatus;
  currentStage: PipelineStage;
  criteria: PipelineRunCriteria;
  stats: PipelineStats;
  leads: Record<string, LeadPipelineProgress>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  pausedAt?: string;
  pauseReason?: "human" | "research" | "outreach";
  activeResearchContinuationId?: string;
  cancelledAt?: string;
  error?: string;
  errors: PipelineRunError[];
}

export interface PipelineUsageTracking {
  apiCalls: Record<string, number>;
  estimatedTokens: number;
  estimatedCostUsd: number;
  durationMs: number;
}

export interface Phase14HandoffContract {
  pipelineRunId: string;
  timestamp: string;
  status: PipelineStatus;
  metrics: PipelineStats;
  costMetrics: {
    estimatedTokens: number;
    estimatedCostUsd: number;
    durationMs: number;
  };
  conversionFunnel: {
    leadsDiscovered: number;
    leadsQualified: number;
    auditsCompleted: number;
    previewsCreated: number;
    outreachSent: number;
    repliesTotal: number;
    positiveReplies: number;
  };
}

/**
 * Valid allowed state transitions matrix
 */
export const VALID_STAGE_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  DISCOVERY: ["QUALIFICATION", "FAILED", "CANCELLED", "PAUSED"],
  QUALIFICATION: ["RESEARCH_AUDIT", "COMPLETED", "FAILED", "CANCELLED", "PAUSED"],
  RESEARCH_AUDIT: ["PREVIEW_GENERATION", "FAILED", "CANCELLED", "PAUSED"],
  PREVIEW_GENERATION: ["OUTREACH_DRAFT", "FAILED", "CANCELLED", "PAUSED"],
  OUTREACH_DRAFT: ["HUMAN_APPROVAL", "SIMULATED_DISPATCH", "FAILED", "CANCELLED", "PAUSED"],
  HUMAN_APPROVAL: ["SIMULATED_DISPATCH", "WAITING_FOR_REPLY", "COMPLETED", "FAILED", "CANCELLED", "PAUSED"],
  SIMULATED_DISPATCH: ["WAITING_FOR_REPLY", "FAILED", "CANCELLED", "PAUSED"],
  WAITING_FOR_REPLY: ["REPLY_INTELLIGENCE", "FOLLOW_UP_QUEUE", "COMPLETED", "FAILED", "CANCELLED", "PAUSED"],
  REPLY_INTELLIGENCE: ["FOLLOW_UP_QUEUE", "COMPLETED", "FAILED", "CANCELLED", "PAUSED"],
  FOLLOW_UP_QUEUE: ["SIMULATED_DISPATCH", "COMPLETED", "FAILED", "CANCELLED", "PAUSED"],
  PAUSED: [
    "DISCOVERY",
    "QUALIFICATION",
    "RESEARCH_AUDIT",
    "PREVIEW_GENERATION",
    "OUTREACH_DRAFT",
    "HUMAN_APPROVAL",
    "SIMULATED_DISPATCH",
    "WAITING_FOR_REPLY",
    "REPLY_INTELLIGENCE",
    "FOLLOW_UP_QUEUE",
    "CANCELLED",
  ],
  FAILED: [
    "DISCOVERY",
    "QUALIFICATION",
    "RESEARCH_AUDIT",
    "PREVIEW_GENERATION",
    "OUTREACH_DRAFT",
    "HUMAN_APPROVAL",
    "SIMULATED_DISPATCH",
    "WAITING_FOR_REPLY",
    "REPLY_INTELLIGENCE",
    "FOLLOW_UP_QUEUE",
    "CANCELLED",
  ],
  CANCELLED: [],
  COMPLETED: [],
};

/**
 * Validates whether transition from `fromStage` to `toStage` is permitted.
 */
export function validateStageTransition(fromStage: PipelineStage, toStage: PipelineStage): boolean {
  if (fromStage === toStage) return true; // Idempotent same-stage transition allowed
  const allowed = VALID_STAGE_TRANSITIONS[fromStage];
  return allowed ? allowed.includes(toStage) : false;
}

/**
 * Asserts valid transition, throwing if invalid
 */
export function assertValidStageTransition(fromStage: PipelineStage, toStage: PipelineStage): void {
  if (!validateStageTransition(fromStage, toStage)) {
    throw new Error(`Invalid pipeline stage transition: cannot move from '${fromStage}' to '${toStage}'`);
  }
}

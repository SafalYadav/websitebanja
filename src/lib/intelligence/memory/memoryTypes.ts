// src/lib/intelligence/memory/memoryTypes.ts
import { z } from "zod";

export type MemoryLevel =
  | "WORKING_MEMORY"
  | "BUSINESS_MEMORY"
  | "EXPERIENCE_MEMORY"
  | "STRATEGIC_MEMORY";

export type LessonStatus =
  | "CANDIDATE"
  | "VALIDATING"
  | "VERIFIED"
  | "PROMOTED"
  | "REJECTED"
  | "DEPRECATED";

export type StrategyStatus =
  | "DRAFT"
  | "EVALUATION"
  | "REGRESSION_TEST"
  | "APPROVED"
  | "ACTIVE"
  | "DEPRECATED";

export type FeedbackType =
  | "human_approval"
  | "human_rejection"
  | "correction"
  | "validation_result"
  | "business_outcome";

export type FailureType =
  | "category_mismatch"
  | "tool_failure"
  | "timeout"
  | "validation_failure"
  | "safety_block"
  | "policy_violation";

export type EvidenceType =
  | "verified_source"
  | "execution_outcome"
  | "validator_confirmation"
  | "human_feedback"
  | "repeated_confirmed_pattern";

export interface EvidenceItem {
  id: string;
  type: EvidenceType;
  description: string;
  runId?: string;
  source: string;
  timestamp: string;
  confidence: number; // 0.0 - 1.0
  contradictory?: boolean;
}

export interface AgentRunRecord {
  id: string;
  runId: string;
  parentRunId?: string | null;
  agentId: string;
  objective: string;
  domain: string;
  status: "running" | "success" | "failed";
  startedAt: string;
  completedAt?: string | null;
  durationMs?: number;
  inputReference?: Record<string, unknown>;
  outputReference?: Record<string, unknown>;
  success: boolean;
  failureReason?: string | null;
  validationStatus: "pending" | "passed" | "failed";
  userId?: string | null;
  projectId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentEventRecord {
  id: string;
  eventId: string;
  runId: string;
  parentEventId?: string | null;
  agentId: string;
  eventType: string;
  timestamp: string;
  durationMs?: number;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentDecisionRecord {
  id: string;
  decisionId: string;
  runId: string;
  objective: string;
  decisionType: string;
  chosenAction: string;
  alternativesConsidered: string[];
  reasoningSummary: string; // Concise summary, NEVER private chain-of-thought!
  confidence: number; // 0.0 - 1.0
  evidence: string[];
  outcome?: string | null;
  createdAt: string;
}

export interface AgentFeedbackRecord {
  id: string;
  feedbackId: string;
  runId: string;
  projectId?: string | null;
  userId?: string | null;
  feedbackType: FeedbackType;
  source: string;
  sentiment?: "positive" | "negative" | "neutral";
  rating?: number | null;
  correctionText?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentFailureRecord {
  id: string;
  failureId: string;
  runId: string;
  agentId: string;
  failureType: FailureType;
  errorCode: string;
  safeErrorMessage: string;
  attemptedAction: string;
  retryCount: number;
  recoveryAction?: string | null;
  recovered: boolean;
  domain: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentEvaluationRecord {
  id: string;
  evaluationId: string;
  runId: string;
  domain: string;
  correctnessScore: number; // 0.0 - 1.0
  safetyScore: number;      // 0.0 - 1.0
  validationScore: number;  // 0.0 - 1.0
  efficiencyScore: number;  // 0.0 - 1.0
  overallScore: number;     // 0.0 - 1.0
  passed: boolean;
  evaluator: string;
  dimensionScores: Record<string, number>;
  observations: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentLessonRecord {
  id: string;
  lessonId: string;
  title: string;
  statement: string;
  domain: string;
  status: LessonStatus;
  confidence: number; // 0.0 - 1.0
  sourceRunIds: string[];
  evidence: EvidenceItem[];
  supportingOutcomes: number;
  contradictingOutcomes: number;
  validationCount: number;
  strategyVersion?: string | null;
  promotedAt?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentStrategyRecord {
  tenantId?: string | null;
  id: string;
  strategyId: string;
  name: string;
  domain: string;
  version: string; // e.g. "strategy_v1"
  status: StrategyStatus;
  description: string;
  directives: string[];
  avoidPatterns: string[];
  benchmarkResults?: Record<string, unknown>;
  confidence: number;
  promotedFromLessonId?: string | null;
  supersedesVersion?: string | null;
  metadata?: Record<string, unknown>;
  activatedAt?: string | null;
  deprecatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentExperimentRecord {
  id: string;
  experimentId: string;
  hypothesis: string;
  domain: string;
  strategyA: string;
  strategyB: string;
  sampleSize: number;
  metrics: Record<string, unknown>;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "ABORTED";
  result?: Record<string, unknown>;
  confidence?: number;
  createdAt: string;
  completedAt?: string | null;
}

export interface BusinessMemoryItem {
  id: string;
  projectId: string;
  userId?: string | null;
  businessName: string;
  category: string;
  verifiedFacts: Record<string, unknown>;
  validatedPreferences: {
    visualArchetype?: string;
    colorPalette?: string[];
    typography?: string;
    motionLevel?: string;
    tone?: string;
  };
  previousOutcomes: Array<{
    runId: string;
    date: string;
    action: string;
    result: "success" | "failure";
    notes?: string;
  }>;
  approvedBrandInfo: Record<string, unknown>;
  updatedAt: string;
}

export interface MemoryQuery {
  tenantId?: string | null;
  domain?: string;
  projectId?: string;
  userId?: string;
  task?: string;
  agent?: string;
  level?: MemoryLevel;
  minConfidence?: number;
  status?: string;
  limit?: number;
}

export interface RetrievedMemoryItem {
  id: string;
  level: MemoryLevel;
  title: string;
  content: string | Record<string, unknown>;
  domain: string;
  confidence: number;
  evidence: EvidenceItem[];
  sourceReference: string;
  status?: string;
}

export interface MemoryRetrievalResult {
  memories: RetrievedMemoryItem[];
  totalFound: number;
  highestConfidence: number;
  activeStrategy?: AgentStrategyRecord | null;
  relevantLessons: AgentLessonRecord[];
  businessContext?: BusinessMemoryItem | null;
  experienceSummary?: {
    pastRunsCount: number;
    successRate: number;
    knownFailurePatterns: string[];
  };
}

export type MemoryRecordKind =
  | "run"
  | "event"
  | "decision"
  | "feedback"
  | "failure"
  | "evaluation"
  | "lesson"
  | "strategy"
  | "experiment"
  | "business";

export interface TenantMemoryRecord<T = unknown> {
  tenantId: string;
  recordKind: MemoryRecordKind;
  recordId: string;
  payload: T;
  revision: number;
  createdAt: string;
  updatedAt: string;
}


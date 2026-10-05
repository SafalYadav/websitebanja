// src/lib/intelligence/learningLoop/types.ts
// Phase 27 — Learning Loop: Types & Contracts
//
// Lifecycle:
// CANDIDATE LESSON -> EVIDENCE / OUTCOME -> EVALUATION -> REGRESSION CHECK -> APPROVAL / PROMOTION -> NEW STRATEGY VERSION -> CONTROLLED DEPLOYMENT

import type { EvidenceItem, EvidenceType } from "../memory/memoryTypes";

export type LearningCandidateStatus =
  | "CANDIDATE"
  | "UNDER_EVALUATION"
  | "REGRESSION_PENDING"
  | "APPROVAL_PENDING"
  | "PROMOTED"
  | "REJECTED"
  | "ROLLED_BACK"
  | "EXPIRED";

export type CandidateSourceType =
  | "validation_failure"
  | "repair_success"
  | "grounded_bi"
  | "agent_execution"
  | "human_feedback"
  | "experiment";

export interface HumanFeedbackItem {
  feedbackId: string;
  runId?: string;
  tenantId?: string | null;
  source: string;
  type: "correction" | "approval" | "rejection" | "rating";
  feedbackText: string;
  sentiment?: "positive" | "negative" | "neutral";
  suggestedDirective?: string;
  suggestedAvoidPattern?: string;
  rating?: number; // 1-5
  createdAt: string;
}

export interface LearningEvaluationReport {
  evaluatedAt: string;
  canProgress: boolean;
  confidence: number;
  evidenceCount: number;
  verifiedSourcesCount: number;
  distinctRunCount: number;
  contradictionRatio: number;
  sideEffectRisk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reasons: string[];
  recommendations: string[];
}

export interface LearningRegressionBenchmarkResult {
  status?: "unavailable" | "verified";
  testedAt: string;
  passed: boolean;
  overallScore: number; // 0 - 100 (Threshold >= 90)
  categoriesTested: number;
  categoryResults: Record<
    string,
    {
      passed: boolean;
      score: number;
      details?: string;
    }
  >;
  qualityGateChecks: {
    semanticPassed: boolean;
    ctaPassed: boolean;
    navigationPassed: boolean;
    claimsPassed: boolean;
    accessibilityPassed: boolean;
    performancePassed: boolean;
  };
  regressionsDetected: string[];
}

export interface StrategyDiff {
  oldVersion: string | null;
  newVersion: string;
  directivesAdded: string[];
  directivesRemoved: string[];
  avoidPatternsAdded: string[];
  avoidPatternsRemoved: string[];
  changesSummary: string;
  riskAssessment: "LOW" | "MEDIUM" | "HIGH";
}

export interface StrategyVersionRecord {
  tenantId?: string | null;
  strategyId: string;
  domain: string;
  version: string; // e.g. "v1", "v2"
  versionNumber: number;
  parentVersion: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "ACTIVE" | "DEPRECATED" | "ROLLED_BACK";
  diff: StrategyDiff;
  directives: string[];
  avoidPatterns: string[];
  promotedFromCandidateLessonId?: string;
  governanceApprovalId?: string;
  approvedBy?: string;
  benchmarkScore?: number;
  activatedAt?: string | null;
  deprecatedAt?: string | null;
  rolledBackAt?: string | null;
  rollbackReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateLesson {
  id: string;
  lessonId: string;
  title: string;
  statement: string;
  domain: string;
  tenantId?: string | null;
  isGlobalScope: boolean;
  status: LearningCandidateStatus;
  confidence: number; // 0.0 - 1.0
  sourceType: CandidateSourceType;
  sourceRunIds: string[];
  evidence: EvidenceItem[];
  supportingOutcomes: number;
  contradictingOutcomes: number;
  validationCount: number;
  evaluationReport?: LearningEvaluationReport;
  regressionBenchmark?: LearningRegressionBenchmarkResult;
  approvalId?: string;
  promotedStrategyId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface LearningSummary {
  totalCandidates: number;
  activeCandidates: number;
  underEvaluation: number;
  regressionPending: number;
  approvalPending: number;
  promotedCount: number;
  rejectedCount: number;
  rolledBackCount: number;
  activeStrategiesCount: number;
  recentCandidates: CandidateLesson[];
  activeStrategies: StrategyVersionRecord[];
}

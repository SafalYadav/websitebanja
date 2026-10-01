// src/lib/intelligence/learningLoop/schemas.ts
// Phase 27 — Learning Loop: Zod Schemas

import { z } from "zod";

export const LearningCandidateStatusSchema = z.enum([
  "CANDIDATE",
  "UNDER_EVALUATION",
  "REGRESSION_PENDING",
  "APPROVAL_PENDING",
  "PROMOTED",
  "REJECTED",
  "ROLLED_BACK",
  "EXPIRED",
]);

export const CandidateSourceTypeSchema = z.enum([
  "validation_failure",
  "repair_success",
  "grounded_bi",
  "agent_execution",
  "human_feedback",
  "experiment",
]);

export const LearningEvidenceItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  description: z.string(),
  runId: z.string().optional(),
  source: z.string(),
  timestamp: z.string(),
  confidence: z.number().min(0).max(1),
  contradictory: z.boolean().optional(),
});

export const LearningEvaluationReportSchema = z.object({
  evaluatedAt: z.string(),
  canProgress: z.boolean(),
  confidence: z.number().min(0).max(1),
  evidenceCount: z.number().int().nonnegative(),
  verifiedSourcesCount: z.number().int().nonnegative(),
  distinctRunCount: z.number().int().nonnegative(),
  contradictionRatio: z.number().min(0).max(1),
  sideEffectRisk: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  reasons: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export const LearningRegressionBenchmarkResultSchema = z.object({
  testedAt: z.string(),
  passed: z.boolean(),
  overallScore: z.number().min(0).max(100),
  categoriesTested: z.number().int().positive(),
  categoryResults: z.record(
    z.string(),
    z.object({
      passed: z.boolean(),
      score: z.number().min(0).max(100),
      details: z.string().optional(),
    })
  ),
  qualityGateChecks: z.object({
    semanticPassed: z.boolean(),
    ctaPassed: z.boolean(),
    navigationPassed: z.boolean(),
    claimsPassed: z.boolean(),
    accessibilityPassed: z.boolean(),
    performancePassed: z.boolean(),
  }),
  regressionsDetected: z.array(z.string()),
});

export const StrategyDiffSchema = z.object({
  oldVersion: z.string().nullable(),
  newVersion: z.string(),
  directivesAdded: z.array(z.string()),
  directivesRemoved: z.array(z.string()),
  avoidPatternsAdded: z.array(z.string()),
  avoidPatternsRemoved: z.array(z.string()),
  changesSummary: z.string(),
  riskAssessment: z.enum(["LOW", "MEDIUM", "HIGH"]),
});

export const StrategyVersionRecordSchema = z.object({
  strategyId: z.string(),
  domain: z.string(),
  version: z.string(),
  versionNumber: z.number().int().positive(),
  parentVersion: z.string().nullable(),
  status: z.enum(["DRAFT", "PENDING_APPROVAL", "ACTIVE", "DEPRECATED", "ROLLED_BACK"]),
  diff: StrategyDiffSchema,
  directives: z.array(z.string()),
  avoidPatterns: z.array(z.string()),
  promotedFromCandidateLessonId: z.string().optional(),
  governanceApprovalId: z.string().optional(),
  approvedBy: z.string().optional(),
  benchmarkScore: z.number().optional(),
  activatedAt: z.string().nullable().optional(),
  deprecatedAt: z.string().nullable().optional(),
  rolledBackAt: z.string().nullable().optional(),
  rollbackReason: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CandidateLessonSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  title: z.string(),
  statement: z.string(),
  domain: z.string(),
  tenantId: z.string().nullable().optional(),
  isGlobalScope: z.boolean(),
  status: LearningCandidateStatusSchema,
  confidence: z.number().min(0).max(1),
  sourceType: CandidateSourceTypeSchema,
  sourceRunIds: z.array(z.string()),
  evidence: z.array(LearningEvidenceItemSchema),
  supportingOutcomes: z.number().int().nonnegative(),
  contradictingOutcomes: z.number().int().nonnegative(),
  validationCount: z.number().int().nonnegative(),
  evaluationReport: LearningEvaluationReportSchema.optional(),
  regressionBenchmark: LearningRegressionBenchmarkResultSchema.optional(),
  approvalId: z.string().optional(),
  promotedStrategyId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

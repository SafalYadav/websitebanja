// src/lib/intelligence/validation/schemas.ts
/**
 * Zod validation schemas for Self-Correction and Validation layer
 */

import { z } from "zod";

export const ValidationStageSchema = z.enum([
  "SEMANTIC",
  "VISUAL",
  "CTA",
  "NAVIGATION",
  "CLAIMS",
  "ACCESSIBILITY",
  "PERFORMANCE",
]);

export const ValidationStatusSchema = z.enum([
  "PASS",
  "WARN",
  "FAIL",
  "SKIPPED",
  "UNAVAILABLE",
]);

export const ValidationSeveritySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

export const ValidationDecisionSchema = z.enum([
  "READY",
  "NOT_READY",
  "REPAIR_REQUIRED",
  "FAILED",
  "UNAVAILABLE",
]);

export const ValidationFailureItemSchema = z.object({
  id: z.string().min(1),
  stage: ValidationStageSchema,
  severity: ValidationSeveritySchema,
  failure: z.string().min(1),
  evidence: z.string(),
  affectedElement: z.string(),
  suggestedFix: z.string(),
  blocking: z.boolean(),
  field: z.string().optional(),
  ruleCode: z.string().optional(),
});

export const ValidationWarningItemSchema = z.object({
  id: z.string().min(1),
  stage: ValidationStageSchema,
  severity: z.enum(["MEDIUM", "LOW"]),
  warning: z.string().min(1),
  details: z.string().optional(),
  affectedElement: z.string().optional(),
});

export const StageValidationResultSchema = z.object({
  stage: ValidationStageSchema,
  status: ValidationStatusSchema,
  passed: z.boolean(),
  score: z.number().min(0).max(100).optional(),
  failures: z.array(ValidationFailureItemSchema),
  warnings: z.array(ValidationWarningItemSchema),
  evidence: z.array(z.string()),
  suggestedFix: z.string().optional(),
  unavailabilityReason: z.string().optional(),
  durationMs: z.number().nonnegative(),
});

export const ValidationReportSchema = z.object({
  validationId: z.string().min(1),
  projectId: z.string().min(1),
  runId: z.string().min(1),
  tenantId: z.string().min(1),
  decision: ValidationDecisionSchema,
  overallScore: z.number().min(0).max(100).optional(),
  stageResults: z.record(ValidationStageSchema, StageValidationResultSchema),
  blockingFailures: z.array(ValidationFailureItemSchema),
  allFailures: z.array(ValidationFailureItemSchema),
  allWarnings: z.array(ValidationWarningItemSchema),
  retryCount: z.number().int().nonnegative(),
  maxRetries: z.number().int().positive(),
  remainingRetries: z.number().int().nonnegative(),
  isLoopDetected: z.boolean(),
  failureFingerprint: z.string(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime(),
});

export const ValidationContextSchema = z.object({
  projectId: z.string().min(1),
  runId: z.string().min(1),
  tenantId: z.string().min(1),
  websiteData: z.record(z.string(), z.unknown()),
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  groundedProfile: z.any().nullable().optional(),
  targetAudience: z.string().optional(),
  services: z.array(z.string()).optional(),
  location: z.string().optional(),
  retryCount: z.number().int().nonnegative().optional(),
  maxRetries: z.number().int().positive().optional(),
  previousFingerprints: z.array(z.string()).optional(),
  is3dRequested: z.boolean().optional(),
  runtimeHasBrowser: z.boolean().optional(),
  screenshotPaths: z.record(z.string(), z.string()).optional(),
});

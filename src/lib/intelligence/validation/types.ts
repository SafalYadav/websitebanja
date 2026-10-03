// src/lib/intelligence/validation/types.ts
/**
 * WebsiteBanja — Self-Correction & Validation Layer Types
 * Requirement #21: Quality Gate + Bounded Repair Loop
 */

import type { GroundedBusinessProfile } from "../grounding/types";
import type { TaskEnvelope, TaskResultEnvelope } from "../delegation/delegationTypes";
import type { BusinessSemanticProfile } from "../semantic/businessSemanticReasoner";
import type { ExecutiveGenerationBrief } from "../orchestration/types";

export type ValidationStage =
  | "SEMANTIC"
  | "VISUAL"
  | "CTA"
  | "NAVIGATION"
  | "CLAIMS"
  | "ACCESSIBILITY"
  | "PERFORMANCE";

export const ORDERED_VALIDATION_STAGES: readonly ValidationStage[] = [
  "SEMANTIC",
  "VISUAL",
  "CTA",
  "NAVIGATION",
  "CLAIMS",
  "ACCESSIBILITY",
  "PERFORMANCE",
] as const;

export type ValidationStatus = "PASS" | "WARN" | "FAIL" | "SKIPPED" | "UNAVAILABLE";

export type ValidationSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ValidationDecision =
  | "READY"
  | "NOT_READY"
  | "REPAIR_REQUIRED"
  | "FAILED"
  | "UNAVAILABLE";

export interface ValidationFailureItem {
  id: string;
  stage: ValidationStage;
  severity: ValidationSeverity;
  failure: string;
  evidence: string;
  affectedElement: string;
  suggestedFix: string;
  blocking: boolean;
  field?: string;
  ruleCode?: string;
}

export interface ValidationWarningItem {
  id: string;
  stage: ValidationStage;
  severity: "MEDIUM" | "LOW";
  warning: string;
  details?: string;
  affectedElement?: string;
}

export interface StageValidationResult {
  stage: ValidationStage;
  status: ValidationStatus;
  passed: boolean;
  score?: number; // 0-100 when applicable, omitted or undefined if not measured
  failures: ValidationFailureItem[];
  warnings: ValidationWarningItem[];
  evidence: string[];
  suggestedFix?: string;
  unavailabilityReason?: string;
  durationMs: number;
}

export interface ValidationReport {
  validationId: string;
  projectId: string;
  runId: string;
  tenantId: string;
  decision: ValidationDecision;
  overallScore?: number;
  stageResults: Record<ValidationStage, StageValidationResult>;
  blockingFailures: ValidationFailureItem[];
  allFailures: ValidationFailureItem[];
  allWarnings: ValidationWarningItem[];
  retryCount: number;
  maxRetries: number;
  remainingRetries: number;
  isLoopDetected: boolean;
  failureFingerprint: string;
  createdAt: string;
  completedAt: string;
}

export interface ValidationContext {
  projectId: string;
  runId: string;
  tenantId: string;
  websiteData: Record<string, unknown>;
  businessName?: string;
  businessCategory?: string;
  groundedProfile?: GroundedBusinessProfile | null;
  semanticProfile?: BusinessSemanticProfile;
  executiveBrief?: ExecutiveGenerationBrief;
  targetAudience?: string;
  services?: string[];
  location?: string;
  businessLocation?: string;
  retryCount?: number;
  maxRetries?: number;
  previousFingerprints?: string[];
  is3dRequested?: boolean;
  runtimeHasBrowser?: boolean;
  screenshotPaths?: Record<string, string>;
}

export interface RepairInstruction {
  repairId: string;
  validationId: string;
  projectId: string;
  stage: ValidationStage;
  scope: "targeted" | "full_regeneration";
  affectedSection?: string;
  affectedField?: string;
  reason: string;
  instruction: string;
  suggestedPatch?: Record<string, unknown>;
  blockingFailures: ValidationFailureItem[];
}

export interface RepairResult {
  repairId: string;
  validationId: string;
  projectId: string;
  success: boolean;
  repairedData: Record<string, unknown>;
  appliedPatches: string[];
  delegationTask?: TaskEnvelope;
  delegationResult?: TaskResultEnvelope;
  error?: string | null;
  durationMs: number;
}

export interface CeoValidationAlert {
  alertId: string;
  projectId: string;
  validationId: string;
  runId: string;
  tenantId: string;
  decision: ValidationDecision;
  failedStages: ValidationStage[];
  highestSeverity: ValidationSeverity;
  blockingFailures: Array<{
    stage: ValidationStage;
    failure: string;
    evidence: string;
    suggestedFix: string;
    severity: ValidationSeverity;
  }>;
  retryCount: number;
  remainingRetries: number;
  isLoopDetected: boolean;
  timestamp: string;
  recommendedAction: string;
}

export interface ValidationRunCycle {
  cycleNumber: number;
  validationId: string;
  decision: ValidationDecision;
  failureCount: number;
  failureFingerprint: string;
  repaired: boolean;
  repairId?: string;
  timestamp: string;
}

export interface ValidationHistoryRecord {
  projectId: string;
  tenantId: string;
  latestReport: ValidationReport;
  cycles: ValidationRunCycle[];
  createdAt: string;
  updatedAt: string;
}

// src/lib/intelligence/index.ts
import { ExecutiveOrchestrator } from "./executive/executiveOrchestrator";
import { ExecutionMemory } from "./memory/executionMemory";
import type {
  ExecutiveTaskRequest,
  ExecutiveExecutionResult,
} from "./executive/executiveTypes";

export * from "./executive/executiveTypes";
export * from "./memory/memoryTypes";
export { ExecutiveOrchestrator } from "./executive/executiveOrchestrator";
export { ExecutiveAgent } from "./executive/executiveAgent";
export { ExecutiveContextBuilder } from "./executive/executiveContextBuilder";
export { AgentRegistry } from "./agents/agentRegistry";
export { ToolRegistry } from "./tools/toolRegistry";
export { ExecutionMemory } from "./memory/executionMemory";
export { MemoryStore } from "./memory/memoryStore";
export { MemoryRetriever } from "./memory/memoryRetriever";
export { LessonEngine } from "./learning/lessonEngine";
export { LessonEvaluator } from "./learning/lessonEvaluator";
export { StrategyManager } from "./learning/strategyManager";
export { ExperimentManager } from "./learning/experimentManager";
export { EvaluationService } from "./evals/evaluationService";
export { evaluateExecutiveExecution } from "./evals/executiveEvaluator";
export { TrajectoryLogger } from "./learning/trajectoryLogger";
export * from "./delegation/delegationTypes";
export { TaskEnvelopeValidator, taskEnvelopeValidator } from "./delegation/taskEnvelopeValidator";
export { CapabilityMatcher, capabilityMatcher } from "./delegation/capabilityMatcher";
export { ConflictResolver, conflictResolver } from "./delegation/conflictResolver";
export { ChildTaskExecutor, childTaskExecutor } from "./delegation/childTaskExecutor";
export { BossDelegator, bossDelegator, delegateToBoss } from "./delegation/bossDelegator";
export { DelegationTreeStore, delegationTreeStore } from "./delegation/delegationTree";
export { DelegationManager, delegationManager, type CeoDelegationRequest } from "./delegation/delegationManager";
export * from "./ops/opsToolTypes";
export { OpsToolExecutor, opsToolExecutor } from "./ops/opsToolExecutor";
export { N8nOpsClient, n8nOpsClient } from "./ops/n8nOpsClient";
export * from "./pipeline/pipelineTypes";
export { AutonomousPipeline, autonomousPipeline } from "./pipeline/autonomousPipeline";
export { ApprovalGate, approvalGate, type StoredApprovalRecord } from "./pipeline/approvalGate";
// Phase 25 — Governance & Action Authority
export * from "./policies/governanceTypes";
export { PolicyEngine, policyEngine, GovernanceViolationError, hashActionPayload } from "./policies/policyEngine";
export { GovernanceAuditLog, governanceAuditLog } from "./policies/governanceAuditLog";
export { GovernanceApprovalStore, governanceApprovalStore } from "./policies/governanceApprovalStore";
export { GovernanceGuard, governanceGuard } from "./policies/governanceGuard";
// Phase 26 — CEO Command Center
export * from "./commandCenter/commandCenterTypes";
export { CommandCenterService, commandCenterService } from "./commandCenter/commandCenterService";
// Grounded Business Intelligence
export type {
  ConfidenceLevel,
  VerificationStatus,
  EvidenceSourceType,
  EvidenceItem as GroundedEvidenceItem,
  FactVsInferenceItem,
  GroundedServiceItem,
  GroundedAudience,
  GroundedLocation,
  GroundedBrandSignals,
  GroundedVisualStyle,
  GroundedCtaStrategy,
  ForbiddenClaimItem,
  ForbiddenClaimType,
  SourceConflict,
  BusinessAmbiguity,
  BusinessIdentity,
  GroundedBusinessProfile,
  BusinessResearchRequest,
  BusinessResearchResult,
} from "./grounding/types";
export * from "./grounding/schemas";
export { GroundedIntelligenceService, groundedIntelligenceService } from "./grounding/groundedIntelligenceService";
export { GroundedProfileStore, groundedProfileStore } from "./grounding/groundedProfileStore";
export {
  createEvidenceItem,
  createObservedFact,
  createDerivedInference,
  detectSourceConflict,
  scoreToConfidenceLevel,
  SOURCE_WEIGHTS,
} from "./grounding/evidenceEngine";
export { compileForbiddenClaims } from "./grounding/forbiddenClaimsEngine";

// Self-Correction & Validation Layer (Requirement #21)
export * from "./validation/types";
export * from "./validation/schemas";
export { ValidationOrchestrator, validationOrchestrator } from "./validation/validationOrchestrator";
export { RepairCoordinator, repairCoordinator } from "./validation/repairCoordinator";
export { ValidationStore, validationStore } from "./validation/validationStore";
export { validateSemantics } from "./validation/semanticValidator";
export { validateVisual } from "./validation/visualValidator";
export { validateCTA } from "./validation/ctaValidator";
export { validateNavigation } from "./validation/navigationValidator";
export { validateClaims } from "./validation/claimsValidator";
export { validateAccessibility } from "./validation/accessibilityValidator";
export { validatePerformance } from "./validation/performanceValidator";

// Phase 27 — Learning Loop (Controlled Learning, Evaluation & Strategy Evolution)
export * from "./learningLoop/types";
export * from "./learningLoop/schemas";
export { sanitizeLearningInput } from "./learningLoop/promptInjectionGuard";
export { CandidateIngestionEngine } from "./learningLoop/candidateIngestionEngine";
export { LearningEvaluationEngine } from "./learningLoop/learningEvaluationEngine";
export { LearningRegressionBenchmark } from "./learningLoop/learningRegressionBenchmark";
export { StrategyPromotionCoordinator } from "./learningLoop/strategyPromotionCoordinator";
export { LearningLoopOrchestrator } from "./learningLoop/learningLoopOrchestrator";

// Phase 28 — Autonomous Production
export * from "./production/productionTypes";
export { ProductionJobStore, productionJobStore } from "./production/productionJobStore";
export { AutonomousProductionOrchestrator, autonomousProductionOrchestrator } from "./production/productionOrchestrator";


/**
 * Primary transport-agnostic service entry point for executive intelligence.

 * Can be called by internal services, admin endpoints, or future chat interfaces (e.g. Telegram).
 */
export async function executeExecutiveTask(
  request: ExecutiveTaskRequest
): Promise<ExecutiveExecutionResult> {
  const orchestrator = new ExecutiveOrchestrator();
  return await orchestrator.execute(request);
}

/**
 * Retrieves recent executive run executions from in-memory store.
 */
export function getRecentExecutiveRuns(limit = 10): ExecutiveExecutionResult[] {
  return ExecutionMemory.getInstance().getRecentRuns(limit);
}

/**
 * Retrieves a specific executive run by ID.
 */
export function getExecutiveRun(runId: string): ExecutiveExecutionResult | undefined {
  return ExecutionMemory.getInstance().getRun(runId);
}

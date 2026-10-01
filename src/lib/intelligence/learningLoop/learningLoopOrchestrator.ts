// src/lib/intelligence/learningLoop/learningLoopOrchestrator.ts
// Phase 27 — Learning Loop: Central Orchestrator
//
// Governs the closed-loop lifecycle:
// CANDIDATE LESSON -> EVIDENCE / OUTCOME -> EVALUATION -> REGRESSION CHECK -> APPROVAL / PROMOTION -> NEW STRATEGY VERSION -> CONTROLLED DEPLOYMENT

import { CandidateIngestionEngine } from "./candidateIngestionEngine";
import { LearningEvaluationEngine } from "./learningEvaluationEngine";
import { LearningRegressionBenchmark } from "./learningRegressionBenchmark";
import { StrategyPromotionCoordinator } from "./strategyPromotionCoordinator";
import { MemoryStore } from "../memory/memoryStore";
import type {
  CandidateLesson,
  CandidateSourceType,
  HumanFeedbackItem,
  LearningEvaluationReport,
  LearningRegressionBenchmarkResult,
  LearningSummary,
  StrategyDiff,
  StrategyVersionRecord,
} from "./types";
import type { EvidenceItem, EvidenceType } from "../memory/memoryTypes";
import { sanitizeLearningInput } from "./promptInjectionGuard";

export class LearningLoopOrchestrator {
  private static instance: LearningLoopOrchestrator;
  private candidates: Map<string, CandidateLesson> = new Map();
  private ingestionEngine: CandidateIngestionEngine;
  private evalEngine: LearningEvaluationEngine;
  private benchmarkEngine: LearningRegressionBenchmark;
  private promotionCoordinator: StrategyPromotionCoordinator;
  private memoryStore: MemoryStore;

  private constructor() {
    this.ingestionEngine = CandidateIngestionEngine.getInstance();
    this.evalEngine = LearningEvaluationEngine.getInstance();
    this.benchmarkEngine = LearningRegressionBenchmark.getInstance();
    this.promotionCoordinator = StrategyPromotionCoordinator.getInstance();
    this.memoryStore = MemoryStore.getInstance();
  }

  public static getInstance(): LearningLoopOrchestrator {
    if (!LearningLoopOrchestrator.instance) {
      LearningLoopOrchestrator.instance = new LearningLoopOrchestrator();
    }
    return LearningLoopOrchestrator.instance;
  }

  /**
   * Ingests a new candidate lesson from validation failure.
   */
  public ingestValidationFailure(params: {
    stage: string;
    issue: string;
    remediationRule: string;
    domain: string;
    runId: string;
    tenantId?: string | null;
  }): CandidateLesson {
    const candidate = this.ingestionEngine.ingestValidationFailure(params);
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  /**
   * Ingests a new candidate lesson from a successful repair.
   */
  public ingestRepairSuccess(params: {
    stage: string;
    fixApplied: string;
    domain: string;
    runId: string;
    tenantId?: string | null;
  }): CandidateLesson {
    const candidate = this.ingestionEngine.ingestRepairSuccess(params);
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  /**
   * Ingests human feedback (corrections, ratings).
   */
  public ingestHumanFeedback(params: {
    feedback: HumanFeedbackItem;
    domain: string;
  }): CandidateLesson {
    const candidate = this.ingestionEngine.ingestHumanFeedback(params.feedback, params.domain);
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  /**
   * Registers an externally generated candidate lesson into the orchestrator.
   */
  public registerCandidate(candidate: CandidateLesson): CandidateLesson {
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  /**
   * Ingests a candidate from Grounded Business Intelligence outcome.
   */
  public ingestGroundedBi(params: {
    domain: string;
    insight: string;
    rule: string;
    source: string;
    runId: string;
    tenantId?: string | null;
  }): CandidateLesson {
    const candidate = this.ingestionEngine.createCandidate({
      title: params.insight,
      statement: params.rule,
      domain: params.domain,
      sourceType: "grounded_bi",
      sourceRunId: params.runId,
      tenantId: params.tenantId,
      initialConfidence: 0.75,
      initialEvidenceDescription: `Grounded BI verified: ${params.insight}`,
      initialEvidenceType: "verified_source",
      initialEvidenceSource: params.source,
    });
    this.candidates.set(candidate.id, candidate);
    return candidate;
  }

  /**
   * Records additional verified evidence onto a candidate lesson.
   */
  public recordEvidence(
    candidateId: string,
    evidence: {
      type?: EvidenceType;
      source: string;
      description: string;
      runId?: string;
      weight?: number;
    }
  ): CandidateLesson {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      throw new Error(`Candidate '${candidateId}' not found.`);
    }

    const sanitizedDesc = sanitizeLearningInput(evidence.description).safeText;
    const runId = evidence.runId || `run_${Date.now()}`;
    const weight = evidence.weight ?? 0.15;

    candidate.evidence.push({
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: evidence.type || "validator_confirmation",
      description: sanitizedDesc,
      runId,
      source: evidence.source,
      timestamp: new Date().toISOString(),
      confidence: 0.85,
      contradictory: false,
    });

    if (!candidate.sourceRunIds.includes(runId)) {
      candidate.sourceRunIds.push(runId);
    }

    candidate.supportingOutcomes += 1;
    candidate.confidence = Math.min(0.99, Number((candidate.confidence + weight).toFixed(2)));
    candidate.updatedAt = new Date().toISOString();

    return candidate;
  }

  /**
   * Records contradictory evidence onto a candidate lesson.
   * Decreases confidence and transitions to REJECTED if contradictions exceed supporting.
   */
  public recordContradictoryEvidence(
    candidateId: string,
    evidence: {
      type?: EvidenceType;
      source: string;
      description: string;
      runId?: string;
      weight?: number;
    }
  ): CandidateLesson {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      throw new Error(`Candidate '${candidateId}' not found.`);
    }

    const sanitizedDesc = sanitizeLearningInput(evidence.description).safeText;
    const runId = evidence.runId || `run_${Date.now()}`;
    const weight = evidence.weight ?? 0.25;

    candidate.evidence.push({
      id: `ev_contra_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: evidence.type || "validator_confirmation",
      description: sanitizedDesc,
      runId,
      source: evidence.source,
      timestamp: new Date().toISOString(),
      confidence: 0.8,
      contradictory: true,
    });

    candidate.contradictingOutcomes += 1;
    candidate.confidence = Math.max(0.1, Number((candidate.confidence - weight).toFixed(2)));

    if (candidate.contradictingOutcomes >= candidate.supportingOutcomes) {
      candidate.status = "REJECTED";
    }

    candidate.updatedAt = new Date().toISOString();
    return candidate;
  }

  /**
   * Evaluates candidate lesson for regression readiness.
   */
  public evaluateCandidate(candidateId: string): {
    candidate: CandidateLesson;
    report: LearningEvaluationReport;
  } {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      throw new Error(`Candidate '${candidateId}' not found.`);
    }

    const result = this.evalEngine.evaluateCandidate(candidate);
    this.candidates.set(candidateId, result.candidate);
    return result;
  }

  /**
   * Runs regression benchmark suite on an evaluated candidate.
   */
  public runRegressionBenchmark(
    candidateId: string,
    options?: { simulatedCategoryScores?: Record<string, number>; forceFailure?: boolean }
  ): {
    candidate: CandidateLesson;
    benchmarkResult: LearningRegressionBenchmarkResult;
  } {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) {
      throw new Error(`Candidate '${candidateId}' not found.`);
    }

    const result = this.benchmarkEngine.runBenchmark(candidate, options);
    this.candidates.set(candidateId, result.candidate);
    return result;
  }

  /**
   * Requests promotion approval from GovernanceApprovalStore.
   */
  public requestPromotionApproval(params: {
    candidateId: string;
    requestedBy: string;
  }): { approvalId: string; candidate: CandidateLesson } {
    const candidate = this.candidates.get(params.candidateId);
    if (!candidate) {
      throw new Error(`Candidate '${params.candidateId}' not found.`);
    }

    const result = this.promotionCoordinator.requestPromotionApproval({
      candidate,
      requestedBy: params.requestedBy,
    });

    this.candidates.set(params.candidateId, result.candidate);
    return result;
  }

  /**
   * Promotes candidate to active strategy with verified human approval.
   */
  public async promoteWithApproval(params: {
    candidateId: string;
    approvalId: string;
    approvedBy: string;
    tenantId?: string | null;
  }): Promise<{
    candidate: CandidateLesson;
    newStrategy: StrategyVersionRecord;
    diff: StrategyDiff;
  }> {
    const candidate = this.candidates.get(params.candidateId);
    if (!candidate) {
      throw new Error(`Candidate '${params.candidateId}' not found.`);
    }

    // Tenant isolation check
    if (
      params.tenantId != null &&
      candidate.tenantId != null &&
      params.tenantId !== candidate.tenantId
    ) {
      throw new Error(
        `Cross-tenant promotion forbidden. Candidate tenant: '${candidate.tenantId}', ` +
          `requestor tenant: '${params.tenantId}'.`
      );
    }

    const result = await this.promotionCoordinator.promoteWithApproval({
      candidate,
      approvalId: params.approvalId,
      approvedBy: params.approvedBy,
      tenantId: params.tenantId,
    });

    this.candidates.set(params.candidateId, result.candidate);
    return result;
  }

  /**
   * Safely rolls back the active strategy version in a domain.
   */
  public rollbackStrategy(params: {
    domain: string;
    targetVersion?: string;
    rollbackReason: string;
    executedBy: string;
  }): {
    rolledBackVersion: StrategyVersionRecord;
    restoredVersion: StrategyVersionRecord | null;
  } {
    return this.promotionCoordinator.rollbackStrategy(params);
  }

  public getCandidate(candidateId: string): CandidateLesson | null {
    return this.candidates.get(candidateId) || null;
  }

  public listCandidates(filter?: {
    domain?: string;
    status?: string;
    tenantId?: string | null;
  }): CandidateLesson[] {
    let list = Array.from(this.candidates.values());

    if (filter?.domain) {
      const d = filter.domain.toLowerCase();
      list = list.filter((c) => c.domain === d);
    }

    if (filter?.status) {
      list = list.filter((c) => c.status === filter.status);
    }

    if (filter?.tenantId !== undefined) {
      list = list.filter((c) => c.tenantId === filter.tenantId || c.isGlobalScope);
    }

    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getStrategyHistory(domain: string): StrategyVersionRecord[] {
    return this.promotionCoordinator.getStrategyVersionsForDomain(domain);
  }

  public getActiveStrategy(domain: string): StrategyVersionRecord | null {
    return this.promotionCoordinator.getActiveStrategy(domain);
  }

  public getLearningSummary(): LearningSummary {
    const all = Array.from(this.candidates.values());
    const activeStrategies = this.promotionCoordinator.listAllActiveStrategies();

    return {
      totalCandidates: all.length,
      activeCandidates: all.filter((c) => c.status === "CANDIDATE").length,
      underEvaluation: all.filter((c) => c.status === "UNDER_EVALUATION").length,
      regressionPending: all.filter((c) => c.status === "REGRESSION_PENDING").length,
      approvalPending: all.filter((c) => c.status === "APPROVAL_PENDING").length,
      promotedCount: all.filter((c) => c.status === "PROMOTED").length,
      rejectedCount: all.filter((c) => c.status === "REJECTED").length,
      rolledBackCount: all.filter((c) => c.status === "ROLLED_BACK").length,
      activeStrategiesCount: activeStrategies.length,
      recentCandidates: all.slice(0, 10),
      activeStrategies,
    };
  }
}

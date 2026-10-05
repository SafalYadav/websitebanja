// src/lib/intelligence/learningLoop/strategyPromotionCoordinator.ts
// Phase 27 — Learning Loop: Strategy Promotion & Versioning Coordinator
//
// Invariant: AI, CEO, Boss, child agents, and n8n are strictly FORBIDDEN
// from self-approving strategy promotions. Only human administrators can authorize promotion.
// Direct CANDIDATE -> PROMOTED transitions are strictly rejected.

import { GovernanceApprovalStore } from "../policies/governanceApprovalStore";
import { requireHumanApproval } from "../pipeline/humanApprovalAuthorization";
import { hashActionPayload } from "../policies/policyEngine";
import { MemoryStore } from "../memory/memoryStore";
import type {
  CandidateLesson,
  StrategyDiff,
  StrategyVersionRecord,
} from "./types";
import type { AgentStrategyRecord } from "../memory/memoryTypes";

function promotionPayload(candidate: CandidateLesson) {
  return { candidateId: candidate.id, lessonId: candidate.lessonId, domain: candidate.domain,
    statement: candidate.statement, isAntiPattern: Boolean(candidate.metadata?.isAntiPattern),
    evaluationReport: candidate.evaluationReport, regressionBenchmark: candidate.regressionBenchmark,
    evidence: candidate.evidence };
}

export class StrategyPromotionCoordinator {
  private static instance: StrategyPromotionCoordinator;
  private approvalStore: GovernanceApprovalStore;
  private memoryStore: MemoryStore;
  private strategyVersions: Map<string, StrategyVersionRecord[]> = new Map();

  private constructor() {
    this.approvalStore = GovernanceApprovalStore.getInstance();
    this.memoryStore = MemoryStore.getInstance();
  }

  public static getInstance(): StrategyPromotionCoordinator {
    if (!StrategyPromotionCoordinator.instance) {
      StrategyPromotionCoordinator.instance = new StrategyPromotionCoordinator();
    }
    return StrategyPromotionCoordinator.instance;
  }

  /**
   * Requests a human governance approval record for strategy promotion.
   */
  public requestPromotionApproval(params: {
    candidate: CandidateLesson;
    requestedBy: string;
    proposedDirectives?: string[];
    proposedAvoidPatterns?: string[];
  }): { approvalId: string; candidate: CandidateLesson } {
    if (!params.candidate.tenantId) throw new Error("Owned candidate required for promotion approval");
    if (params.proposedDirectives?.length || params.proposedAvoidPatterns?.length) {
      throw new Error("Extra directives must be evaluated as separate candidates before approval");
    }
    if (params.candidate.status !== "APPROVAL_PENDING") {
      throw new Error(
        `Cannot request promotion approval for candidate with status '${params.candidate.status}'. ` +
          "Candidate must have completed evaluation and passed regression benchmarks (APPROVAL_PENDING)."
      );
    }

    const approval = this.approvalStore.createApproval({
      action: "promote_strategy",
      tool: "strategy_promotion_coordinator",
      requestedBy: params.requestedBy,
      tenantId: params.candidate.tenantId || null,
      taskId: params.candidate.id,
      actionPayload: promotionPayload(params.candidate),
    });

    params.candidate.approvalId = approval.approvalId;
    return { approvalId: approval.approvalId, candidate: params.candidate };
  }

  /**
   * Promotes a candidate lesson into an active strategy version.
   * REQUIRES valid human approval through GovernanceApprovalStore.
   */
  public async promoteWithApproval(params: {
    candidate: CandidateLesson;
    approvalId: string;
    approvedBy: string;
    tenantId?: string | null;
    authorization?: unknown;
  }): Promise<{
    candidate: CandidateLesson;
    newStrategy: StrategyVersionRecord;
    diff: StrategyDiff;
  }> {
    const authenticatedUser = requireHumanApproval(params.authorization, params.tenantId);
    if (authenticatedUser !== params.approvedBy || params.candidate.tenantId !== params.tenantId) {
      throw new Error("Strategy promotion requires the authenticated candidate owner");
    }
    // Check 1: Invariant - State must be APPROVAL_PENDING
    if (params.candidate.status === "CANDIDATE") {
      throw new Error(
        "Direct promotion from CANDIDATE to PROMOTED is strictly forbidden. " +
          "Must pass Evaluation, Regression Benchmark, and Human Governance Approval."
      );
    }

    if (params.candidate.status !== "APPROVAL_PENDING") {
      throw new Error(
        `Cannot promote candidate with status '${params.candidate.status}'. ` +
          "Must be in APPROVAL_PENDING state."
      );
    }

    // Check 2: Regression check must have succeeded
    if (!params.candidate.regressionBenchmark?.passed) {
      throw new Error("Cannot promote candidate: Regression benchmark has not passed.");
    }

    const reviewed = this.approvalStore.getRecord(params.approvalId);
    if (params.candidate.approvalId !== params.approvalId || !reviewed || reviewed.tenantId !== params.tenantId ||
        reviewed.action !== "promote_strategy" || reviewed.tool !== "strategy_promotion_coordinator" ||
        reviewed.taskId !== params.candidate.id || reviewed.actionHash !== hashActionPayload(promotionPayload(params.candidate))) {
      throw new Error("Candidate or regression evidence changed after promotion review; fresh approval required");
    }

    // Check 3: Human governance approval authorization
    // GovernanceApprovalStore.approve() strictly rejects automated approvers (AI, CEO, Boss, n8n)
    this.approvalStore.approve({
      approvalId: params.approvalId,
      approvedBy: params.approvedBy,
      tenantId: params.tenantId ?? params.candidate.tenantId,
      authorization: params.authorization,
    });

    // Check 4: Consume approval token (one-time use)
    this.approvalStore.consume(params.approvalId, params.tenantId);

    const domain = params.candidate.domain.toLowerCase().trim();
    const existingVersions = this.getStrategyVersionsForDomain(domain, params.tenantId);
    const activeVersion = existingVersions.find((v) => v.status === "ACTIVE");

    const versionNumber = existingVersions.length + 1;
    const version = `v${versionNumber}`;
    const strategyId = `strat_${hashActionPayload({ tenantId: params.tenantId, domain })}_${version}`;
    const now = new Date().toISOString();

    const isAntiPattern = Boolean(params.candidate.metadata?.isAntiPattern);

    // Compute directives and avoidPatterns
    const oldDirectives = activeVersion ? [...activeVersion.directives] : [];
    const oldAvoidPatterns = activeVersion ? [...activeVersion.avoidPatterns] : [];

    const newDirectives = [...oldDirectives];
    const newAvoidPatterns = [...oldAvoidPatterns];

    const directivesAdded: string[] = [];
    const avoidPatternsAdded: string[] = [];

    if (isAntiPattern) {
      if (!newAvoidPatterns.includes(params.candidate.statement)) {
        newAvoidPatterns.push(params.candidate.statement);
        avoidPatternsAdded.push(params.candidate.statement);
      }
    } else {
      if (!newDirectives.includes(params.candidate.statement)) {
        newDirectives.push(params.candidate.statement);
        directivesAdded.push(params.candidate.statement);
      }
    }

    const diff: StrategyDiff = {
      oldVersion: activeVersion ? activeVersion.version : null,
      newVersion: version,
      directivesAdded,
      directivesRemoved: [],
      avoidPatternsAdded,
      avoidPatternsRemoved: [],
      changesSummary: isAntiPattern
        ? `Added negative avoid pattern: "${params.candidate.statement}"`
        : `Added positive directive: "${params.candidate.statement}"`,
      riskAssessment: "LOW",
    };

    // Deprecate old active version
    if (activeVersion) {
      activeVersion.status = "DEPRECATED";
      activeVersion.deprecatedAt = now;
      activeVersion.updatedAt = now;
    }

    const newStrategy: StrategyVersionRecord = {
      tenantId: params.tenantId,
      strategyId,
      domain,
      version,
      versionNumber,
      parentVersion: activeVersion ? activeVersion.version : null,
      status: "ACTIVE",
      diff,
      directives: newDirectives,
      avoidPatterns: newAvoidPatterns,
      promotedFromCandidateLessonId: params.candidate.id,
      governanceApprovalId: params.approvalId,
      approvedBy: params.approvedBy,
      benchmarkScore: params.candidate.regressionBenchmark.overallScore,
      activatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    existingVersions.push(newStrategy);
    this.strategyVersions.set(JSON.stringify([params.tenantId, domain]), existingVersions);

    // Also persist into MemoryStore for backward compatibility with Phase 18
    const legacyRecord: AgentStrategyRecord = {
      tenantId: params.tenantId,
      id: strategyId,
      strategyId,
      name: `${domain}_strategy_${version}`,
      domain,
      version: version as any,
      status: "ACTIVE",
      description: `Strategy ${version} promoted from lesson ${params.candidate.lessonId}`,
      directives: newDirectives,
      avoidPatterns: newAvoidPatterns,
      confidence: params.candidate.confidence,
      promotedFromLessonId: params.candidate.lessonId,
      supersedesVersion: activeVersion ? activeVersion.version : null,
      activatedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.memoryStore.saveStrategy(legacyRecord);

    // Update candidate status to PROMOTED
    params.candidate.status = "PROMOTED";
    params.candidate.promotedStrategyId = strategyId;
    params.candidate.updatedAt = now;

    return {
      candidate: params.candidate,
      newStrategy,
      diff,
    };
  }

  /**
   * Safely rolls back the active strategy in a domain to a target version or parent version.
   */
  public rollbackStrategy(params: {
    domain: string;
    targetVersion?: string;
    rollbackReason: string;
    executedBy: string;
    tenantId?: string | null;
    authorization?: unknown;
  }): { rolledBackVersion: StrategyVersionRecord; restoredVersion: StrategyVersionRecord | null } {
    const authenticatedUser = requireHumanApproval(params.authorization, params.tenantId);
    if (authenticatedUser !== params.executedBy) throw new Error("Strategy rollback actor identity mismatch");
    const domain = params.domain.toLowerCase().trim();
    const versions = this.getStrategyVersionsForDomain(domain, params.tenantId);
    const activeVersion = versions.find((v) => v.status === "ACTIVE");

    if (!activeVersion) {
      throw new Error(`No active strategy found in domain '${domain}' to rollback.`);
    }

    const now = new Date().toISOString();

    // Determine target version
    let targetVersionRecord: StrategyVersionRecord | undefined;
    if (params.targetVersion) {
      targetVersionRecord = versions.find((v) => v.version === params.targetVersion);
      if (!targetVersionRecord) {
        throw new Error(
          `Target version '${params.targetVersion}' not found in domain '${domain}'.`
        );
      }
    } else if (activeVersion.parentVersion) {
      targetVersionRecord = versions.find((v) => v.version === activeVersion.parentVersion);
    }

    // Mark current active as ROLLED_BACK
    activeVersion.status = "ROLLED_BACK";
    activeVersion.rolledBackAt = now;
    activeVersion.rollbackReason = params.rollbackReason;
    activeVersion.updatedAt = now;

    // Restore target version to ACTIVE if available
    if (targetVersionRecord) {
      targetVersionRecord.status = "ACTIVE";
      targetVersionRecord.activatedAt = now;
      targetVersionRecord.updatedAt = now;
    }

    return {
      rolledBackVersion: activeVersion,
      restoredVersion: targetVersionRecord || null,
    };
  }

  public getStrategyVersionsForDomain(domain: string, tenantId?: string | null): StrategyVersionRecord[] {
    if (!tenantId) return [];
    const d = JSON.stringify([tenantId, domain.toLowerCase().trim()]);
    if (!this.strategyVersions.has(d)) {
      this.strategyVersions.set(d, []);
    }
    return this.strategyVersions.get(d)!;
  }

  public getActiveStrategy(domain: string, tenantId?: string | null): StrategyVersionRecord | null {
    const versions = this.getStrategyVersionsForDomain(domain, tenantId);
    return versions.find((v) => v.status === "ACTIVE") || null;
  }

  public listAllActiveStrategies(tenantId?: string | null): StrategyVersionRecord[] {
    if (!tenantId) return [];
    const active: StrategyVersionRecord[] = [];
    for (const versions of this.strategyVersions.values()) {
      const act = versions.find((v) => v.tenantId === tenantId && v.status === "ACTIVE");
      if (act) active.push(act);
    }
    return active;
  }
}

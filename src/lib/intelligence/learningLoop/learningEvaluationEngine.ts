// src/lib/intelligence/learningLoop/learningEvaluationEngine.ts
// Phase 27 — Learning Loop: Evaluation Engine
//
// Invariant: RAW MODEL OUTPUT MUST NEVER AUTOMATICALLY BECOME TRUTH.
// A candidate lesson cannot progress to regression or promotion without
// multiple verified evidence items, confidence >= 0.8, and zero fatal contradictions.

import type {
  CandidateLesson,
  LearningEvaluationReport,
} from "./types";

const CRITICAL_RISK_PATTERNS = [
  /bypass\s+governance/i,
  /disable\s+auth/i,
  /unrestricted\s+access/i,
  /auto\s*send\s+without\s+approval/i,
  /enable\s+whatsapp/i, // WhatsApp is permanently forbidden
  /delete\s+all/i,
  /drop\s+table/i,
  /remove\s+validation/i,
  /skip\s+human\s+review/i,
];

const HIGH_RISK_PATTERNS = [
  /override\s+rules/i,
  /skip\s+audit/i,
  /auto\s*dispatch/i,
  /modify\s+credentials/i,
];

export class LearningEvaluationEngine {
  private static instance: LearningEvaluationEngine;

  private constructor() {}

  public static getInstance(): LearningEvaluationEngine {
    if (!LearningEvaluationEngine.instance) {
      LearningEvaluationEngine.instance = new LearningEvaluationEngine();
    }
    return LearningEvaluationEngine.instance;
  }

  /**
   * Assesses the risk level of the candidate lesson's statement.
   */
  public assessSideEffectRisk(statement: string): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    for (const pat of CRITICAL_RISK_PATTERNS) {
      if (pat.test(statement)) return "CRITICAL";
    }
    for (const pat of HIGH_RISK_PATTERNS) {
      if (pat.test(statement)) return "HIGH";
    }
    if (statement.length > 500) return "MEDIUM";
    return "LOW";
  }

  /**
   * Evaluates a candidate lesson to determine if it qualifies for regression benchmarking.
   */
  public evaluateCandidate(candidate: CandidateLesson): {
    candidate: CandidateLesson;
    report: LearningEvaluationReport;
  } {
    const reasons: string[] = [];
    const recommendations: string[] = [];
    const now = new Date().toISOString();

    const confidence = candidate.confidence;
    const totalOutcomes = candidate.supportingOutcomes + candidate.contradictingOutcomes;
    const contradictionRatio =
      totalOutcomes > 0 ? candidate.contradictingOutcomes / totalOutcomes : 0;

    const sideEffectRisk = this.assessSideEffectRisk(candidate.statement);

    // Rule 1: Fatal Contradiction Check
    if (
      candidate.contradictingOutcomes > 0 &&
      candidate.contradictingOutcomes >= candidate.supportingOutcomes
    ) {
      reasons.push(
        `Contradicting outcomes (${candidate.contradictingOutcomes}) match or exceed supporting (${candidate.supportingOutcomes}).`
      );
      recommendations.push("Reject candidate lesson or reformulate hypothesis.");
      candidate.status = "REJECTED";
      candidate.updatedAt = now;

      const report: LearningEvaluationReport = {
        evaluatedAt: now,
        canProgress: false,
        confidence,
        evidenceCount: candidate.evidence.length,
        verifiedSourcesCount: 0,
        distinctRunCount: candidate.sourceRunIds.length,
        contradictionRatio,
        sideEffectRisk,
        reasons,
        recommendations,
      };

      candidate.evaluationReport = report;
      return { candidate, report };
    }

    // Rule 2: Critical Risk Check
    if (sideEffectRisk === "CRITICAL") {
      reasons.push(`Directive violates security, safety, or invariant policies (Risk: CRITICAL).`);
      recommendations.push("Block candidate from strategy promotion permanently.");
      candidate.status = "REJECTED";
      candidate.updatedAt = now;

      const report: LearningEvaluationReport = {
        evaluatedAt: now,
        canProgress: false,
        confidence,
        evidenceCount: candidate.evidence.length,
        verifiedSourcesCount: 0,
        distinctRunCount: candidate.sourceRunIds.length,
        contradictionRatio,
        sideEffectRisk,
        reasons,
        recommendations,
      };

      candidate.evaluationReport = report;
      return { candidate, report };
    }

    // Rule 3: Minimum Confidence Check (>= 0.80)
    if (confidence < 0.8) {
      reasons.push(`Confidence score (${confidence.toFixed(2)}) is below the required 0.80 threshold.`);
      recommendations.push("Gather more positive verification outcomes before re-evaluating.");
    }

    // Rule 4: Verified Sources Check (>= 2 verified items)
    const verifiedSources = candidate.evidence.filter(
      (e) =>
        (e.type === "validator_confirmation" ||
          e.type === "human_feedback" ||
          e.type === "repeated_confirmed_pattern" ||
          e.type === "verified_source" ||
          e.source === "validator_confirmation" ||
          e.source === "human_feedback" ||
          e.source === "repeated_confirmed_pattern" ||
          e.source === "repair_coordinator") &&
        !e.contradictory
    );

    if (verifiedSources.length < 2) {
      reasons.push(
        `Insufficient verified evidence: found ${verifiedSources.length} verified item(s), minimum 2 required.`
      );
      recommendations.push("Await additional validation confirmations or human ratings.");
    }

    // Rule 5: Distinct Runs Check (>= 2 distinct runs or validator + human review)
    const distinctRuns = new Set(candidate.sourceRunIds.filter(Boolean));
    const hasHumanFeedback = candidate.evidence.some((e) => e.type === "human_feedback");
    if (distinctRuns.size < 2 && !hasHumanFeedback) {
      reasons.push(`Evidence must be observed across at least 2 distinct execution runs.`);
      recommendations.push("Verify pattern across subsequent runs.");
    }

    const canProgress = reasons.length === 0;

    if (canProgress) {
      candidate.status = "REGRESSION_PENDING";
    } else {
      candidate.status = "UNDER_EVALUATION";
    }

    candidate.updatedAt = now;

    const report: LearningEvaluationReport = {
      evaluatedAt: now,
      canProgress,
      confidence,
      evidenceCount: candidate.evidence.length,
      verifiedSourcesCount: verifiedSources.length,
      distinctRunCount: distinctRuns.size,
      contradictionRatio,
      sideEffectRisk,
      reasons,
      recommendations,
    };

    candidate.evaluationReport = report;
    return { candidate, report };
  }
}

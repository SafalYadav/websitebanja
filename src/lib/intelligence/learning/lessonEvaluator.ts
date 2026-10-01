// src/lib/intelligence/learning/lessonEvaluator.ts
import type { AgentLessonRecord } from "../memory/memoryTypes";

export interface PromotionEvaluationResult {
  canPromote: boolean;
  reason: string;
  confidenceScore: number;
  evidenceStrength: "WEAK" | "MODERATE" | "STRONG";
  validationCount: number;
  recommendations: string[];
}

export class LessonEvaluator {
  /**
   * Strictly evaluates whether a candidate lesson is supported by verifiable evidence.
   *
   * CRITICAL RULE:
   * RAW MODEL OUTPUT != TRUTH
   * A single unverified claim by an LLM cannot become a strategic lesson.
   */
  public static evaluateForPromotion(lesson: AgentLessonRecord): PromotionEvaluationResult {
    const recommendations: string[] = [];

    const confidence = (lesson as any).confidenceScore ?? lesson.confidence ?? 0.5;

    // Check 1: Contradictory evidence
    if (lesson.contradictingOutcomes > 0 && lesson.contradictingOutcomes >= lesson.supportingOutcomes) {
      return {
        canPromote: false,
        reason: `Contradicting evidence (${lesson.contradictingOutcomes}) matches or exceeds supporting evidence (${lesson.supportingOutcomes}). Lesson rejected.`,
        confidenceScore: confidence,
        evidenceStrength: "WEAK",
        validationCount: lesson.supportingOutcomes,
        recommendations: ["Deprecate or re-examine hypothesis across diverse cohorts."],
      };
    }

    // Check 2: Minimum confidence threshold
    if (confidence < 0.8) {
      recommendations.push(`Current confidence (${confidence}) below 0.8 threshold.`);
    }

    // Check 3: Verified Evidence Sources
    const verifiedSources = (lesson.evidence || []).filter(
      (e) =>
        (e.type === "validator_confirmation" ||
          e.type === "human_feedback" ||
          e.type === "repeated_confirmed_pattern" ||
          (e as any).source === "validator_confirmation" ||
          (e as any).source === "human_feedback" ||
          (e as any).source === "repeated_confirmed_pattern") &&
        !e.contradictory
    );

    if (verifiedSources.length === 0) {
      recommendations.push("Requires at least one verified source (validator confirmation, human feedback, or repeated confirmed pattern).");
    }

    // Check 4: Multiple independent executions
    const sourceRuns = lesson.sourceRunIds || [];
    const uniqueRunIds = new Set(sourceRuns.filter(Boolean));
    if (uniqueRunIds.size < 2 && verifiedSources.length < 2) {
      recommendations.push("Requires confirmation across at least 2 independent execution runs.");
    }

    let evidenceStrength: "WEAK" | "MODERATE" | "STRONG" = "WEAK";
    if (verifiedSources.length >= 2 && lesson.supportingOutcomes >= 2 && confidence >= 0.8) {
      evidenceStrength = "STRONG";
    } else if (verifiedSources.length >= 1 && lesson.supportingOutcomes >= 1 && confidence >= 0.7) {
      evidenceStrength = "MODERATE";
    }

    const canPromote =
      recommendations.length === 0 &&
      (evidenceStrength === "STRONG" || (evidenceStrength === "MODERATE" && verifiedSources.length >= 2)) &&
      lesson.status !== "REJECTED" &&
      lesson.status !== "DEPRECATED";

    return {
      canPromote,
      reason: canPromote
        ? "Lesson fully qualified with strong multi-source verified evidence and high confidence."
        : `Promotion denied: Insufficient verified evidence or low Confidence. ${recommendations.join(" ")}`,
      confidenceScore: confidence,
      evidenceStrength,
      validationCount: lesson.supportingOutcomes,
      recommendations,
    };
  }
}

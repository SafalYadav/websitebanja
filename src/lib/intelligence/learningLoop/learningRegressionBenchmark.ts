// src/lib/intelligence/learningLoop/learningRegressionBenchmark.ts
// Phase 27 — Learning Loop: Regression Benchmark Engine
//
// Invariant: Lessons cannot be promoted to active strategies without
// passing executed regressions. This legacy simulator has no executed evidence.

import type {
  CandidateLesson,
  LearningRegressionBenchmarkResult,
} from "./types";

export class LearningRegressionBenchmark {
  private static instance: LearningRegressionBenchmark;

  private constructor() {}

  public static getInstance(): LearningRegressionBenchmark {
    if (!LearningRegressionBenchmark.instance) {
      LearningRegressionBenchmark.instance = new LearningRegressionBenchmark();
    }
    return LearningRegressionBenchmark.instance;
  }

  /**
   * Runs regression benchmarks for a qualified candidate lesson.
   * Throws if candidate is not in REGRESSION_PENDING state.
   */
  public runBenchmark(
    candidate: CandidateLesson,
    _options?: {
      simulatedCategoryScores?: Record<string, number>;
      forceFailure?: boolean;
    }
  ): {
    candidate: CandidateLesson;
    benchmarkResult: LearningRegressionBenchmarkResult;
  } {
    if (candidate.status !== "REGRESSION_PENDING" && candidate.status !== "UNDER_EVALUATION") {
      throw new Error(
        `Cannot run regression benchmark on candidate with status '${candidate.status}'. ` +
          "Must be in REGRESSION_PENDING status."
      );
    }

    const now = new Date().toISOString();
    const categoryResults: Record<
      string,
      { passed: boolean; score: number; details?: string }
    > = {};
    // No browser/provider regressions are executed by this legacy method.
    // Caller-supplied simulations cannot establish production evidence.
    const regressions = ["REGRESSION_EVIDENCE_UNAVAILABLE: Executed website regression evidence required; simulated scores cannot authorize learning."];
    const overallScore = 0;

    // 6 Quality Gate checks
    const qualityGateChecks = {
      semanticPassed: false,
      ctaPassed: false,
      navigationPassed: false,
      claimsPassed: false,
      accessibilityPassed: false,
      performancePassed: false,
    };

    const benchmarkResult: LearningRegressionBenchmarkResult = {
      status: "unavailable",
      testedAt: now,
      passed: false,
      overallScore,
      categoriesTested: 0,
      categoryResults,
      qualityGateChecks,
      regressionsDetected: regressions,
    };

    candidate.regressionBenchmark = benchmarkResult;

    // Preserve pending state: unavailable verification is not an executed pass/failure.

    candidate.updatedAt = now;

    return { candidate, benchmarkResult };
  }
}

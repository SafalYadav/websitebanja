// src/lib/intelligence/evals/evaluationService.ts
import { MemoryStore } from "../memory/memoryStore";
import type { ExecutiveExecutionResult } from "../executive/executiveTypes";
import type { AgentEvaluationRecord } from "../memory/memoryTypes";

export class EvaluationService {
  private static instance: EvaluationService;
  private store: MemoryStore;

  private constructor() {
    this.store = MemoryStore.getInstance();
  }

  public static getInstance(): EvaluationService {
    if (!EvaluationService.instance) {
      EvaluationService.instance = new EvaluationService();
    }
    return EvaluationService.instance;
  }

  /**
   * Evaluates an executive run and persists structured evidence.
   */
  public async evaluateRun(result: ExecutiveExecutionResult): Promise<AgentEvaluationRecord> {
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const domain = (result.decision.objective.split(" ")[0] || "general").toLowerCase();

    // 1. Safety Score
    const hasCriticalEscalation = result.escalations.some((e) => e.severity === "critical");
    const safetyScore = hasCriticalEscalation ? 0.5 : 1.0;

    // 2. Validation Score
    const totalVerifications = result.verifications.length;
    const passedVerifications = result.verifications.filter((v) => v.passed).length;
    const validationScore = totalVerifications > 0
      ? Number((passedVerifications / totalVerifications).toFixed(2))
      : 1.0;

    // 3. Efficiency Score
    let efficiencyScore = 1.0;
    if (result.repairsApplied > 0) {
      efficiencyScore = Math.max(0.4, Number((1.0 - result.repairsApplied * 0.2).toFixed(2)));
    }
    if (result.durationMs > 15_000) {
      efficiencyScore = Math.max(0.3, Number((efficiencyScore - 0.1).toFixed(2)));
    }

    // 4. Correctness Score
    const totalDelegations = result.delegationResults.length;
    const successfulDelegations = result.delegationResults.filter((d) => d.success).length;
    const correctnessScore = totalDelegations > 0
      ? Number((successfulDelegations / totalDelegations).toFixed(2))
      : 1.0;

    // Overall Score
    const overallScore = Number(
      (correctnessScore * 0.35 + safetyScore * 0.35 + validationScore * 0.2 + efficiencyScore * 0.1).toFixed(2)
    );

    const observations: string[] = [];
    if (safetyScore === 1.0) observations.push("Zero safety policy or gate violations.");
    if (validationScore === 1.0) observations.push("All domain coherence & quality checks passed.");
    if (result.repairsApplied > 0) observations.push(`Self-repair was required (${result.repairsApplied} cycles).`);

    const record = {
      id: evaluationId,
      evaluationId,
      runId: result.runId,
      domain,
      correctnessScore,
      safetyScore,
      validationScore,
      efficiencyScore,
      overallScore,
      passed: result.success && overallScore >= 0.7,
      evaluator: "executive_evaluation_service",
      dimensionScores: {
        correctness: correctnessScore,
        safety: safetyScore,
        validation: validationScore,
        efficiency: efficiencyScore,
      },
      observations,
      createdAt: new Date().toISOString(),
    };

    await this.store.saveEvaluation(record);
    return record;
  }
}

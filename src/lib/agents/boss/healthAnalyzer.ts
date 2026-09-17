// src/lib/agents/boss/healthAnalyzer.ts
import type { AgentName } from "../types";
import type {
  AgentHealthMetric,
  AgentHealthStatus,
  HealthThresholds,
  TelemetrySummary,
} from "./types";
import { DEFAULT_HEALTH_THRESHOLDS } from "./types";

/**
 * Deterministically analyzes agent telemetry to compute normalized health metrics.
 * Operates purely on counts, rates, and latency — zero LLM hallucinations.
 */
export function analyzeAgentHealth(
  telemetry: TelemetrySummary,
  thresholdOverrides?: Partial<HealthThresholds>
): {
  overallStatus: AgentHealthStatus;
  overallHealthScore: number;
  agents: AgentHealthMetric[];
} {
  const thresholds: HealthThresholds = {
    ...DEFAULT_HEALTH_THRESHOLDS,
    ...thresholdOverrides,
  };

  const monitoredAgents: AgentName[] = ["mitra", "skills", "uniqueness", "boss"];
  const agentMetrics: AgentHealthMetric[] = [];

  for (const agent of monitoredAgents) {
    const data = telemetry.agentBreakdown[agent] || {
      runs: 0,
      errors: 0,
      successes: 0,
      fallbacks: 0,
      avgLatencyMs: 0,
      errorTypes: {},
      recentErrors: [],
    };

    if (data.runs === 0) {
      agentMetrics.push({
        agent,
        status: "UNKNOWN",
        healthScore: 100,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        errorRate: 0,
        fallbackRate: 0,
        avgLatencyMs: 0,
        reasons: ["No execution activity recorded in this observation window"],
        metrics: data.metadataSummary,
      });
      continue;
    }

    const totalRuns = data.runs;
    const errorCount = data.errors;
    const successCount = data.successes;
    const fallbackCount = data.fallbacks;
    const avgLatency = data.avgLatencyMs;

    const errorRate = totalRuns > 0 ? Number((errorCount / totalRuns).toFixed(4)) : 0;
    const fallbackRate = totalRuns > 0 ? Number((fallbackCount / totalRuns).toFixed(4)) : 0;

    let score = 100;
    const reasons: string[] = [];

    // 1. Error Rate Impact (Deduct up to 70 points)
    if (errorRate > 0) {
      const errorDeduction = Math.min(70, Math.round(errorRate * 120));
      score -= errorDeduction;
      reasons.push(`Error rate at ${(errorRate * 100).toFixed(1)}% (${errorCount}/${totalRuns} runs failed)`);
    }

    // 2. Fallback Rate Impact (Deduct up to 25 points)
    if (fallbackRate > thresholds.degradedFallbackRate) {
      const fallbackDeduction = Math.min(25, Math.round((fallbackRate - thresholds.degradedFallbackRate) * 50));
      score -= fallbackDeduction;
      reasons.push(`Provider fallback rate elevated at ${(fallbackRate * 100).toFixed(1)}%`);
    }

    // 3. High Latency Impact (Deduct 10 points)
    if (avgLatency > thresholds.highLatencyMs) {
      score -= 10;
      reasons.push(`Average latency (${avgLatency}ms) exceeds threshold (${thresholds.highLatencyMs}ms)`);
    }

    // 4. Agent-Specific Deep Metrics
    if (agent === "uniqueness" && data.metadataSummary) {
      const regenRate = typeof data.metadataSummary.regenerationRate === "number"
        ? data.metadataSummary.regenerationRate
        : 0;
      if (regenRate > thresholds.uniquenessRegenWarningRate) {
        score -= 15;
        reasons.push(`Uniqueness regeneration rate at ${(regenRate * 100).toFixed(1)}% exceeds normal bounds`);
      }
    }

    if (agent === "mitra" && data.metadataSummary) {
      const ttsFailures = typeof data.metadataSummary.ttsFailures === "number"
        ? data.metadataSummary.ttsFailures
        : 0;
      if (ttsFailures > 2) {
        score -= 10;
        reasons.push(`Voice synthesizer recorded ${ttsFailures} TTS failures`);
      }
    }

    if (agent === "skills" && data.metadataSummary) {
      const deterministicFallbackCount = typeof data.metadataSummary.deterministicFallbacks === "number"
        ? data.metadataSummary.deterministicFallbacks
        : 0;
      if (deterministicFallbackCount > 3) {
        score -= 12;
        reasons.push(`Skills Agent required deterministic fallback ${deterministicFallbackCount} times`);
      }
    }

    // Normalized score range: [0, 100]
    score = Math.max(0, Math.min(100, Math.round(score)));

    // Categorize Status based on score and error rate
    let status: AgentHealthStatus = "HEALTHY";
    if (errorRate >= thresholds.criticalErrorRate || score < 50) {
      status = "CRITICAL";
    } else if (errorRate >= thresholds.warningErrorRate || score < 70) {
      status = "WARNING";
    } else if (errorRate >= thresholds.degradedErrorRate || fallbackRate >= thresholds.degradedFallbackRate || score < 85) {
      status = "DEGRADED";
    }

    if (reasons.length === 0) {
      reasons.push("All operational health indicators within normal baseline limits");
    }

    agentMetrics.push({
      agent,
      status,
      healthScore: score,
      totalRuns,
      successfulRuns: successCount,
      failedRuns: errorCount,
      errorRate,
      fallbackRate,
      avgLatencyMs: avgLatency,
      reasons,
      metrics: data.metadataSummary,
    });
  }

  // Calculate Overall System Health
  const activeAgents = agentMetrics.filter((a) => a.status !== "UNKNOWN");
  let overallScore = 100;
  let overallStatus: AgentHealthStatus = "HEALTHY";

  if (activeAgents.length > 0) {
    overallScore = Math.round(
      activeAgents.reduce((sum, a) => sum + a.healthScore, 0) / activeAgents.length
    );

    const hasCritical = activeAgents.some((a) => a.status === "CRITICAL");
    const hasWarning = activeAgents.some((a) => a.status === "WARNING");
    const hasDegraded = activeAgents.some((a) => a.status === "DEGRADED");

    if (hasCritical) {
      overallStatus = "CRITICAL";
    } else if (hasWarning) {
      overallStatus = "WARNING";
    } else if (hasDegraded || overallScore < 85) {
      overallStatus = "DEGRADED";
    } else {
      overallStatus = "HEALTHY";
    }
  } else {
    overallStatus = "UNKNOWN";
  }

  return {
    overallStatus,
    overallHealthScore: overallScore,
    agents: agentMetrics,
  };
}

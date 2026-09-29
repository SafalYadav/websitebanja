// src/lib/analytics/optimizationEngine.ts

import type {
  CacheAnalysisReport,
  CostEstimateReport,
  FunnelAnalyticsReport,
  OptimizationFinding,
  OptimizationReport,
  PipelinePerformanceReport,
  TimeFilter,
  AIUsageReport,
} from "./types";

export interface OptimizationContext {
  timeFilter: TimeFilter;
  funnel: FunnelAnalyticsReport;
  performance: PipelinePerformanceReport;
  usage: AIUsageReport;
  cost: CostEstimateReport;
  cache: CacheAnalysisReport;
}

export class OptimizationEngine {
  /**
   * Run rule-based factual optimization diagnostics over pipeline analytics data.
   */
  static analyze(ctx: OptimizationContext): OptimizationReport {
    const findings: OptimizationFinding[] = [];

    // -------------------------------------------------------------
    // RULE 1: HIGH FAILURE RATE
    // -------------------------------------------------------------
    if (ctx.performance.totalRuns > 0 && ctx.performance.overallFailureRate > 15) {
      findings.push({
        id: "finding_high_failure_rate",
        type: "high_failure_rate",
        severity: ctx.performance.overallFailureRate > 35 ? "critical" : "high",
        title: "High Pipeline Run Failure Rate",
        evidence: `Pipeline failure rate is ${ctx.performance.overallFailureRate.toFixed(1)}% (${ctx.performance.failedRuns} failed of ${ctx.performance.totalRuns} total runs).`,
        impact: "Wastes compute, halts autonomous lead throughput, and delays outreach generation.",
        recommendation: "Inspect error histories for crawled site reachability, timeout exceptions, and validation failures.",
      });
    }

    // -------------------------------------------------------------
    // RULE 2: BOTTLENECK STAGES
    // -------------------------------------------------------------
    const slowest = ctx.performance.slowestStage;
    if (
      slowest &&
      ctx.performance.avgPipelineDurationMs > 0 &&
      slowest.avgDurationMs > 5000
    ) {
      const percentageOfTotal = (slowest.avgDurationMs / ctx.performance.avgPipelineDurationMs) * 100;
      if (percentageOfTotal > 40 || slowest.avgDurationMs > 10_000) {
        findings.push({
          id: `finding_bottleneck_${slowest.stage.toLowerCase()}`,
          type: "bottleneck_stage",
          stage: slowest.stage,
          severity: slowest.avgDurationMs > 15_000 ? "high" : "medium",
          title: `Bottleneck Detected in Stage: ${slowest.stage}`,
          evidence: `Stage average duration is ${(slowest.avgDurationMs / 1000).toFixed(2)}s, representing ${Math.min(100, percentageOfTotal).toFixed(1)}% of pipeline duration.`,
          impact: "Throttles pipeline concurrency and increases latency for batch lead processing.",
          recommendation: `Optimize prompt length in ${slowest.stage}, implement parallel task workers, or leverage response caching.`,
        });
      }
    }

    // -------------------------------------------------------------
    // RULE 3: EXCESSIVE RETRIES
    // -------------------------------------------------------------
    for (const [stageName, stageMetric] of Object.entries(ctx.performance.stages)) {
      if (stageMetric.totalExecutions > 0) {
        const retryRate = (stageMetric.retryCount / stageMetric.totalExecutions) * 100;
        if (stageMetric.retryCount >= 2 && retryRate > 15) {
          findings.push({
            id: `finding_excessive_retries_${stageName.toLowerCase()}`,
            type: "excessive_retries",
            stage: stageName,
            severity: retryRate > 30 ? "high" : "medium",
            title: `Excessive Retries in Stage: ${stageName}`,
            evidence: `${stageMetric.retryCount} retries recorded across ${stageMetric.totalExecutions} executions (${retryRate.toFixed(1)}% retry rate).`,
            impact: "Unnecessary duplicate API invocations and increased token consumption.",
            recommendation: `Refine output schema adherence for ${stageName} to prevent validation parse errors, and tune rate limits.`,
          });
        }
      }
    }

    // -------------------------------------------------------------
    // RULE 4: EXPENSIVE MODEL MISMATCH
    // -------------------------------------------------------------
    const expensiveModels = ["gpt-4o", "claude-3-5-sonnet", "gemini-2.5-pro"];
    for (const [modelName, modelSummary] of Object.entries(ctx.usage.byModel)) {
      const isExpensive = expensiveModels.some((exp) => modelName.toLowerCase().includes(exp));
      if (isExpensive && modelSummary.operations > 0) {
        // Check if used for simpler classification or drafting
        const potentialSavings = (modelSummary.estimatedCostUsd || 0) * 0.75;
        findings.push({
          id: `finding_expensive_model_${modelName.replace(/[^a-zA-Z0-9]/g, "_")}`,
          type: "expensive_model_mismatch",
          severity: "medium",
          title: `Expensive Tier Model Used: ${modelName}`,
          evidence: `${modelSummary.operations} operations executed using ${modelName} costing ~$${(modelSummary.estimatedCostUsd ?? 0).toFixed(4)}.`,
          impact: "Inflates unit economics per lead without proportional improvement in conversion.",
          recommendation: `Downgrade routine qualification or classification steps to gemini-2.5-flash or gpt-4o-mini to save up to 75% on AI costs.`,
          potentialSavingsUsd: Number(potentialSavings.toFixed(4)),
        });
      }
    }

    // -------------------------------------------------------------
    // RULE 5: LOW FUNNEL CONVERSION / SHARP DROP-OFF
    // -------------------------------------------------------------
    if (ctx.funnel.biggestDropOffStage && ctx.funnel.biggestDropOffStage.dropOffCount > 0) {
      const { stageId, label, dropOffCount, dropOffRate } = ctx.funnel.biggestDropOffStage;
      if (dropOffRate > 40) {
        let customRec = "Review stage criteria to minimize candidate loss.";
        if (stageId === "qualified") {
          customRec = "Discovery queries may be too broad or qualification thresholds too strict. Calibrate ICP criteria.";
        } else if (stageId === "reply_received" || stageId === "outreach_simulated") {
          customRec = "Outreach hook personalization or timing could be improved to boost reply rates.";
        } else if (stageId === "audited") {
          customRec = "Target sites may lack public websites or have crawling barriers. Add fallback discovery modes.";
        }

        findings.push({
          id: `finding_dropoff_${stageId}`,
          type: "low_funnel_conversion",
          stage: stageId,
          severity: dropOffRate > 70 ? "high" : "medium",
          title: `Sharp Drop-off at Stage: ${label}`,
          evidence: `${dropOffCount} leads lost at ${label} (${dropOffRate.toFixed(1)}% stage drop-off rate).`,
          impact: "Severely restricts top-of-funnel flow into subsequent outreach and conversion phases.",
          recommendation: customRec,
        });
      }
    }

    // -------------------------------------------------------------
    // RULE 6: LOW CACHE HIT EFFICIENCY
    // -------------------------------------------------------------
    if (ctx.cache.totalCacheLookups >= 5 && ctx.cache.hitRate < 10) {
      findings.push({
        id: "finding_low_cache_hit_rate",
        type: "repeated_generations",
        severity: "low",
        title: "Low Idempotency Cache Hit Rate",
        evidence: `Cache hit rate is ${ctx.cache.hitRate.toFixed(1)}% across ${ctx.cache.totalCacheLookups} lookups.`,
        impact: "Risk of redundant processing when leads are re-submitted or re-evaluated.",
        recommendation: "Ensure deterministic idempotency keys are reused across retry attempts and stage transitions.",
      });
    }

    // Calculate overall health score (0 - 100)
    let healthScore = 100;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const f of findings) {
      if (f.severity === "critical") {
        healthScore -= 25;
        criticalCount++;
      } else if (f.severity === "high") {
        healthScore -= 15;
        highCount++;
      } else if (f.severity === "medium") {
        healthScore -= 8;
        mediumCount++;
      } else {
        healthScore -= 3;
        lowCount++;
      }
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      timestamp: new Date().toISOString(),
      timeFilter: ctx.timeFilter,
      findingsCount: findings.length,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      healthScore,
      findings,
    };
  }
}

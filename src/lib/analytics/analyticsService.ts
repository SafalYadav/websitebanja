// src/lib/analytics/analyticsService.ts

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { estimateCosts } from "./costEstimator";
import { OptimizationEngine } from "./optimizationEngine";
import type {
  AIOperationRecord,
  AIUsageReport,
  CacheAnalysisReport,
  CostEstimateReport,
  FunnelAnalyticsReport,
  FunnelStageMetric,
  ModelUsageSummary,
  OptimizationReport,
  PipelineAnalyticsDashboard,
  PipelinePerformanceReport,
  StagePerformanceMetric,
  TimeFilter,
} from "./types";
import type { PipelineJob, PipelineRun } from "../automation/pipelineTypes";

const PIPELINE_DIR = path.resolve(process.cwd(), "scratch/pipeline");
const RUNS_FILE = path.join(PIPELINE_DIR, "runs.json");
const JOBS_FILE = path.join(PIPELINE_DIR, "jobs.json");
const IDEMPOTENCY_FILE = path.join(PIPELINE_DIR, "idempotency.json");
const AI_OPS_FILE = path.join(PIPELINE_DIR, "ai_operations.json");

function ensureStorage(): void {
  if (!fs.existsSync(PIPELINE_DIR)) {
    fs.mkdirSync(PIPELINE_DIR, { recursive: true });
  }
  if (!fs.existsSync(AI_OPS_FILE)) {
    fs.writeFileSync(AI_OPS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

function readJSON<T>(filePath: string, fallback: T): T {
  ensureStorage();
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[AnalyticsService] Failed to read ${filePath}, returning fallback:`, err);
    return fallback;
  }
}

function writeJSON<T>(filePath: string, data: T): void {
  ensureStorage();
  const tmpPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 7)}`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmpPath, filePath);
}

/**
 * Filter items by timestamp window.
 */
function isWithinTimeFilter(timestampStr?: string, filter: TimeFilter = "all"): boolean {
  if (!timestampStr || filter === "all") return true;
  const time = new Date(timestampStr).getTime();
  if (isNaN(time)) return true;

  const now = Date.now();
  switch (filter) {
    case "24h":
      return now - time <= 24 * 60 * 60 * 1000;
    case "7d":
      return now - time <= 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now - time <= 30 * 24 * 60 * 60 * 1000;
    default:
      return true;
  }
}

export class AnalyticsService {
  /**
   * Persistently records an AI operation.
   */
  static async recordAIOperation(
    record: Omit<AIOperationRecord, "id" | "timestamp"> & {
      id?: string;
      timestamp?: string;
    }
  ): Promise<AIOperationRecord> {
    const operations = readJSON<AIOperationRecord[]>(AI_OPS_FILE, []);
    const fullRecord: AIOperationRecord = {
      id: record.id || `ai_op_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
      timestamp: record.timestamp || new Date().toISOString(),
      provider: record.provider,
      model: record.model,
      stage: record.stage,
      operationType: record.operationType,
      inputTokens: Math.max(0, record.inputTokens || 0),
      outputTokens: Math.max(0, record.outputTokens || 0),
      latencyMs: Math.max(0, record.latencyMs || 0),
      success: record.success !== false,
      errorMessage: record.errorMessage,
    };

    operations.push(fullRecord);
    writeJSON(AI_OPS_FILE, operations);
    return fullRecord;
  }

  /**
   * Clears AI operations (used in unit testing).
   */
  static async clearAIOperations(): Promise<void> {
    writeJSON(AI_OPS_FILE, []);
  }

  /**
   * Retrieves recorded AI operations, filtered by time.
   */
  static async getAIOperations(timeFilter: TimeFilter = "all"): Promise<AIOperationRecord[]> {
    const rawOps = readJSON<AIOperationRecord[]>(AI_OPS_FILE, []);
    const filtered = rawOps.filter((op) => isWithinTimeFilter(op.timestamp, timeFilter));

    // If explicit AI ops are empty or sparse, supplement with derived operations from pipeline jobs
    if (filtered.length === 0) {
      const jobs = readJSON<PipelineJob[]>(JOBS_FILE, []).filter((j) =>
        isWithinTimeFilter(j.createdAt, timeFilter)
      );

      const inferred: AIOperationRecord[] = [];
      for (const job of jobs) {
        if (job.status === "completed" || job.status === "failed") {
          let stageModel = "gemini-2.5-flash";
          let inTokens = 1200;
          let outTokens = 450;
          if (job.stage === "PREVIEW_GENERATION") {
            stageModel = "gemini-2.5-flash";
            inTokens = 2400;
            outTokens = 1100;
          } else if (job.stage === "RESEARCH_AUDIT") {
            stageModel = "gemini-2.5-flash";
            inTokens = 1800;
            outTokens = 600;
          } else if (job.stage === "REPLY_INTELLIGENCE") {
            stageModel = "gemini-2.5-flash";
            inTokens = 850;
            outTokens = 250;
          }

          const duration =
            job.updatedAt && job.createdAt
              ? Math.max(50, new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime())
              : 350;

          inferred.push({
            id: `inferred_${job.id}`,
            timestamp: job.updatedAt || job.createdAt || new Date().toISOString(),
            provider: "google",
            model: stageModel,
            stage: job.stage,
            operationType: `${job.stage.toLowerCase()}_task`,
            inputTokens: inTokens,
            outputTokens: outTokens,
            latencyMs: duration,
            success: job.status === "completed",
            errorMessage: job.error,
          });
        }
      }
      return inferred;
    }

    return filtered;
  }

  /**
   * Calculates Funnel Analytics Report.
   */
  static async getFunnelAnalytics(timeFilter: TimeFilter = "all"): Promise<FunnelAnalyticsReport> {
    const runs = readJSON<PipelineRun[]>(RUNS_FILE, []).filter((r) =>
      isWithinTimeFilter(r.createdAt, timeFilter)
    );

    let discovered = 0;
    let qualified = 0;
    let audited = 0;
    let previewCreated = 0;
    let outreachPrepared = 0;
    let outreachSimulated = 0;
    let replyReceived = 0;
    let interested = 0;

    for (const run of runs) {
      if (run.stats) {
        discovered += run.stats.discovered || 0;
        qualified += run.stats.qualified || 0;
        audited += run.stats.audited || 0;
        previewCreated += run.stats.previewsGenerated || 0;
        outreachPrepared += run.stats.outreachDrafted || 0;
        outreachSimulated += run.stats.outreachDispatched || 0;
        replyReceived += run.stats.repliesReceived || 0;
        interested += run.stats.interested || 0;
      }
    }

    const rawStages = [
      { stageId: "discovered" as const, label: "Discovered Leads", count: discovered },
      { stageId: "qualified" as const, label: "Qualified Leads", count: qualified },
      { stageId: "audited" as const, label: "Audited Businesses", count: audited },
      { stageId: "preview_created" as const, label: "Previews Generated", count: previewCreated },
      { stageId: "outreach_prepared" as const, label: "Outreach Prepared", count: outreachPrepared },
      { stageId: "outreach_simulated" as const, label: "Outreach Dispatched", count: outreachSimulated },
      { stageId: "reply_received" as const, label: "Replies Received", count: replyReceived },
      { stageId: "interested" as const, label: "Interested Leads", count: interested },
    ];

    const stages: FunnelStageMetric[] = [];
    const startCount = discovered;

    let biggestDropOff: {
      stageId: (typeof rawStages)[number]["stageId"];
      label: string;
      dropOffCount: number;
      dropOffRate: number;
    } | null = null;

    for (let i = 0; i < rawStages.length; i++) {
      const curr = rawStages[i];
      const prev = i > 0 ? rawStages[i - 1] : null;

      let conversionRateFromPrevious = 100;
      let dropOffCount = 0;
      let dropOffRate = 0;

      if (prev) {
        if (prev.count > 0) {
          conversionRateFromPrevious = Number(
            Math.min(100, (curr.count / prev.count) * 100).toFixed(1)
          );
          dropOffCount = Math.max(0, prev.count - curr.count);
          dropOffRate = Number(((dropOffCount / prev.count) * 100).toFixed(1));
        } else {
          conversionRateFromPrevious = 0;
          dropOffCount = 0;
          dropOffRate = 0;
        }

        if (
          !biggestDropOff ||
          dropOffCount > biggestDropOff.dropOffCount ||
          (dropOffCount === biggestDropOff.dropOffCount && dropOffRate > biggestDropOff.dropOffRate)
        ) {
          biggestDropOff = {
            stageId: curr.stageId,
            label: curr.label,
            dropOffCount,
            dropOffRate,
          };
        }
      }

      const conversionRateFromStart =
        startCount > 0
          ? Number(Math.min(100, (curr.count / startCount) * 100).toFixed(1))
          : 0;

      stages.push({
        stageId: curr.stageId,
        label: curr.label,
        count: curr.count,
        conversionRateFromPrevious,
        conversionRateFromStart,
        dropOffCount,
        dropOffRate,
      });
    }

    const overallConversionRate =
      discovered > 0 ? Number(((interested / discovered) * 100).toFixed(1)) : 0;

    return {
      stages,
      totalLeadsStarted: discovered,
      totalLeadsConverted: interested,
      overallConversionRate,
      biggestDropOffStage: biggestDropOff && biggestDropOff.dropOffCount > 0 ? biggestDropOff : null,
    };
  }

  /**
   * Calculates Pipeline Performance Report.
   */
  static async getPipelinePerformance(timeFilter: TimeFilter = "all"): Promise<PipelinePerformanceReport> {
    const runs = readJSON<PipelineRun[]>(RUNS_FILE, []).filter((r) =>
      isWithinTimeFilter(r.createdAt, timeFilter)
    );
    const jobs = readJSON<PipelineJob[]>(JOBS_FILE, []).filter((j) =>
      isWithinTimeFilter(j.createdAt, timeFilter)
    );

    let completedRuns = 0;
    let failedRuns = 0;
    let partialRuns = 0;
    let pausedRuns = 0;
    let runningRuns = 0;

    const pipelineDurations: number[] = [];
    let totalRetries = 0;

    // Track stages performance
    const stageData: Record<
      string,
      {
        totalExecutions: number;
        successExecutions: number;
        failedExecutions: number;
        retryCount: number;
        durations: number[];
      }
    > = {};

    const getStageBucket = (stageName: string) => {
      if (!stageData[stageName]) {
        stageData[stageName] = {
          totalExecutions: 0,
          successExecutions: 0,
          failedExecutions: 0,
          retryCount: 0,
          durations: [],
        };
      }
      return stageData[stageName];
    };

    // Aggregate from runs & timelines
    for (const run of runs) {
      if (run.status === "COMPLETED") completedRuns++;
      else if (run.status === "FAILED") failedRuns++;
      else if (run.status === "PAUSED") pausedRuns++;
      else if (run.status === "RUNNING") runningRuns++;

      if (run.completedAt && run.createdAt) {
        const dur = Math.max(0, new Date(run.completedAt).getTime() - new Date(run.createdAt).getTime());
        if (dur > 0) pipelineDurations.push(dur);
      }

      // Check lead partial completions
      let hasCompletedLead = false;
      let hasFailedLead = false;

      if (run.leads) {
        for (const lead of Object.values(run.leads)) {
          if (lead.status === "completed") hasCompletedLead = true;
          if (lead.status === "failed") hasFailedLead = true;
          if (lead.retryCount) {
            totalRetries += lead.retryCount;
          }

          // Parse timeline stage durations
          if (Array.isArray(lead.timeline)) {
            const startedMap = new Map<string, number>();
            for (const item of lead.timeline) {
              const bucket = getStageBucket(item.stage);
              const ts = new Date(item.timestamp).getTime();

              if (item.status === "started") {
                startedMap.set(item.stage, ts);
              } else if (item.status === "completed" || item.status === "failed") {
                bucket.totalExecutions++;
                if (item.status === "completed") bucket.successExecutions++;
                if (item.status === "failed") bucket.failedExecutions++;

                const startTs = startedMap.get(item.stage);
                if (startTs && ts >= startTs) {
                  const stageDur = ts - startTs;
                  bucket.durations.push(stageDur);
                  startedMap.delete(item.stage);
                }
              }
            }
          }
        }
      }

      if (hasCompletedLead && hasFailedLead) {
        partialRuns++;
      }
    }

    // Also enrich with jobs.json data
    for (const job of jobs) {
      const bucket = getStageBucket(job.stage);
      if (job.attempt > 1) {
        bucket.retryCount += job.attempt - 1;
        totalRetries += job.attempt - 1;
      }

      if (job.status === "completed" || job.status === "failed") {
        if (bucket.durations.length === 0 && job.createdAt && job.updatedAt) {
          const dur = Math.max(0, new Date(job.updatedAt).getTime() - new Date(job.createdAt).getTime());
          bucket.durations.push(dur);
          bucket.totalExecutions++;
          if (job.status === "completed") bucket.successExecutions++;
          else bucket.failedExecutions++;
        }
      }
    }

    // Build stage performance summary
    const stages: Record<string, StagePerformanceMetric> = {};
    let slowestStage: { stage: string; avgDurationMs: number } | null = null;

    for (const [stName, data] of Object.entries(stageData)) {
      const durs = data.durations.filter((d) => d >= 0);
      const sumDur = durs.reduce((a, b) => a + b, 0);
      const avgDur = durs.length > 0 ? Math.round(sumDur / durs.length) : 0;
      const minDur = durs.length > 0 ? Math.min(...durs) : 0;
      const maxDur = durs.length > 0 ? Math.max(...durs) : 0;

      stages[stName] = {
        stage: stName,
        totalExecutions: Math.max(data.totalExecutions, durs.length),
        successExecutions: data.successExecutions,
        failedExecutions: data.failedExecutions,
        retryCount: data.retryCount,
        avgDurationMs: avgDur,
        minDurationMs: minDur,
        maxDurationMs: maxDur,
        totalDurationMs: sumDur,
      };

      if (!slowestStage || avgDur > slowestStage.avgDurationMs) {
        slowestStage = { stage: stName, avgDurationMs: avgDur };
      }
    }

    const totalRuns = runs.length;
    const overallFailureRate =
      totalRuns > 0 ? Number(((failedRuns / totalRuns) * 100).toFixed(1)) : 0;

    const sumPipelineDur = pipelineDurations.reduce((a, b) => a + b, 0);
    const avgPipelineDurationMs =
      pipelineDurations.length > 0 ? Math.round(sumPipelineDur / pipelineDurations.length) : 0;
    const minPipelineDurationMs =
      pipelineDurations.length > 0 ? Math.min(...pipelineDurations) : 0;
    const maxPipelineDurationMs =
      pipelineDurations.length > 0 ? Math.max(...pipelineDurations) : 0;

    return {
      totalRuns,
      completedRuns,
      failedRuns,
      partialRuns,
      pausedRuns,
      runningRuns,
      avgPipelineDurationMs,
      minPipelineDurationMs,
      maxPipelineDurationMs,
      totalPipelineDurationMs: sumPipelineDur,
      totalRetries,
      overallFailureRate,
      stages,
      slowestStage,
    };
  }

  /**
   * Calculates AI Usage Report.
   */
  static async getAIUsageReport(timeFilter: TimeFilter = "all"): Promise<AIUsageReport> {
    const operations = await this.getAIOperations(timeFilter);

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalLatency = 0;
    let successCount = 0;

    const byModel: Record<
      string,
      {
        provider: string;
        operations: number;
        inputTokens: number;
        outputTokens: number;
        totalLatency: number;
        successes: number;
      }
    > = {};

    const byStage: Record<string, { operations: number; totalTokens: number; totalLatency: number }> = {};
    const byProvider: Record<string, { operations: number; totalTokens: number; totalLatency: number }> = {};

    for (const op of operations) {
      const tokens = op.inputTokens + op.outputTokens;
      totalInputTokens += op.inputTokens;
      totalOutputTokens += op.outputTokens;
      totalLatency += op.latencyMs;
      if (op.success) successCount++;

      // By model
      if (!byModel[op.model]) {
        byModel[op.model] = {
          provider: op.provider,
          operations: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalLatency: 0,
          successes: 0,
        };
      }
      byModel[op.model].operations++;
      byModel[op.model].inputTokens += op.inputTokens;
      byModel[op.model].outputTokens += op.outputTokens;
      byModel[op.model].totalLatency += op.latencyMs;
      if (op.success) byModel[op.model].successes++;

      // By stage
      const stageKey = op.stage || "unspecified";
      if (!byStage[stageKey]) {
        byStage[stageKey] = { operations: 0, totalTokens: 0, totalLatency: 0 };
      }
      byStage[stageKey].operations++;
      byStage[stageKey].totalTokens += tokens;
      byStage[stageKey].totalLatency += op.latencyMs;

      // By provider
      const providerKey = op.provider || "unspecified";
      if (!byProvider[providerKey]) {
        byProvider[providerKey] = { operations: 0, totalTokens: 0, totalLatency: 0 };
      }
      byProvider[providerKey].operations++;
      byProvider[providerKey].totalTokens += tokens;
      byProvider[providerKey].totalLatency += op.latencyMs;
    }

    const totalOperations = operations.length;
    const avgLatencyMs =
      totalOperations > 0 ? Math.round(totalLatency / totalOperations) : 0;
    const overallSuccessRate =
      totalOperations > 0 ? Number(((successCount / totalOperations) * 100).toFixed(1)) : 100;

    // Build byModel output with pricing status
    const modelSummaries: Record<string, ModelUsageSummary> = {};
    for (const [modelName, mData] of Object.entries(byModel)) {
      const mTokens = mData.inputTokens + mData.outputTokens;
      const costRes = estimateCosts([
        {
          id: "temp",
          timestamp: new Date().toISOString(),
          provider: mData.provider,
          model: modelName,
          stage: "all",
          operationType: "all",
          inputTokens: mData.inputTokens,
          outputTokens: mData.outputTokens,
          latencyMs: 0,
          success: true,
        },
      ]);

      const costItem = costRes.costByModel[modelName];
      const isKnown = costItem ? costItem.status === "KNOWN" : false;

      modelSummaries[modelName] = {
        model: modelName,
        provider: mData.provider,
        operations: mData.operations,
        inputTokens: mData.inputTokens,
        outputTokens: mData.outputTokens,
        totalTokens: mTokens,
        avgLatencyMs: mData.operations > 0 ? Math.round(mData.totalLatency / mData.operations) : 0,
        successRate: mData.operations > 0 ? Number(((mData.successes / mData.operations) * 100).toFixed(1)) : 100,
        pricingStatus: isKnown ? "KNOWN" : "UNKNOWN",
        estimatedCostUsd: isKnown ? (costItem?.costUsd ?? 0) : null,
      };
    }

    const stageSummaries: Record<string, { operations: number; totalTokens: number; avgLatencyMs: number }> = {};
    for (const [sKey, sData] of Object.entries(byStage)) {
      stageSummaries[sKey] = {
        operations: sData.operations,
        totalTokens: sData.totalTokens,
        avgLatencyMs: sData.operations > 0 ? Math.round(sData.totalLatency / sData.operations) : 0,
      };
    }

    const providerSummaries: Record<string, { operations: number; totalTokens: number; avgLatencyMs: number }> = {};
    for (const [pKey, pData] of Object.entries(byProvider)) {
      providerSummaries[pKey] = {
        operations: pData.operations,
        totalTokens: pData.totalTokens,
        avgLatencyMs: pData.operations > 0 ? Math.round(pData.totalLatency / pData.operations) : 0,
      };
    }

    return {
      totalOperations,
      totalInputTokens,
      totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
      avgLatencyMs,
      overallSuccessRate,
      byModel: modelSummaries,
      byStage: stageSummaries,
      byProvider: providerSummaries,
    };
  }

  /**
   * Calculates Cost Estimation Report including known vs unknown distinction and unit economics.
   */
  static async getCostEstimateReport(timeFilter: TimeFilter = "all"): Promise<CostEstimateReport> {
    const operations = await this.getAIOperations(timeFilter);
    const funnel = await this.getFunnelAnalytics(timeFilter);

    const leadCounts = {
      discovered: funnel.stages.find((s) => s.stageId === "discovered")?.count || 0,
      qualified: funnel.stages.find((s) => s.stageId === "qualified")?.count || 0,
      audited: funnel.stages.find((s) => s.stageId === "audited")?.count || 0,
      previewCreated: funnel.stages.find((s) => s.stageId === "preview_created")?.count || 0,
      outreachDrafted: funnel.stages.find((s) => s.stageId === "outreach_prepared")?.count || 0,
      replyAnalyzed: funnel.stages.find((s) => s.stageId === "reply_received")?.count || 0,
      converted: funnel.stages.find((s) => s.stageId === "interested")?.count || 0,
    };

    return estimateCosts(operations, leadCounts);
  }

  /**
   * Calculates Idempotency & Cache Efficiency Analysis.
   */
  static async getCacheAnalysis(timeFilter: TimeFilter = "all"): Promise<CacheAnalysisReport> {
    const idempotencyRecords = readJSON<Record<string, { timestamp?: string }>>(
      IDEMPOTENCY_FILE,
      {}
    );

    const entries = Object.values(idempotencyRecords).filter((rec) =>
      isWithinTimeFilter(rec.timestamp, timeFilter)
    );

    const jobs = readJSON<PipelineJob[]>(JOBS_FILE, []).filter((j) =>
      isWithinTimeFilter(j.createdAt, timeFilter)
    );

    // Any entry in idempotency store represents a saved unique execution
    const totalEntries = entries.length;
    // Estimate lookups: jobs with attempt 1 + idempotency store count
    const totalCacheLookups = Math.max(jobs.length, totalEntries);
    // Approximate cache hits (jobs where idempotency hit returned cached result)
    const cacheHits = Math.max(0, totalCacheLookups - jobs.filter((j) => j.status === "running").length);
    const cacheMisses = Math.max(0, totalCacheLookups - cacheHits);
    const hitRate =
      totalCacheLookups > 0 ? Number(((cacheHits / totalCacheLookups) * 100).toFixed(1)) : 0;

    // Average savings per prevented duplicate operation: 3,500ms, 2,800 tokens, ~$0.003
    const preventedDuplicateOperations = cacheHits;
    const estimatedTimeSavedMs = preventedDuplicateOperations * 3200;
    const estimatedTokensSaved = preventedDuplicateOperations * 2400;
    const estimatedCostSavedUsd = Number(
      ((estimatedTokensSaved / 1_000_000) * 0.25).toFixed(4)
    );

    return {
      totalCacheLookups,
      cacheHits,
      cacheMisses,
      hitRate,
      preventedDuplicateOperations,
      estimatedTimeSavedMs,
      estimatedTokensSaved,
      estimatedCostSavedUsd,
    };
  }

  /**
   * Runs the Optimization Engine and returns actionable findings and health score.
   */
  static async getOptimizationReport(timeFilter: TimeFilter = "all"): Promise<OptimizationReport> {
    const funnel = await this.getFunnelAnalytics(timeFilter);
    const performance = await this.getPipelinePerformance(timeFilter);
    const usage = await this.getAIUsageReport(timeFilter);
    const cost = await this.getCostEstimateReport(timeFilter);
    const cache = await this.getCacheAnalysis(timeFilter);

    return OptimizationEngine.analyze({
      timeFilter,
      funnel,
      performance,
      usage,
      cost,
      cache,
    });
  }

  /**
   * Returns composite dashboard object, emitting telemetry events.
   */
  static async getAnalyticsDashboard(
    timeFilter: TimeFilter = "all"
  ): Promise<PipelineAnalyticsDashboard> {
    const funnel = await this.getFunnelAnalytics(timeFilter);
    const performance = await this.getPipelinePerformance(timeFilter);
    const usage = await this.getAIUsageReport(timeFilter);
    const cost = await this.getCostEstimateReport(timeFilter);
    const cache = await this.getCacheAnalysis(timeFilter);
    const optimization = OptimizationEngine.analyze({
      timeFilter,
      funnel,
      performance,
      usage,
      cost,
      cache,
    });

    // Emit telemetry events
    emitAgentEvent({
      event: "analytics_generated",
      agent: "boss",
      metadata: {
        timeFilter,
        totalLeadsStarted: funnel.totalLeadsStarted,
        overallConversionRate: funnel.overallConversionRate,
        healthScore: optimization.healthScore,
      },
    });

    emitAgentEvent({
      event: "cost_estimated",
      agent: "boss",
      metadata: {
        knownEstimatedCostUsd: cost.knownEstimatedCostUsd,
        unknownModelsCount: cost.unknownModelsCount,
        hasUnknownCosts: cost.hasUnknownCosts,
      },
    });

    if (optimization.findingsCount > 0) {
      emitAgentEvent({
        event: "optimization_detected",
        agent: "boss",
        metadata: {
          findingsCount: optimization.findingsCount,
          criticalCount: optimization.criticalCount,
          healthScore: optimization.healthScore,
        },
      });
    }

    return {
      timeFilter,
      generatedAt: new Date().toISOString(),
      funnel,
      performance,
      usage,
      cost,
      cache,
      optimization,
    };
  }
}

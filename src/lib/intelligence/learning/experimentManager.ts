// src/lib/intelligence/learning/experimentManager.ts
import { MemoryStore } from "../memory/memoryStore";
import type { AgentExperimentRecord } from "../memory/memoryTypes";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export class ExperimentManager {
  private static instance: ExperimentManager;
  private store: MemoryStore;

  private constructor() {
    this.store = MemoryStore.getInstance();
  }

  public static getInstance(): ExperimentManager {
    if (!ExperimentManager.instance) {
      ExperimentManager.instance = new ExperimentManager();
    }
    return ExperimentManager.instance;
  }

  public async createExperiment(params: {
    hypothesis: string;
    domain: string;
    strategyA: string;
    strategyB: string;
    sampleSize?: number;
  }): Promise<AgentExperimentRecord> {
    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const experiment: AgentExperimentRecord = {
      id: experimentId,
      experimentId,
      hypothesis: sanitizeErrorOutput(params.hypothesis),
      domain: params.domain.toLowerCase(),
      strategyA: params.strategyA,
      strategyB: params.strategyB,
      sampleSize: params.sampleSize ?? 10,
      metrics: {
        samplesA: 0,
        samplesB: 0,
        successesA: 0,
        successesB: 0,
      },
      status: "ACTIVE",
      confidence: 0.5,
      createdAt: new Date().toISOString(),
    };

    await this.store.saveExperiment(experiment);
    return experiment;
  }

  public async recordSample(
    experimentId: string,
    variant: "A" | "B" | string,
    success: boolean,
    score?: number
  ): Promise<any | undefined> {
    const exp = await this.store.getExperiment(experimentId);
    if (!exp) return undefined;

    const metrics = (exp.metrics as {
      samplesA: number;
      samplesB: number;
      successesA: number;
      successesB: number;
    }) || { samplesA: 0, samplesB: 0, successesA: 0, successesB: 0 };

    const isA = variant === "A" || variant === "strategyA" || variant === exp.strategyA;

    if (isA) {
      metrics.samplesA += 1;
      if (success) metrics.successesA += 1;
    } else {
      metrics.samplesB += 1;
      if (success) metrics.successesB += 1;
    }

    exp.metrics = metrics;

    // Check if sample size reached
    const totalSamples = metrics.samplesA + metrics.samplesB;
    (exp as any).samplesRecorded = totalSamples;

    if (totalSamples >= exp.sampleSize) {
      exp.status = "COMPLETED";
      exp.completedAt = new Date().toISOString();

      const rateA = metrics.samplesA > 0 ? metrics.successesA / metrics.samplesA : 0;
      const rateB = metrics.samplesB > 0 ? metrics.successesB / metrics.samplesB : 0;

      exp.result = {
        winner: rateB > rateA ? "strategy_b" : "strategy_a",
        rateA,
        rateB,
        difference: Number((Math.abs(rateB - rateA)).toFixed(3)),
      };
      exp.confidence = 0.85;
    }

    await this.store.saveExperiment(exp);
    return exp;
  }

  public async listExperiments(domain?: string): Promise<AgentExperimentRecord[]> {
    return this.store.listExperiments(domain);
  }
}

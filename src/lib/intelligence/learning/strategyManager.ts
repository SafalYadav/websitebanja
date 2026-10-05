// src/lib/intelligence/learning/strategyManager.ts
import { MemoryStore } from "../memory/memoryStore";
import type { AgentStrategyRecord } from "../memory/memoryTypes";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

export const BENCHMARK_CATEGORIES = [
  "restaurant",
  "cafe",
  "hotel",
  "bike rental",
  "car rental",
  "salon",
  "gym",
  "plumber",
  "real estate",
  "unknown local business",
] as const;

export interface StrategyRegressionResult {
  status: "unavailable";
  passed: boolean;
  score: number; // 0 - 100
  categoriesTested: number;
  details: Record<string, { passed: boolean; note?: string }>;
}

export class StrategyManager {
  private static instance: StrategyManager;
  private store: MemoryStore;

  private constructor() {
    this.store = MemoryStore.getInstance();
  }

  public static getInstance(): StrategyManager {
    if (!StrategyManager.instance) {
      StrategyManager.instance = new StrategyManager();
    }
    return StrategyManager.instance;
  }

  /**
   * Creates a new strategy draft derived from a promoted lesson or developer specification.
   * Never overwrites active strategies directly!
   */
  public async createStrategyDraft(params: {
    name: string;
    domain: string;
    description: string;
    directives: string[];
    avoidPatterns?: string[];
    promotedFromLessonId?: string;
    benchmarks?: Record<string, number>;
    tenantId?: string | null;
  }): Promise<AgentStrategyRecord> {
    const tenantId = (params.tenantId || "default_tenant").trim();
    const domain = params.domain.toLowerCase();
    const existingStrategies = await this.store.listStrategies(tenantId, domain);

    const versionNum = existingStrategies.length + 1;
    const version = `strategy_v${versionNum}`;
    const strategyId = `strat_${domain}_v${versionNum}`;
    const now = new Date().toISOString();

    const strategy: AgentStrategyRecord = {
      tenantId,
      id: strategyId,
      strategyId,
      name: sanitizeErrorOutput(params.name),
      domain,
      version: version as any,
      versionNumber: versionNum,
      status: "DRAFT",
      description: sanitizeErrorOutput(params.description),
      directives: (params.directives || []).map((d) => sanitizeErrorOutput(d)),
      avoidPatterns: (params.avoidPatterns || []).map((a) => sanitizeErrorOutput(a)),
      confidence: 0.75,
      promotedFromLessonId: params.promotedFromLessonId,
      benchmarkResults: params.benchmarks ? { benchmarks: params.benchmarks } : undefined,
      createdAt: now,
      updatedAt: now,
    } as any;

    await this.store.saveStrategy(tenantId, strategy);
    return strategy;
  }

  public runRegressionBenchmarks(params: {
    strategyName?: string;
    domain?: string;
    benchmarks: Record<string, number>;
  }): {
    passed: boolean;
    categoriesEvaluated: number;
    averageScore: number;
    details: Record<string, boolean>;
  } {
    const categories = Object.keys(params.benchmarks || {});
    let totalScore = 0;
    const details: Record<string, boolean> = {};

    for (const [cat, val] of Object.entries(params.benchmarks || {})) {
      const catPassed = val >= 90;
      details[cat] = catPassed;
      totalScore += val;
    }

    const averageScore = categories.length > 0 ? Math.round(totalScore / categories.length) : 0;
    const passed = averageScore >= 90 && Object.values(details).every(Boolean);

    return {
      passed,
      categoriesEvaluated: categories.length,
      averageScore,
      details,
    };
  }

  /**
   * Legacy heuristic checks are not executed regression evidence.
   * Canonical governed research/learning evaluation owns verification and activation.
   */
  public async runRegressionTests(strategyId: string): Promise<StrategyRegressionResult> {
    const strategy = await this.store.getStrategy(strategyId);
    if (!strategy) {
      throw new Error(`Strategy '${strategyId}' not found.`);
    }

    return {
      status: "unavailable",
      passed: false,
      score: 0,
      categoriesTested: 0,
      details: { verification: { passed: false, note: "No executed regression evidence. Submit a candidate through governed learning evaluation and human approval." } },
    };
  }

  /**
   * Activates an approved strategy for production, cleanly deprecating the prior version.
   */
  public async activateStrategy(strategyId: string): Promise<AgentStrategyRecord> {
    throw new Error(`Direct legacy activation is unavailable for '${strategyId}'. Use governed candidate evaluation and authenticated human promotion.`);
  }

  public async getActiveStrategy(domain: string, tenantId?: string | null): Promise<AgentStrategyRecord | null> {
    const s = await this.store.getActiveStrategyForDomain(domain, tenantId);
    return s || null;
  }

  /**
   * Rolls back an active strategy to a previous approved version or deprecates it.
   */
  public async rollbackStrategy(domain: string, targetVersionOrReason?: string): Promise<AgentStrategyRecord | null> {
    throw new Error(`Direct legacy rollback is unavailable for '${domain}' (${targetVersionOrReason ?? "previous version"}). Use authenticated governed rollback.`);
  }
}

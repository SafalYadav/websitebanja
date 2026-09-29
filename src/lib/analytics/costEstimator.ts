// src/lib/analytics/costEstimator.ts

import type {
  AIOperationRecord,
  CostEstimateReport,
  ModelPricingConfig,
  UnitEconomics,
} from "./types";

/**
 * Standard public token pricing configuration per 1 Million tokens (USD).
 * Only explicitly listed models are priced.
 * Any unconfigured model returns null / "UNKNOWN" to avoid fabricating estimates.
 */
export const MODEL_PRICING: Record<string, ModelPricingConfig> = {
  // Google Gemini models
  "gemini-2.5-flash": {
    inputPerMillionUsd: 0.10,
    outputPerMillionUsd: 0.40,
    note: "Gemini 2.5 Flash standard tier",
  },
  "gemini-2.5-pro": {
    inputPerMillionUsd: 1.25,
    outputPerMillionUsd: 5.00,
    note: "Gemini 2.5 Pro standard tier",
  },
  "gemini-1.5-flash": {
    inputPerMillionUsd: 0.075,
    outputPerMillionUsd: 0.30,
    note: "Gemini 1.5 Flash standard tier",
  },
  "gemini-1.5-pro": {
    inputPerMillionUsd: 1.25,
    outputPerMillionUsd: 5.00,
    note: "Gemini 1.5 Pro standard tier",
  },

  // OpenAI models
  "gpt-4o-mini": {
    inputPerMillionUsd: 0.15,
    outputPerMillionUsd: 0.60,
    note: "OpenAI GPT-4o-mini standard tier",
  },
  "gpt-4o": {
    inputPerMillionUsd: 2.50,
    outputPerMillionUsd: 10.00,
    note: "OpenAI GPT-4o standard tier",
  },

  // Groq models
  "llama-3.3-70b-versatile": {
    inputPerMillionUsd: 0.59,
    outputPerMillionUsd: 0.79,
    note: "Groq hosted Llama 3.3 70B",
  },
  "llama-3.1-8b-instant": {
    inputPerMillionUsd: 0.05,
    outputPerMillionUsd: 0.08,
    note: "Groq hosted Llama 3.1 8B",
  },

  // Anthropic via OpenRouter
  "claude-3-5-sonnet": {
    inputPerMillionUsd: 3.00,
    outputPerMillionUsd: 15.00,
    note: "Claude 3.5 Sonnet",
  },
  "claude-3-5-haiku": {
    inputPerMillionUsd: 0.80,
    outputPerMillionUsd: 4.00,
    note: "Claude 3.5 Haiku",
  },
};

/**
 * Retrieve model pricing config, matching against normalized keys.
 */
export function getModelPricing(modelName: string): ModelPricingConfig | null {
  if (!modelName) return null;
  const normalized = modelName.trim().toLowerCase();

  // Direct match
  if (MODEL_PRICING[normalized]) {
    return MODEL_PRICING[normalized];
  }

  // Prefix match (e.g., "gemini-2.5-flash-001" -> "gemini-2.5-flash")
  for (const [key, config] of Object.entries(MODEL_PRICING)) {
    if (normalized.startsWith(key)) {
      return config;
    }
  }

  return null;
}

/**
 * Calculate single operation cost.
 * Unconfigured models return null for cost and status "UNKNOWN".
 */
export function calculateOperationCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): {
  inputCostUsd: number | null;
  outputCostUsd: number | null;
  totalCostUsd: number | null;
  status: "KNOWN" | "UNKNOWN";
} {
  const pricing = getModelPricing(model);
  if (!pricing) {
    return {
      inputCostUsd: null,
      outputCostUsd: null,
      totalCostUsd: null,
      status: "UNKNOWN",
    };
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillionUsd;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillionUsd;
  const totalCost = Number((inputCost + outputCost).toFixed(6));

  return {
    inputCostUsd: Number(inputCost.toFixed(6)),
    outputCostUsd: Number(outputCost.toFixed(6)),
    totalCostUsd: totalCost,
    status: "KNOWN",
  };
}

export interface LeadCountBreakdown {
  discovered?: number;
  qualified?: number;
  audited?: number;
  previewCreated?: number;
  outreachDrafted?: number;
  replyAnalyzed?: number;
  converted?: number;
}

/**
 * Estimate aggregate costs, tracking known vs unknown models and unit economics.
 */
export function estimateCosts(
  operations: AIOperationRecord[],
  leadCounts: LeadCountBreakdown = {}
): CostEstimateReport {
  let knownEstimatedCostUsd = 0;
  const unknownModelsSet = new Set<string>();
  const costByStage: Record<string, number> = {};
  const costByModel: Record<
    string,
    {
      operations: number;
      tokens: number;
      costUsd: number | null;
      status: "KNOWN" | "UNKNOWN";
    }
  > = {};

  for (const op of operations) {
    const { model, inputTokens, outputTokens, stage } = op;
    const totalTokens = inputTokens + outputTokens;
    const costResult = calculateOperationCost(model, inputTokens, outputTokens);

    if (!costByModel[model]) {
      costByModel[model] = {
        operations: 0,
        tokens: 0,
        costUsd: costResult.status === "KNOWN" ? 0 : null,
        status: costResult.status,
      };
    }

    costByModel[model].operations += 1;
    costByModel[model].tokens += totalTokens;

    if (costResult.status === "KNOWN" && costResult.totalCostUsd !== null) {
      knownEstimatedCostUsd += costResult.totalCostUsd;
      costByModel[model].costUsd = Number(
        (((costByModel[model].costUsd ?? 0) + costResult.totalCostUsd)).toFixed(6)
      );

      // Attribute cost by stage
      const stageKey = stage || "unknown";
      costByStage[stageKey] = Number(
        ((costByStage[stageKey] || 0) + costResult.totalCostUsd).toFixed(6)
      );
    } else {
      unknownModelsSet.add(model);
      costByModel[model].costUsd = null;
      costByModel[model].status = "UNKNOWN";
    }
  }

  knownEstimatedCostUsd = Number(knownEstimatedCostUsd.toFixed(6));
  const unknownModels = Array.from(unknownModelsSet);
  const hasUnknownCosts = unknownModels.length > 0;

  // Compute unit economics based on known costs
  const calculateUnitCost = (count?: number): number | null => {
    if (!count || count <= 0 || knownEstimatedCostUsd <= 0) return null;
    return Number((knownEstimatedCostUsd / count).toFixed(4));
  };

  const unitEconomics: UnitEconomics = {
    costPerDiscoveredLeadUsd: calculateUnitCost(leadCounts.discovered),
    costPerQualifiedLeadUsd: calculateUnitCost(leadCounts.qualified),
    costPerAuditedLeadUsd: calculateUnitCost(leadCounts.audited),
    costPerPreviewGeneratedUsd: calculateUnitCost(leadCounts.previewCreated),
    costPerOutreachDraftedUsd: calculateUnitCost(leadCounts.outreachDrafted),
    costPerReplyAnalyzedUsd: calculateUnitCost(leadCounts.replyAnalyzed),
    costPerConvertedLeadUsd: calculateUnitCost(leadCounts.converted),
  };

  return {
    knownEstimatedCostUsd,
    hasUnknownCosts,
    unknownModelsCount: unknownModels.length,
    unknownModels,
    totalOperations: operations.length,
    costByStage,
    costByModel,
    unitEconomics,
  };
}

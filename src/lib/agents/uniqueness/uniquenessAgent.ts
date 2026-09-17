// src/lib/agents/uniqueness/uniquenessAgent.ts
import { runAgent } from "../runtime/agentRuntime";
import { modelRouter } from "@/lib/ai/router/modelRouter";
import { MODEL_CONFIG } from "@/lib/ai/router/modelConfig";
import type { AgentContext } from "../types";
import type {
  CandidateWebsite,
  UniquenessAgentOutput,
  UniquenessCheckInput,
  UniquenessCheckResult,
  UniquenessStatus,
  UniquenessThresholdConfig,
} from "./types";
import {
  DEFAULT_UNIQUENESS_CONFIG,
  UniquenessAgentOutputSchema,
} from "./types";
import { selectCandidateWebsites, recordCandidateFromWebsite } from "./candidateSelector";
import { evaluateCandidateSimilarities } from "./similarity";
import {
  buildUniquenessSystemPrompt,
  buildUniquenessUserPrompt,
} from "./uniquenessPrompt";

export const MAX_UNIQUENESS_REGENERATIONS = 2;

/**
 * Deterministic fallback builder when AI model routing is unavailable.
 * Ensures 100% offline, zero-network, zero-GPT reliability.
 */
export function buildDeterministicUniquenessFallback(
  input: UniquenessCheckInput,
  candidates: CandidateWebsite[],
  config: UniquenessThresholdConfig = DEFAULT_UNIQUENESS_CONFIG
): UniquenessAgentOutput {
  const evalResult = evaluateCandidateSimilarities(
    input.newWebsite,
    input.category,
    input.description,
    candidates,
    config
  );

  let status = evalResult.status;
  const issues = [...evalResult.detectedIssues];
  const redesignDirectives: string[] = [];

  // Check regeneration loop cap
  if (status === "REGENERATE" && (input.regenerationAttempt ?? 0) >= MAX_UNIQUENESS_REGENERATIONS) {
    status = "REVIEW";
    issues.push("Max uniqueness regenerations reached; defaulting to review to prevent infinite loop.");
  }

  if (status === "REGENERATE" || status === "REVIEW") {
    if (evalResult.closestCandidate) {
      redesignDirectives.push(`Differentiate hero layout from "${evalResult.closestCandidate.businessName}"`);
      redesignDirectives.push("Reorder sections or introduce asymmetric layout patterns");
      redesignDirectives.push("Select a distinct typography pairing and contrasting accent color palette");
    }
  }

  return {
    status,
    similarityScore: evalResult.highestScore,
    closestCandidateId: evalResult.closestCandidate?.id,
    closestCandidateName: evalResult.closestCandidate?.businessName,
    issues,
    redesignDirectives,
    similarityBreakdown: evalResult.bestBreakdown,
    confidence: 0.85,
    summary:
      status === "PASS"
        ? "Deterministic verification passed: no significant pattern collisions detected."
        : `Deterministic verification flagged similarity (${(evalResult.highestScore * 100).toFixed(0)}%) with ${evalResult.closestCandidate?.businessName || "recent project"}.`,
  };
}

/**
 * Runs the Uniqueness & Verification Agent.
 * Compares new website against relevant candidate websites using multi-layer verification:
 * Layer 1: Deterministic structural math
 * Layer 2: Visual interface evaluation
 * Layer 3: AI design reasoning (Gemini / Groq / OpenRouter via Model Router)
 */
export async function runUniquenessAgent(
  input: UniquenessCheckInput,
  options?: {
    userId?: string;
    projectId?: string;
    sessionId?: string;
    config?: Partial<UniquenessThresholdConfig>;
  }
): Promise<UniquenessCheckResult> {
  const activeConfig: UniquenessThresholdConfig = {
    ...DEFAULT_UNIQUENESS_CONFIG,
    ...(options?.config || input.thresholdConfig || {}),
    weights: {
      ...DEFAULT_UNIQUENESS_CONFIG.weights,
      ...(options?.config?.weights || input.thresholdConfig?.weights || {}),
    },
  };

  // 1. Candidate Selection (bounded set)
  let candidates = input.candidates;
  if (!candidates) {
    candidates = await selectCandidateWebsites(
      input.category,
      input.currentProjectId,
      4
    );
  }

  // If no previous candidate websites exist, automatically PASS with zero collision
  if (candidates.length === 0) {
    const emptyResult: UniquenessAgentOutput = {
      status: "PASS",
      similarityScore: 0.0,
      issues: [],
      redesignDirectives: [],
      similarityBreakdown: {
        structuralSimilarity: 0.0,
        fingerprintSimilarity: 0.0,
        componentPatternSimilarity: 0.0,
        semanticSimilarity: 0.0,
        compositeScore: 0.0,
      },
      confidence: 1.0,
      summary: "First generation in category or no prior candidates found. Verified unique.",
    };

    recordCandidateFromWebsite(
      input.currentProjectId || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      input.businessName || "Generated Website",
      input.category,
      input.newWebsite
    );

    return {
      success: true,
      data: emptyResult,
      source: "fallback",
      latencyMs: 1,
      warnings: [],
    };
  }

  // 2. Layer 1 Deterministic Pre-Evaluation
  const deterministicEval = evaluateCandidateSimilarities(
    input.newWebsite,
    input.category,
    input.description,
    candidates,
    activeConfig
  );

  const deterministicSummary = `Composite Score: ${deterministicEval.highestScore.toFixed(2)} | Status: ${deterministicEval.status} | Closest: ${deterministicEval.closestCandidate?.businessName || "None"} | Issues: ${deterministicEval.detectedIssues.join("; ") || "None"}`;

  // 3. Execution via Agent Runtime & Model Router (Zero GPT)
  const agentRunResult = await runAgent<UniquenessCheckInput, UniquenessAgentOutput>({
    agentName: "uniqueness",
    input,
    userId: options?.userId,
    projectId: options?.projectId || input.currentProjectId,
    sessionId: options?.sessionId,
    policy: MODEL_CONFIG.agentPolicies.uniqueness(),
    metadata: {
      category: input.category,
      candidateCount: candidates.length,
      deterministicScore: deterministicEval.highestScore,
      regenerationAttempt: input.regenerationAttempt || 0,
    },
    execute: async (context: AgentContext) => {
      const systemPrompt = buildUniquenessSystemPrompt();
      const userPrompt = buildUniquenessUserPrompt(input, candidates, deterministicSummary);

      const routeResult = await modelRouter.route<UniquenessAgentOutput>(
        {
          systemPrompt,
          userPrompt,
          responseSchema: { type: "object" },
          zodSchema: UniquenessAgentOutputSchema,
          temperature: 0.1, // low temperature for analytical verification
          maxTokens: 1000,
        },
        MODEL_CONFIG.agentPolicies.uniqueness()
      );

      if (!routeResult.success || !routeResult.data) {
        throw new Error(
          routeResult.error?.message || "Model router failed to provide valid uniqueness verification"
        );
      }

      const parsed = UniquenessAgentOutputSchema.safeParse(routeResult.data);
      if (!parsed.success) {
        throw new Error(`Uniqueness output schema validation failed: ${parsed.error.message}`);
      }

      let data = parsed.data;

      // Enforce loop breaker if max regenerations reached
      if (data.status === "REGENERATE" && (input.regenerationAttempt ?? 0) >= MAX_UNIQUENESS_REGENERATIONS) {
        data = {
          ...data,
          status: "REVIEW",
          issues: [
            ...data.issues,
            "Max uniqueness regenerations reached; transitioning to review to avoid infinite loop.",
          ],
        };
      }

      return {
        data,
        decisionOutput: data,
        confidenceScore: data.confidence,
        provider: routeResult.provider,
        model: routeResult.model,
      };
    },
  });

  if (agentRunResult.success && agentRunResult.data) {
    if (agentRunResult.data.status !== "REGENERATE") {
      recordCandidateFromWebsite(
        input.currentProjectId || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        input.businessName || "Generated Website",
        input.category,
        input.newWebsite
      );
    }
    return {
      success: true,
      data: agentRunResult.data,
      source: "agent",
      provider: agentRunResult.provider,
      model: agentRunResult.model,
      latencyMs: agentRunResult.latencyMs,
      warnings: [],
    };
  }

  // Graceful deterministic fallback if model router failed
  const fallbackData = buildDeterministicUniquenessFallback(input, candidates, activeConfig);
  if (fallbackData.status !== "REGENERATE") {
    recordCandidateFromWebsite(
      input.currentProjectId || `proj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      input.businessName || "Generated Website",
      input.category,
      input.newWebsite
    );
  }
  return {
    success: true,
    data: fallbackData,
    source: "fallback",
    latencyMs: agentRunResult.latencyMs,
    warnings: [
      `AI uniqueness check fell back to deterministic verification: ${agentRunResult.error?.message || "Unknown error"}`,
    ],
  };
}

// src/lib/agents/types.ts
import type { ModelProviderName, RoutingPolicy } from "@/lib/ai/router/types";

export type AgentName = "skills" | "uniqueness" | "boss" | "mitra";

export interface AgentRunRecord {
  id?: string;
  agentName: AgentName;
  sessionId?: string | null;
  userId?: string | null;
  projectId?: string | null;
  status: "running" | "success" | "failed";
  modelProvider: ModelProviderName;
  modelName: string;
  latencyMs?: number;
  tokensUsed?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface AgentDecisionRecord {
  runId: string;
  agentName: AgentName;
  inputSummary?: Record<string, unknown>;
  decisionOutput: Record<string, unknown>;
  confidenceScore?: number;
  metadata?: Record<string, unknown>;
}

export interface AgentErrorRecord {
  runId?: string;
  agentName: AgentName;
  errorType: string;
  errorMessage: string;
  fallbackTriggered?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AgentRecommendationRecord {
  runId?: string;
  agentName: AgentName;
  recommendationText: string;
  suggestedAction?: string;
  severity: "info" | "warning" | "critical";
  status?: "open" | "resolved" | "dismissed";
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  runId: string;
  userId?: string | null;
  projectId?: string | null;
  sessionId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AgentExecutionOptions<TInput, TOutput> {
  agentName: AgentName;
  input: TInput;
  userId?: string | null;
  projectId?: string | null;
  sessionId?: string | null;
  policy?: Partial<RoutingPolicy>;
  metadata?: Record<string, unknown>;
  execute: (context: AgentContext) => Promise<{
    data: TOutput;
    provider: ModelProviderName;
    model: string;
    decisionOutput?: Record<string, unknown>;
    confidenceScore?: number;
  }>;
}

export interface AgentRunResult<TOutput> {
  runId: string;
  agentName: AgentName;
  success: boolean;
  data?: TOutput;
  provider?: ModelProviderName;
  model?: string;
  latencyMs: number;
  error?: {
    type: string;
    message: string;
  };
}

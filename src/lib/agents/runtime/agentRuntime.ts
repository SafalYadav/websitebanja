// src/lib/agents/runtime/agentRuntime.ts
import crypto from "crypto";
import type { AgentExecutionOptions, AgentRunResult, AgentContext } from "../types";
import {
  recordAgentRun,
  updateAgentRun,
  recordAgentDecision,
  recordAgentError,
} from "../telemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";

/**
 * Universal execution runtime for autonomous agents.
 * Provides lifecycle telemetry, timing, error sanitization, and structured result normalization.
 */
export async function runAgent<TInput, TOutput>(
  options: AgentExecutionOptions<TInput, TOutput>
): Promise<AgentRunResult<TOutput>> {
  const runId = crypto.randomUUID();
  const startTime = performance.now();

  const context: AgentContext = {
    runId,
    userId: options.userId,
    projectId: options.projectId,
    sessionId: options.sessionId,
    metadata: options.metadata,
  };

  // Initial telemetry record: status 'running'
  void recordAgentRun({
    id: runId,
    agentName: options.agentName,
    sessionId: options.sessionId,
    userId: options.userId,
    projectId: options.projectId,
    status: "running",
    modelProvider: (options.policy?.primaryProvider as any) || "gemini",
    modelName: options.policy?.primaryModel || "default",
    metadata: options.metadata,
  });

  try {
    const result = await options.execute(context);
    const latencyMs = Math.round(performance.now() - startTime);

    // Record decision if structured output was produced
    if (result.decisionOutput) {
      void recordAgentDecision({
        runId,
        agentName: options.agentName,
        inputSummary: (options.input as Record<string, unknown>) || {},
        decisionOutput: result.decisionOutput,
        confidenceScore: result.confidenceScore ?? 1.0,
        metadata: options.metadata,
      });
    }

    // Mark telemetry run as success
    void updateAgentRun(runId, {
      status: "success",
      latencyMs,
      modelProvider: result.provider,
      modelName: result.model,
    });

    return {
      runId,
      agentName: options.agentName,
      success: true,
      data: result.data,
      provider: result.provider,
      model: result.model,
      latencyMs,
    };
  } catch (err: unknown) {
    const latencyMs = Math.round(performance.now() - startTime);
    const rawMsg = err instanceof Error ? err.message : String(err);
    const safeErrorMsg = sanitizeErrorOutput(rawMsg);

    // Record error in telemetry
    void recordAgentError({
      runId,
      agentName: options.agentName,
      errorType: err instanceof Error ? err.name : "RUNTIME_ERROR",
      errorMessage: safeErrorMsg,
      metadata: options.metadata,
    });

    // Mark telemetry run as failed
    void updateAgentRun(runId, {
      status: "failed",
      latencyMs,
    });

    return {
      runId,
      agentName: options.agentName,
      success: false,
      latencyMs,
      error: {
        type: err instanceof Error ? err.name : "RUNTIME_ERROR",
        message: safeErrorMsg,
      },
    };
  }
}

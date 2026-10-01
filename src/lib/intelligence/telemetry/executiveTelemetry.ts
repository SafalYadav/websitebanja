// src/lib/intelligence/telemetry/executiveTelemetry.ts
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type { ExecutiveExecutionState, ExecutivePriority } from "../executive/executiveTypes";

export function emitExecutiveStarted(params: {
  runId: string;
  objective: string;
  priority: ExecutivePriority;
  userId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "executive.started",
    agent: "executive",
    requestId: params.runId,
    userId: params.userId || undefined,
    projectId: params.projectId || undefined,
    reason: `Objective initiated: ${sanitizeErrorOutput(params.objective.slice(0, 100))}`,
    metadata: {
      operation: "Executive initialized",
      objective: sanitizeErrorOutput(params.objective),
      priority: params.priority,
      ...params.metadata,
    },
  });
}

export function emitExecutivePlanning(params: {
  runId: string;
  objective: string;
  planSteps: number;
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "executive.planning",
    agent: "executive",
    requestId: params.runId,
    reason: `Synthesizing ${params.planSteps}-step executive plan`,
    metadata: {
      operation: "Planning strategy & delegation",
      planSteps: params.planSteps,
      ...params.metadata,
    },
  });
}

export function emitExecutiveDelegating(params: {
  runId: string;
  agent: string;
  task: string;
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "executive.delegating",
    agent: "executive",
    requestId: params.runId,
    reason: `Delegating task to sub-agent ${params.agent}`,
    metadata: {
      operation: `Delegating to ${params.agent}`,
      targetAgent: params.agent,
      taskSummary: sanitizeErrorOutput(params.task.slice(0, 100)),
      ...params.metadata,
    },
  });
}

export function emitExecutiveVerifying(params: {
  runId: string;
  checkCount: number;
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "executive.verifying",
    agent: "executive",
    requestId: params.runId,
    reason: `Verifying ${params.checkCount} domain and quality rules`,
    metadata: {
      operation: "Executive verification",
      checkCount: params.checkCount,
      ...params.metadata,
    },
  });
}

export function emitExecutiveRepaired(params: {
  runId: string;
  repairCount: number;
  reason: string;
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "executive.repaired",
    agent: "executive",
    requestId: params.runId,
    reason: `Repairing: ${sanitizeErrorOutput(params.reason)}`,
    metadata: {
      operation: "Executive self-repair",
      repairCount: params.repairCount,
      repairReason: sanitizeErrorOutput(params.reason),
      ...params.metadata,
    },
  });
}

export function emitExecutiveEscalated(params: {
  runId: string;
  reason: string;
  severity: "warning" | "critical";
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "executive.escalated",
    agent: "executive",
    requestId: params.runId,
    reason: `Escalated: ${sanitizeErrorOutput(params.reason)}`,
    status: "error",
    metadata: {
      operation: "Escalated for human/admin review",
      escalationReason: sanitizeErrorOutput(params.reason),
      severity: params.severity,
      ...params.metadata,
    },
  });
}

export function emitExecutiveCompleted(params: {
  runId: string;
  latencyMs: number;
  reportSummary: string;
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "executive.completed",
    agent: "executive",
    requestId: params.runId,
    latencyMs: params.latencyMs,
    status: "success",
    reason: "Executive lifecycle completed successfully",
    metadata: {
      operation: "Task completed",
      reportSummary: sanitizeErrorOutput(params.reportSummary.slice(0, 200)),
      ...params.metadata,
    },
  });
}

export function emitExecutiveFailed(params: {
  runId: string;
  error: string;
  latencyMs: number;
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "executive.failed",
    agent: "executive",
    requestId: params.runId,
    latencyMs: params.latencyMs,
    status: "error",
    error: sanitizeErrorOutput(params.error),
    reason: `Executive failure: ${sanitizeErrorOutput(params.error.slice(0, 100))}`,
    metadata: {
      operation: "Executive failed",
      ...params.metadata,
    },
  });
}

export function emitMemoryRead(params: {
  runId: string;
  domain: string;
  itemsRetrieved: number;
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "memory.read",
    agent: "executive",
    requestId: params.runId,
    reason: `Retrieved ${params.itemsRetrieved} verified memory items for domain '${params.domain}'`,
    metadata: {
      operation: "Memory retrieval",
      domain: params.domain,
      itemsRetrieved: params.itemsRetrieved,
      ...params.metadata,
    },
  });
}

export function emitMemoryWrite(params: {
  runId: string;
  level: string;
  title: string;
  metadata?: Record<string, unknown>;
}): void {
  emitAgentEvent({
    event: "memory.write",
    agent: "executive",
    requestId: params.runId,
    reason: `Persisted ${params.level} item: ${sanitizeErrorOutput(params.title)}`,
    metadata: {
      operation: "Memory persist",
      level: params.level,
      title: sanitizeErrorOutput(params.title),
      ...params.metadata,
    },
  });
}

export function emitLessonPromoted(params: {
  lessonId: string;
  title: string;
  domain: string;
  confidence: number;
}): void {
  emitAgentEvent({
    event: "memory.promoted",
    agent: "executive",
    reason: `Lesson promoted to strategic memory: ${sanitizeErrorOutput(params.title)}`,
    metadata: {
      operation: "Lesson promotion",
      lessonId: params.lessonId,
      domain: params.domain,
      confidence: params.confidence,
    },
  });
}

export function emitStrategyActivated(params: {
  strategyId: string;
  version: string;
  domain: string;
}): void {
  emitAgentEvent({
    event: "strategy.activated",
    agent: "executive",
    reason: `Strategy ${params.version} activated for domain '${params.domain}'`,
    metadata: {
      operation: "Strategy activated",
      strategyId: params.strategyId,
      version: params.version,
      domain: params.domain,
    },
  });
}

export function emitExperimentCreated(params: {
  experimentId: string;
  hypothesis: string;
  domain: string;
}): void {
  emitAgentEvent({
    event: "experiment.created",
    agent: "executive",
    reason: `Experiment initialized: ${sanitizeErrorOutput(params.hypothesis.slice(0, 80))}`,
    metadata: {
      operation: "Experiment created",
      experimentId: params.experimentId,
      domain: params.domain,
    },
  });
}

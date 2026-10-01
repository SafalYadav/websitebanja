// src/lib/telemetry/agentTelemetry.ts
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { recordAgentRun, recordAgentError } from "@/lib/agents/telemetry";
import type {
  AgentTelemetryEvent,
  AgentTelemetryEventInput,
  AgentLiveStatus,
  AgentState,
  TelemetryFilter,
} from "./types";

/**
 * Maximum capacity for circular in-memory telemetry event buffer.
 * Retains recent operational telemetry without unbounded memory growth.
 */
const MAX_BUFFER_CAPACITY = 200;

/**
 * In-memory circular buffer for fast recent event queries and SSE hydration.
 */
const eventBuffer: AgentTelemetryEvent[] = [];

/**
 * Known tracked agents initialized with clean idle states.
 */
const KNOWN_AGENTS = [
  "mitra",
  "generator",
  "planner",
  "extractor",
  "studio",
  "skills",
  "uniqueness",
  "boss",
  "executive",
] as const;

/**
 * In-memory live agent status registry.
 */
const liveStatuses: Map<string, AgentLiveStatus> = new Map();

for (const agent of KNOWN_AGENTS) {
  liveStatuses.set(agent, {
    agent,
    state: "idle",
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Active SSE subscribers registry.
 */
type TelemetryListener = (event: AgentTelemetryEvent) => void;
interface Subscription {
  id: string;
  listener: TelemetryListener;
  filter?: { userId?: string; projectId?: string; isAdmin?: boolean };
}

const subscribers: Map<string, Subscription> = new Map();

/**
 * Sanitizes an arbitrary metadata object, scrubbing all credentials and tokens.
 */
function sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(metadata)) {
    if (typeof val === "string") {
      sanitized[key] = sanitizeErrorOutput(val);
    } else if (val instanceof Error) {
      sanitized[key] = sanitizeErrorOutput(val);
    } else if (typeof val === "object" && val !== null) {
      try {
        sanitized[key] = JSON.parse(sanitizeErrorOutput(JSON.stringify(val)));
      } catch {
        sanitized[key] = sanitizeErrorOutput(String(val));
      }
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Updates an agent's active live status based on incoming telemetry event.
 */
function updateAgentLiveStatus(event: AgentTelemetryEvent): void {
  const agentKey = event.agent.toLowerCase();
  const existing = liveStatuses.get(agentKey) || {
    agent: event.agent,
    state: "idle" as AgentState,
    updatedAt: event.timestamp,
  };

  const updated: AgentLiveStatus = {
    ...existing,
    updatedAt: event.timestamp,
  };

  if (event.provider) updated.provider = event.provider;
  if (event.model) updated.model = event.model;
  if (event.requestId) updated.requestId = event.requestId;
  if (typeof event.latencyMs === "number") updated.lastLatencyMs = event.latencyMs;

  switch (event.event) {
    case "agent.started":
      updated.state = "running";
      updated.startedAt = event.timestamp;
      updated.currentOperation = (event.metadata?.operation as string) || "Executing request";
      break;

    case "agent.thinking":
      updated.state = "running";
      updated.currentOperation = "Thinking & synthesizing response";
      break;

    case "agent.provider_call":
      if (updated.state !== "fallback") {
        updated.state = "running";
      }
      updated.currentOperation = `Calling ${event.provider || "provider"} (${event.model || "default"})`;
      break;

    case "agent.provider_success":
      updated.currentOperation = `${event.provider || "Provider"} responded (${event.latencyMs || 0}ms)`;
      break;

    case "agent.fallback":
      updated.state = "fallback";
      updated.currentOperation = `Failing over from ${event.fromProvider || "primary"} to ${event.toProvider || "backup"}`;
      break;

    case "agent.provider_error":
      if (event.metadata?.fallback) {
        updated.state = "fallback";
      } else {
        updated.state = "error";
      }
      updated.lastError = event.error ? sanitizeErrorOutput(event.error) : sanitizeErrorOutput(String(event.metadata?.error || "Provider error"));
      break;

    case "agent.completed":
    case "executive.completed":
      updated.state = "success";
      updated.currentOperation = (event.metadata?.operation as string) || "Executive task completed successfully";
      break;

    case "agent.failed":
    case "executive.failed":
      updated.state = "error";
      updated.lastError = event.error ? sanitizeErrorOutput(event.error) : sanitizeErrorOutput(String(event.metadata?.error || "Execution failed"));
      updated.currentOperation = undefined;
      break;

    case "executive.started":
      updated.state = "running";
      updated.startedAt = event.timestamp;
      updated.currentOperation = (event.metadata?.operation as string) || "Observing and understanding task";
      break;

    case "executive.planning":
      updated.state = "running";
      updated.currentOperation = (event.metadata?.operation as string) || "Synthesizing executive plan";
      break;

    case "executive.delegating":
      updated.state = "running";
      updated.currentOperation = (event.metadata?.operation as string) || "Delegating to sub-agents / tools";
      break;

    case "executive.verifying":
      updated.state = "running";
      updated.currentOperation = (event.metadata?.operation as string) || "Verifying domain coherence & quality";
      break;

    case "executive.repaired":
      updated.state = "fallback";
      updated.currentOperation = (event.metadata?.operation as string) || "Repairing verification failure";
      break;

    case "executive.escalated":
      updated.state = "fallback";
      updated.currentOperation = (event.metadata?.operation as string) || "Escalated for human / admin review";
      break;

    default:
      break;
  }

  liveStatuses.set(agentKey, updated);
}

/**
 * Checks and auto-cleans stale "running" agent states that exceeded timeout.
 */
function cleanupStaleRunningStates(timeoutMs = 120_000): void {
  const now = Date.now();
  for (const [key, status] of liveStatuses.entries()) {
    if (status.state === "running" || status.state === "fallback") {
      const started = status.startedAt ? new Date(status.startedAt).getTime() : 0;
      if (started > 0 && now - started > timeoutMs) {
        liveStatuses.set(key, {
          ...status,
          state: "idle",
          currentOperation: undefined,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }
}

/**
 * Emits an agent telemetry event into the central telemetry stream.
 *
 * Guarantees:
 * 1. Safe secret redaction for all metadata, errors, and parameters.
 * 2. Real-time broadcast to connected SSE clients.
 * 3. Asynchronous non-blocking persistence to database.
 * 4. Never throws or halts the host AI request under any error condition.
 */
export function emitAgentEvent(input: AgentTelemetryEventInput): AgentTelemetryEvent {
  try {
    const timestamp = input.timestamp || new Date().toISOString();
    const id = input.id || `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const event: AgentTelemetryEvent = {
      id,
      timestamp,
      event: input.event,
      agent: input.agent,
      requestId: input.requestId,
      projectId: input.projectId,
      userId: input.userId,
      provider: input.provider,
      model: input.model,
      fromProvider: input.fromProvider,
      toProvider: input.toProvider,
      fromModel: input.fromModel,
      toModel: input.toModel,
      reason: input.reason ? sanitizeErrorOutput(input.reason) : undefined,
      error: input.error ? sanitizeErrorOutput(input.error) : undefined,
      status: input.status,
      latencyMs: input.latencyMs,
      metadata: sanitizeMetadata(input.metadata),
    };

    // Update circular in-memory buffer
    eventBuffer.push(event);
    if (eventBuffer.length > MAX_BUFFER_CAPACITY) {
      eventBuffer.shift();
    }

    // Update in-memory live status
    cleanupStaleRunningStates();
    updateAgentLiveStatus(event);

    // Broadcast to SSE subscribers safely
    for (const sub of subscribers.values()) {
      try {
        // Enforce tenant boundary: non-admin users only receive events for their own userId or projectId
        if (sub.filter) {
          if (!sub.filter.isAdmin) {
            if (sub.filter.userId && event.userId && sub.filter.userId !== event.userId) {
              continue;
            }
            if (sub.filter.projectId && event.projectId && sub.filter.projectId !== event.projectId) {
              continue;
            }
          }
        }
        sub.listener(event);
      } catch (subErr) {
        console.warn("[Telemetry Stream Dispatch Warning]:", sanitizeErrorOutput(subErr));
      }
    }

    // Asynchronous non-blocking database persistence
    if (event.event === "agent.completed" || event.event === "agent.failed") {
      void recordAgentRun({
        agentName: (event.agent as any) || "mitra",
        userId: event.userId,
        projectId: event.projectId,
        status: event.event === "agent.completed" ? "success" : "failed",
        modelProvider: (event.provider as any) || "gemini",
        modelName: event.model || "default",
        latencyMs: event.latencyMs ?? 0,
        metadata: event.metadata,
      }).catch(() => {});
    } else if (event.event === "agent.provider_error") {
      void recordAgentError({
        agentName: (event.agent as any) || "mitra",
        errorType: "PROVIDER_OR_EXECUTION_ERROR",
        errorMessage: String(event.metadata?.error || "Error during execution"),
        fallbackTriggered: Boolean(event.metadata?.fallback),
        metadata: event.metadata,
      }).catch(() => {});
    }

    return event;
  } catch (err) {
    // Top-level telemetry safety guard: NEVER break calling AI pipeline
    console.warn("[AgentTelemetry Failure Guard] Proceeding gracefully:", sanitizeErrorOutput(err));
    return {
      id: `fallback_${Date.now()}`,
      timestamp: new Date().toISOString(),
      event: input.event,
      agent: input.agent,
    };
  }
}

/**
 * Subscribes a listener to real-time telemetry events.
 * Returns an unsubscription function.
 */
export function subscribeToTelemetry(
  listener: TelemetryListener,
  filter?: { userId?: string; isAdmin?: boolean; projectId?: string }
): () => void {
  const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  subscribers.set(subId, { id: subId, listener, filter });

  return () => {
    subscribers.delete(subId);
  };
}

/**
 * Retrieves a snapshot of current live statuses across all tracked agents.
 */
export function getActiveAgentStatuses(): Record<string, AgentLiveStatus> {
  cleanupStaleRunningStates();
  const statuses: Record<string, AgentLiveStatus> = {};
  for (const [key, val] of liveStatuses.entries()) {
    statuses[key] = { ...val };
  }
  return statuses;
}

/**
 * Retrieves recent telemetry events from the circular buffer, matching optional filters.
 */
export function getRecentEvents(filter?: TelemetryFilter): AgentTelemetryEvent[] {
  let events = [...eventBuffer];

  if (filter?.agent) {
    const target = filter.agent.toLowerCase();
    events = events.filter((e) => e.agent.toLowerCase() === target);
  }

  if (filter?.requestId) {
    events = events.filter((e) => e.requestId === filter.requestId);
  }

  if (filter?.userId) {
    events = events.filter((e) => e.userId === filter.userId);
  }

  if (filter?.projectId) {
    events = events.filter((e) => e.projectId === filter.projectId);
  }

  const limit = Math.max(1, Math.min(filter?.limit || 50, MAX_BUFFER_CAPACITY));
  return events.slice(-limit);
}

/**
 * Resets telemetry buffer and agent statuses. Used exclusively for testing.
 */
export function resetTelemetryForTesting(): void {
  eventBuffer.length = 0;
  for (const agent of KNOWN_AGENTS) {
    liveStatuses.set(agent, {
      agent,
      state: "idle",
      updatedAt: new Date().toISOString(),
    });
  }
  subscribers.clear();
}

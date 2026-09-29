// src/lib/agents/mitra/sessionManager.ts
import crypto from "crypto";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export type MitraSessionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "thinking"
  | "speaking"
  | "tool_call"
  | "interrupted"
  | "closing"
  | "closed"
  | "error";

export interface MitraSession {
  sessionId: string;
  userId: string;
  projectId?: string;
  status: MitraSessionStatus;
  mode: "live" | "fallback";
  startedAt: string;
  lastActivityAt: string;
  currentTool?: string;
  error?: string;
  reconnectAttempts: number;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionOptions {
  userId: string;
  projectId?: string;
  mode?: "live" | "fallback";
  metadata?: Record<string, unknown>;
}

/**
 * Maximum idle time (15 minutes) before a session is eligible for eviction.
 */
const DEFAULT_MAX_IDLE_MS = 15 * 60 * 1000;

/**
 * Maximum reconnect attempts allowed before forcing fallback or closing.
 */
export const MAX_RECONNECT_ATTEMPTS = 3;

class MitraSessionManager {
  private sessions: Map<string, MitraSession> = new Map();

  /**
   * Creates a new managed session for an authenticated user.
   */
  public createSession(options: CreateSessionOptions): MitraSession {
    if (!options.userId || typeof options.userId !== "string" || !options.userId.trim()) {
      throw new Error("Authentication required: userId is mandatory to create a Mitra session.");
    }

    const sessionId = `mitra_sess_${crypto.randomBytes(12).toString("hex")}`;
    const now = new Date().toISOString();

    // Sanitize any metadata to prevent secret leakage
    const safeMeta = options.metadata
      ? JSON.parse(sanitizeErrorOutput(JSON.stringify(options.metadata)))
      : undefined;

    const session: MitraSession = {
      sessionId,
      userId: options.userId.trim(),
      projectId: options.projectId?.trim(),
      status: "idle",
      mode: options.mode || "live",
      startedAt: now,
      lastActivityAt: now,
      reconnectAttempts: 0,
      metadata: safeMeta,
    };

    this.sessions.set(sessionId, session);

    emitAgentEvent({
      event: "agent.started",
      agent: "mitra",
      requestId: sessionId,
      userId: session.userId,
      projectId: session.projectId,
      metadata: {
        sessionId,
        status: session.status,
        mode: session.mode,
      },
    });

    return { ...session };
  }

  /**
   * Retrieves an active session by its ID.
   */
  public getSession(sessionId: string): MitraSession | null {
    if (!sessionId) return null;
    const session = this.sessions.get(sessionId);
    if (!session) return null;
    return { ...session };
  }

  /**
   * Updates the status and operational state of a session.
   */
  public updateSessionStatus(
    sessionId: string,
    status: MitraSessionStatus,
    details?: { currentTool?: string; error?: string; mode?: "live" | "fallback" }
  ): MitraSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.status = status;
    session.lastActivityAt = new Date().toISOString();

    if (details?.mode) {
      session.mode = details.mode;
    }

    if (details?.currentTool !== undefined) {
      session.currentTool = details.currentTool;
    }

    if (details?.error !== undefined) {
      session.error = details.error ? sanitizeErrorOutput(details.error) : undefined;
    }

    // Telemetry emissions based on significant lifecycle transitions
    if (status === "thinking") {
      emitAgentEvent({
        event: "agent.thinking",
        agent: "mitra",
        requestId: sessionId,
        userId: session.userId,
        projectId: session.projectId,
        metadata: { sessionId, status, mode: session.mode },
      });
    } else if (status === "interrupted") {
      emitAgentEvent({
        event: "agent.thinking",
        agent: "mitra",
        requestId: sessionId,
        userId: session.userId,
        projectId: session.projectId,
        metadata: { sessionId, status: "interrupted", action: "barge_in" },
      });
    } else if (status === "error") {
      emitAgentEvent({
        event: "agent.failed",
        agent: "mitra",
        requestId: sessionId,
        userId: session.userId,
        projectId: session.projectId,
        status: "error",
        error: session.error,
        metadata: { sessionId, mode: session.mode },
      });
    }

    return { ...session };
  }

  /**
   * Records heartbeat activity on the session.
   */
  public recordActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date().toISOString();
    }
  }

  /**
   * Bounded reconnect tracker to prevent infinite loops.
   */
  public recordReconnect(sessionId: string): { allowed: boolean; count: number } {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { allowed: false, count: 0 };
    }

    session.reconnectAttempts += 1;
    session.lastActivityAt = new Date().toISOString();

    if (session.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
      session.status = "error";
      session.mode = "fallback";
      session.error = `Maximum reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) exceeded. Falling back to HTTP conversation.`;
      
      emitAgentEvent({
        event: "agent.fallback",
        agent: "mitra",
        requestId: sessionId,
        userId: session.userId,
        projectId: session.projectId,
        fromModel: "gemini-live",
        toModel: "gemini-2.5-flash",
        reason: "reconnect_limit_exceeded",
        metadata: { sessionId, reconnectAttempts: session.reconnectAttempts },
      });

      return { allowed: false, count: session.reconnectAttempts };
    }

    return { allowed: true, count: session.reconnectAttempts };
  }

  /**
   * Marks a session as closed and removes it from active tracking.
   */
  public closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = "closed";
      this.sessions.delete(sessionId);

      emitAgentEvent({
        event: "agent.completed",
        agent: "mitra",
        requestId: sessionId,
        userId: session.userId,
        projectId: session.projectId,
        status: "success",
        metadata: { sessionId, durationMs: Date.now() - new Date(session.startedAt).getTime() },
      });
    }
  }

  /**
   * Sweeps and evicts idle sessions older than maxIdleAgeMs.
   */
  public cleanupStaleSessions(maxIdleAgeMs: number = DEFAULT_MAX_IDLE_MS): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      const idleTime = now - new Date(session.lastActivityAt).getTime();
      if (idleTime >= maxIdleAgeMs || session.status === "closed") {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  public resetForTesting(): void {
    this.sessions.clear();
  }
}

export const mitraSessionManager = new MitraSessionManager();

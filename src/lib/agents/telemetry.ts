// src/lib/agents/telemetry.ts
import { getPool } from "@/lib/db/queries";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type {
  AgentRunRecord,
  AgentDecisionRecord,
  AgentErrorRecord,
  AgentRecommendationRecord,
} from "./types";

/**
 * Non-blocking agent telemetry logger.
 * Writes records directly to Azure PostgreSQL.
 * If database is offline or query fails, logs a safe sanitized warning without crashing requests.
 */

export async function recordAgentRun(run: AgentRunRecord): Promise<string | null> {
  try {
    const pool = getPool();
    const query = `
      INSERT INTO public.agent_runs (
        agent_name, session_id, user_id, project_id, status, model_provider, model_name, latency_ms, tokens_used, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;
    const res = await pool.query(query, [
      run.agentName,
      run.sessionId ?? null,
      run.userId ?? null,
      run.projectId ?? null,
      run.status,
      run.modelProvider,
      run.modelName,
      run.latencyMs ?? 0,
      JSON.stringify(run.tokensUsed ?? {}),
      JSON.stringify(run.metadata ?? {}),
    ]);
    return res.rows[0]?.id ?? null;
  } catch (err) {
    console.warn("[AgentTelemetry] Failed to record agent_run (safe fallback):", sanitizeErrorOutput(String(err)));
    return null;
  }
}

export async function updateAgentRun(
  runId: string,
  updates: {
    status?: "running" | "success" | "failed";
    latencyMs?: number;
    tokensUsed?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    modelProvider?: string;
    modelName?: string;
  }
): Promise<void> {
  try {
    const pool = getPool();
    const sets: string[] = ["updated_at = now()"];
    const params: unknown[] = [];
    let idx = 1;

    if (updates.status) {
      sets.push(`status = $${idx++}`);
      params.push(updates.status);
    }
    if (typeof updates.latencyMs === "number") {
      sets.push(`latency_ms = $${idx++}`);
      params.push(updates.latencyMs);
    }
    if (updates.tokensUsed) {
      sets.push(`tokens_used = $${idx++}`);
      params.push(JSON.stringify(updates.tokensUsed));
    }
    if (updates.metadata) {
      sets.push(`metadata = $${idx++}`);
      params.push(JSON.stringify(updates.metadata));
    }
    if (updates.modelProvider) {
      sets.push(`model_provider = $${idx++}`);
      params.push(updates.modelProvider);
    }
    if (updates.modelName) {
      sets.push(`model_name = $${idx++}`);
      params.push(updates.modelName);
    }

    params.push(runId);
    const query = `UPDATE public.agent_runs SET ${sets.join(", ")} WHERE id = $${idx}`;
    await pool.query(query, params);
  } catch (err) {
    console.warn("[AgentTelemetry] Failed to update agent_run (safe fallback):", sanitizeErrorOutput(String(err)));
  }
}

export async function recordAgentDecision(decision: AgentDecisionRecord): Promise<void> {
  try {
    const pool = getPool();
    const query = `
      INSERT INTO public.agent_decisions (
        run_id, agent_name, input_summary, decision_output, confidence_score, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;
    await pool.query(query, [
      decision.runId,
      decision.agentName,
      JSON.stringify(decision.inputSummary ?? {}),
      JSON.stringify(decision.decisionOutput ?? {}),
      decision.confidenceScore ?? 1.0,
      JSON.stringify(decision.metadata ?? {}),
    ]);
  } catch (err) {
    console.warn("[AgentTelemetry] Failed to record agent_decision (safe fallback):", sanitizeErrorOutput(String(err)));
  }
}

export async function recordAgentError(error: AgentErrorRecord): Promise<void> {
  try {
    const pool = getPool();
    const query = `
      INSERT INTO public.agent_errors (
        run_id, agent_name, error_type, error_message, fallback_triggered, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const safeErrorMsg = sanitizeErrorOutput(error.errorMessage);
    await pool.query(query, [
      error.runId ?? null,
      error.agentName,
      error.errorType,
      safeErrorMsg,
      Boolean(error.fallbackTriggered),
      JSON.stringify(error.metadata ?? {}),
    ]);
  } catch (err) {
    console.warn("[AgentTelemetry] Failed to record agent_error (safe fallback):", sanitizeErrorOutput(String(err)));
  }
}

export async function recordAgentRecommendation(rec: AgentRecommendationRecord): Promise<void> {
  try {
    const pool = getPool();
    const query = `
      INSERT INTO public.agent_recommendations (
        run_id, agent_name, recommendation_text, suggested_action, severity, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
    await pool.query(query, [
      rec.runId ?? null,
      rec.agentName,
      sanitizeErrorOutput(rec.recommendationText),
      rec.suggestedAction ? sanitizeErrorOutput(rec.suggestedAction) : null,
      rec.severity,
      rec.status ?? "open",
      JSON.stringify(rec.metadata ?? {}),
    ]);
  } catch (err) {
    console.warn("[AgentTelemetry] Failed to record agent_recommendation (safe fallback):", sanitizeErrorOutput(String(err)));
  }
}

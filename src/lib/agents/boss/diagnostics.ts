// src/lib/agents/boss/diagnostics.ts
import { getPool } from "@/lib/db/queries";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type { AgentName } from "../types";
import type {
  DiagnosticIssue,
  CrossAgentCorrelation,
  TelemetrySummary,
  HealthThresholds,
} from "./types";
import { DEFAULT_HEALTH_THRESHOLDS } from "./types";

/**
 * Safely fetches bounded recent agent telemetry from Azure PostgreSQL.
 * If database is offline or unconfigured, gracefully returns an empty structured summary.
 */
export async function fetchTelemetrySummary(
  windowMinutes: number = 1440
): Promise<TelemetrySummary> {
  const boundedWindow = Math.max(5, Math.min(windowMinutes, 10080)); // 5 min to 7 days
  const defaultSummary: TelemetrySummary = {
    windowMinutes: boundedWindow,
    totalRuns: 0,
    totalErrors: 0,
    agentBreakdown: {
      mitra: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
      skills: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
      uniqueness: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
      boss: { runs: 0, errors: 0, successes: 0, fallbacks: 0, avgLatencyMs: 0, errorTypes: {}, recentErrors: [] },
    },
    providerBreakdown: {},
  };

  try {
    const pool = getPool();

    // 1. Query recent runs bounded by time and capped at 500 records
    const runsQuery = `
      SELECT
        agent_name,
        status,
        model_provider,
        latency_ms,
        metadata,
        created_at
      FROM public.agent_runs
      WHERE created_at >= (now() - ($1 || ' minutes')::interval)
      ORDER BY created_at DESC
      LIMIT 500
    `;
    const runsRes = await pool.query(runsQuery, [boundedWindow]);

    // 2. Query recent errors bounded by time and capped at 200 records
    const errorsQuery = `
      SELECT
        agent_name,
        error_type,
        error_message,
        fallback_triggered,
        metadata,
        created_at
      FROM public.agent_errors
      WHERE created_at >= (now() - ($1 || ' minutes')::interval)
      ORDER BY created_at DESC
      LIMIT 200
    `;
    const errorsRes = await pool.query(errorsQuery, [boundedWindow]);

    // Process runs data
    let totalRuns = 0;
    const latencySums: Record<string, { total: number; count: number }> = {};
    const providerLatencySums: Record<string, { total: number; count: number }> = {};

    for (const row of runsRes.rows) {
      const agent = row.agent_name as AgentName;
      if (!defaultSummary.agentBreakdown[agent]) continue;

      totalRuns++;
      const breakdown = defaultSummary.agentBreakdown[agent];
      breakdown.runs++;

      if (row.status === "success") {
        breakdown.successes++;
      } else if (row.status === "failed") {
        breakdown.errors++;
      }

      // Check fallbackCount in metadata
      const fbCount = typeof row.metadata?.fallbackCount === "number" ? row.metadata.fallbackCount : 0;
      if (fbCount > 0) {
        breakdown.fallbacks++;
      }

      // Track latency
      const lat = Number(row.latency_ms) || 0;
      if (!latencySums[agent]) latencySums[agent] = { total: 0, count: 0 };
      latencySums[agent].total += lat;
      latencySums[agent].count++;

      // Provider usage
      const provider = String(row.model_provider || "unknown").toLowerCase();
      if (!defaultSummary.providerBreakdown[provider]) {
        defaultSummary.providerBreakdown[provider] = {
          calls: 0,
          errors: 0,
          successes: 0,
          fallbacks: 0,
          avgLatencyMs: 0,
          recentErrors: [],
        };
      }
      defaultSummary.providerBreakdown[provider].calls++;
      if (row.status === "success") {
        defaultSummary.providerBreakdown[provider].successes = (defaultSummary.providerBreakdown[provider].successes || 0) + 1;
      } else if (row.status === "failed") {
        defaultSummary.providerBreakdown[provider].errors = (defaultSummary.providerBreakdown[provider].errors || 0) + 1;
      }
      if (fbCount > 0) {
        defaultSummary.providerBreakdown[provider].fallbacks = (defaultSummary.providerBreakdown[provider].fallbacks || 0) + 1;
      }
      if (!providerLatencySums[provider]) providerLatencySums[provider] = { total: 0, count: 0 };
      providerLatencySums[provider].total += lat;
      providerLatencySums[provider].count++;
    }

    // Compute average latencies for agents
    for (const [agent, { total, count }] of Object.entries(latencySums)) {
      const agentKey = agent as AgentName;
      if (defaultSummary.agentBreakdown[agentKey] && count > 0) {
        defaultSummary.agentBreakdown[agentKey].avgLatencyMs = Math.round(total / count);
      }
    }

    // Compute average latencies for providers
    for (const [prov, { total, count }] of Object.entries(providerLatencySums)) {
      if (defaultSummary.providerBreakdown[prov] && count > 0) {
        defaultSummary.providerBreakdown[prov].avgLatencyMs = Math.round(total / count);
      }
    }

    // Process errors data
    let totalErrors = 0;
    for (const row of errorsRes.rows) {
      const agent = row.agent_name as AgentName;
      if (!defaultSummary.agentBreakdown[agent]) continue;

      totalErrors++;
      const breakdown = defaultSummary.agentBreakdown[agent];
      const errType = String(row.error_type || "UNKNOWN");
      breakdown.errorTypes[errType] = (breakdown.errorTypes[errType] || 0) + 1;

      const safeErrMsg = sanitizeErrorOutput(String(row.error_message || ""));
      const errTimestamp = new Date(row.created_at).toISOString();

      if (breakdown.recentErrors.length < 5) {
        breakdown.recentErrors.push({
          type: errType,
          message: safeErrMsg,
          timestamp: errTimestamp,
        });
      }

      // Track provider errors if noted
      const provider = String(row.metadata?.provider || "").toLowerCase();
      if (provider && defaultSummary.providerBreakdown[provider]) {
        defaultSummary.providerBreakdown[provider].errors++;
        if (!defaultSummary.providerBreakdown[provider].recentErrors) {
          defaultSummary.providerBreakdown[provider].recentErrors = [];
        }
        if (defaultSummary.providerBreakdown[provider].recentErrors!.length < 5) {
          defaultSummary.providerBreakdown[provider].recentErrors!.push({
            type: errType,
            message: safeErrMsg,
            timestamp: errTimestamp,
          });
        }
      }
    }

    defaultSummary.totalRuns = totalRuns;
    defaultSummary.totalErrors = totalErrors;
    return defaultSummary;
  } catch (err) {
    console.warn("[BossDiagnostics] Telemetry DB query skipped (safe fallback):", sanitizeErrorOutput(String(err)));
    return defaultSummary;
  }
}

/**
 * Deterministically evaluates diagnostic patterns and correlates anomalies across agents.
 */
export function evaluateDiagnosticRules(
  telemetry: TelemetrySummary,
  thresholdOverrides?: Partial<HealthThresholds>
): {
  issues: DiagnosticIssue[];
  crossAgentCorrelations: CrossAgentCorrelation[];
} {
  const thresholds: HealthThresholds = {
    ...DEFAULT_HEALTH_THRESHOLDS,
    ...thresholdOverrides,
  };

  const issues: DiagnosticIssue[] = [];
  const crossAgentCorrelations: CrossAgentCorrelation[] = [];

  const mitraData = telemetry.agentBreakdown.mitra;
  const skillsData = telemetry.agentBreakdown.skills;
  const uniquenessData = telemetry.agentBreakdown.uniqueness;

  // ─── 1. MITRA DIAGNOSTICS ──────────────────────────────────────────────────
  if (mitraData && mitraData.runs > 0) {
    const errorRate = mitraData.errors / mitraData.runs;
    const fallbackRate = mitraData.fallbacks / mitraData.runs;

    // Mitra Critical Failure Spike
    if (errorRate >= thresholds.criticalErrorRate) {
      issues.push({
        id: "mitra-err-critical",
        agent: "mitra",
        severity: "CRITICAL",
        title: "Mitra Conversational Failure Spike",
        observation: `Mitra error rate is ${(errorRate * 100).toFixed(1)}% (${mitraData.errors} failed out of ${mitraData.runs} turns).`,
        likelyCause: "Primary and fallback AI model router endpoints unavailable or returning malformed responses.",
        possibleCauses: [
          "Google Gemini and OpenRouter concurrent API quota exhaustion",
          "Network connectivity or DNS resolution failures to LLM hosts",
          "Invalid request payload validation rejects",
        ],
        confidence: 0.92,
      });
    } else if (errorRate >= thresholds.warningErrorRate) {
      issues.push({
        id: "mitra-err-elevated",
        agent: "mitra",
        severity: "HIGH",
        title: "Mitra Conversational Error Rate Elevated",
        observation: `Mitra error rate reached ${(errorRate * 100).toFixed(1)}%.`,
        likelyCause: "Intermittent provider rate limits or upstream timeouts.",
        possibleCauses: ["High request concurrency", "Token limit exceeded on lengthy conversation context"],
        confidence: 0.85,
      });
    }

    // Mitra Fallback Spike
    if (fallbackRate >= thresholds.warningFallbackRate) {
      issues.push({
        id: "mitra-fallback-spike",
        agent: "mitra",
        severity: "MEDIUM",
        title: "Mitra Provider Fallback Spike",
        observation: `Mitra fallback rate is ${(fallbackRate * 100).toFixed(1)}% (${mitraData.fallbacks} fallbacks triggered).`,
        likelyCause: "Google Gemini (Primary) failing, forcing automatic fallback to OpenRouter.",
        possibleCauses: [
          "Gemini API rate limiting (HTTP 429)",
          "Temporary Google GenAI latency spikes exceeding timeout",
          "GEMINI_API_KEY quota cap reached",
        ],
        confidence: 0.88,
      });
    }

    // Mitra High Latency
    if (mitraData.avgLatencyMs > thresholds.highLatencyMs) {
      issues.push({
        id: "mitra-latency-high",
        agent: "mitra",
        severity: "LOW",
        title: "Mitra Voice Response Latency Elevated",
        observation: `Average response latency is ${mitraData.avgLatencyMs}ms (threshold: ${thresholds.highLatencyMs}ms).`,
        likelyCause: "Downstream model provider generation latency or multi-step fallback traversal.",
        possibleCauses: ["Complex multilingual prompt processing", "Network latency to provider datacenter"],
        confidence: 0.78,
      });
    }
  }

  // ─── 2. SKILLS AGENT DIAGNOSTICS ───────────────────────────────────────────
  if (skillsData && skillsData.runs > 0) {
    const errorRate = skillsData.errors / skillsData.runs;
    const fallbackRate = skillsData.fallbacks / skillsData.runs;

    if (errorRate >= thresholds.criticalErrorRate) {
      issues.push({
        id: "skills-err-critical",
        agent: "skills",
        severity: "CRITICAL",
        title: "Skills Agent Intelligence Outage",
        observation: `Skills Agent error rate is ${(errorRate * 100).toFixed(1)}%. Pre-generation skill selection failing.`,
        likelyCause: "Model router failure causing reliance on deterministic fallbacks or uncaught exceptions.",
        possibleCauses: ["Prompt schema mismatch", "Zod validation parse errors on model output"],
        confidence: 0.90,
      });
    }

    if (fallbackRate >= thresholds.warningFallbackRate) {
      issues.push({
        id: "skills-fallback-spike",
        agent: "skills",
        severity: "MEDIUM",
        title: "Skills Agent Model Fallback Spike",
        observation: `Skills Agent required fallback in ${(fallbackRate * 100).toFixed(1)}% of invocations.`,
        likelyCause: "Groq or Gemini rate limit on high-speed classification calls.",
        possibleCauses: ["Groq LPU API transient throttling", "Response validation failure forcing retry"],
        confidence: 0.84,
      });
    }
  }

  // ─── 3. UNIQUENESS AGENT DIAGNOSTICS ───────────────────────────────────────
  if (uniquenessData && uniquenessData.runs > 0) {
    const errorRate = uniquenessData.errors / uniquenessData.runs;
    const regenRate = typeof uniquenessData.metadataSummary?.regenerationRate === "number"
      ? uniquenessData.metadataSummary.regenerationRate
      : 0;

    if (errorRate >= thresholds.criticalErrorRate) {
      issues.push({
        id: "uniqueness-err-critical",
        agent: "uniqueness",
        severity: "CRITICAL",
        title: "Uniqueness Verification Engine Failure",
        observation: `Uniqueness Agent error rate is ${(errorRate * 100).toFixed(1)}%. Verification pipeline degraded.`,
        likelyCause: "Historical candidate comparison or AST parsing failure.",
        possibleCauses: ["Corrupted website data AST structure", "Model context window timeout on AST diff"],
        confidence: 0.89,
      });
    }

    // High Regeneration Rate
    if (regenRate >= thresholds.uniquenessRegenWarningRate) {
      issues.push({
        id: "uniqueness-regen-spike",
        agent: "uniqueness",
        severity: "MEDIUM",
        title: "Uniqueness Agent Regeneration Spike",
        observation: `Uniqueness regeneration rate is ${(regenRate * 100).toFixed(1)}% (threshold: ${(thresholds.uniquenessRegenWarningRate * 100).toFixed(1)}%).`,
        likelyCause: "Generated websites repeatedly colliding with historical design patterns.",
        possibleCauses: [
          "Skills Agent recommending repetitive design fingerprints for identical business categories",
          "Website generator prompt lack of layout variance",
          "Overly strict uniqueness threshold",
        ],
        confidence: 0.86,
      });
    }
  }

  // ─── 4. CROSS-AGENT CORRELATIONS ───────────────────────────────────────────
  // Pattern A: Systemic Design Repetition
  // Skills Agent design repetition + Uniqueness Agent regeneration spike
  const hasUniquenessRegenIssue = issues.some((i) => i.id === "uniqueness-regen-spike");
  const hasSkillsFallbackOrErrors = issues.some((i) => i.agent === "skills");

  if (hasUniquenessRegenIssue) {
    crossAgentCorrelations.push({
      agents: ["skills", "uniqueness"],
      pattern: "Systemic Design Repetition Loop",
      significance: "MEDIUM",
      description:
        "High Uniqueness regeneration rate correlates with upstream design fingerprint selection. The Skills Agent may be selecting uniform design tokens across similar businesses, causing the Uniqueness Agent to trigger repetitive redesign cycles.",
    });
  }

  // Pattern B: Upstream Provider Outage
  // Multiple agents experiencing elevated fallbacks or errors on the same provider
  const mitraFallback = mitraData && mitraData.runs > 0 && (mitraData.fallbacks / mitraData.runs) >= thresholds.degradedFallbackRate;
  const skillsFallback = skillsData && skillsData.runs > 0 && (skillsData.fallbacks / skillsData.runs) >= thresholds.degradedFallbackRate;

  if (mitraFallback && skillsFallback) {
    crossAgentCorrelations.push({
      agents: ["mitra", "skills"],
      pattern: "Multi-Agent Primary Provider Throttling",
      significance: "HIGH",
      description:
        "Both Mitra and Skills Agent are concurrently experiencing elevated provider fallback rates. This indicates an upstream infrastructure constraint or quota cap on the primary model provider (Google Gemini) rather than agent-specific logic errors.",
    });
  }

  return { issues, crossAgentCorrelations };
}

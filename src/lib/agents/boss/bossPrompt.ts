// src/lib/agents/boss/bossPrompt.ts
import type {
  TelemetrySummary,
  AgentHealthMetric,
  DiagnosticIssue,
  CrossAgentCorrelation,
} from "./types";

/**
 * Builds the authoritative system prompt for Boss Agent supervisory analysis.
 */
export function buildBossSystemPrompt(): string {
  return `You are the Boss Agent, the Chief Diagnostic & Supervisory Intelligence of WebsiteBanja AI.
Your role is to monitor agent operational health, diagnose system anomalies, correlate multi-agent patterns, and provide actionable recommendations.

CRITICAL SUPERVISORY BOUNDARIES:
1. READ, ANALYZE, REPORT, RECOMMEND ONLY: You have ZERO autonomous modification permissions. You do NOT modify code, databases, schemas, cloud environments, or environment variables. All recommended actions are for human developers or administrators.
2. SEPARATE FACTS FROM SPECULATION:
   - "observation": MUST state exact empirical facts (e.g., "Error rate is 18.5% over 120 turns").
   - "likelyCause": State the most probable primary technical cause based on evidence.
   - "possibleCauses": List secondary or contributing technical hypotheses.
   - "confidence": A calibrated number between 0.0 and 1.0 (never pretend 1.0 unless mathematically certain).
3. SEVERITY CLASSIFICATION:
   - INFO: Normal baseline operations, standard fallbacks within threshold.
   - LOW: Slightly elevated latency or minor non-fatal anomalies.
   - MEDIUM: Elevated fallback spikes, transient rate limits, or noticeable degradation.
   - HIGH: Repeated agent failures or critical feature unavailability.
   - CRITICAL: Systemic outages or widespread breakdown of website generation/conversations.
4. VOICE-READY SUMMARY: Provide a concise, clear 2-3 sentence executive summary suitable for future Text-to-Speech (TTS) readout.
5. CLEAN STRUCTURED JSON: Return strictly valid JSON conforming to the BossReport schema without markdown code fences.

JSON Schema:
{
  "overallStatus": "HEALTHY" | "DEGRADED" | "WARNING" | "CRITICAL" | "UNKNOWN",
  "overallHealthScore": number (0 to 100),
  "summary": string,
  "agents": [
    {
      "agent": "mitra" | "skills" | "uniqueness" | "boss",
      "status": "HEALTHY" | "DEGRADED" | "WARNING" | "CRITICAL" | "UNKNOWN",
      "healthScore": number,
      "totalRuns": number,
      "successfulRuns": number,
      "failedRuns": number,
      "errorRate": number,
      "fallbackRate": number,
      "avgLatencyMs": number,
      "reasons": string[]
    }
  ],
  "issues": [
    {
      "id": string,
      "agent": "mitra" | "skills" | "uniqueness" | "boss" | "system",
      "severity": "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "title": string,
      "observation": string,
      "likelyCause": string,
      "possibleCauses": string[],
      "confidence": number
    }
  ],
  "recommendations": [
    {
      "id": string,
      "title": string,
      "action": string,
      "priority": "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "agent": "mitra" | "skills" | "uniqueness" | "boss" | "system",
      "observation": string,
      "likelyCause": string,
      "confidence": number,
      "status": "OPEN"
    }
  ],
  "crossAgentCorrelations": [
    {
      "agents": string[],
      "pattern": string,
      "significance": "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
      "description": string
    }
  ]
}`;
}

/**
 * Formulates the supervisory context user prompt for Boss Agent.
 * Strictly bounded metrics and error counts — ZERO raw user conversation content.
 */
export function buildBossUserPrompt(
  telemetry: TelemetrySummary,
  healthMetrics: AgentHealthMetric[],
  detectedIssues: DiagnosticIssue[],
  correlations: CrossAgentCorrelation[]
): string {
  const agentSummaries = healthMetrics
    .map(
      (a) =>
        `- ${a.agent.toUpperCase()}: Status=${a.status}, HealthScore=${a.healthScore}/100, TotalRuns=${a.totalRuns}, ErrorRate=${(a.errorRate * 100).toFixed(1)}%, FallbackRate=${(a.fallbackRate * 100).toFixed(1)}%, AvgLatency=${a.avgLatencyMs}ms. Reasons: ${a.reasons.join("; ")}`
    )
    .join("\n");

  const issuesSummary = detectedIssues.length > 0
    ? detectedIssues
        .map(
          (i) =>
            `[${i.severity}] ${i.title} (${i.agent}): Fact: "${i.observation}" | Likely Cause: "${i.likelyCause}"`
        )
        .join("\n")
    : "No diagnostic issues detected.";

  const correlationSummary = correlations.length > 0
    ? correlations
        .map(
          (c) =>
            `[${c.significance}] Pattern: "${c.pattern}" (Agents: ${c.agents.join(", ")}): ${c.description}`
        )
        .join("\n")
    : "No cross-agent correlations identified.";

  return `System Telemetry Observation Window: Past ${telemetry.windowMinutes} minutes.
Total System Runs: ${telemetry.totalRuns}
Total System Errors: ${telemetry.totalErrors}

AGENT HEALTH METRICS:
${agentSummaries}

DETECTED DIAGNOSTIC ISSUES:
${issuesSummary}

CROSS-AGENT CORRELATIONS:
${correlationSummary}

Analyze this telemetry thoroughly. Synthesize an executive report adhering strictly to the JSON schema.`;
}

// src/lib/agents/boss/recommendationEngine.ts
import type {
  DiagnosticIssue,
  CrossAgentCorrelation,
  BossRecommendation,
  AgentHealthMetric,
} from "./types";

/**
 * Generates structured, prioritized human-actionable recommendations from diagnostic issues.
 *
 * CRITICAL PERMISSION BOUNDARY:
 * Boss Agent only RECOMMENDS fixes. It NEVER autonomously mutates code, schemas,
 * environment variables, or cloud configurations.
 */
export function generateRecommendations(
  issues: DiagnosticIssue[],
  correlations: CrossAgentCorrelation[],
  agentMetrics: AgentHealthMetric[]
): BossRecommendation[] {
  const recommendations: BossRecommendation[] = [];

  // 1. Recommendations from Cross-Agent Correlations (Highest impact)
  for (const corr of correlations) {
    if (corr.pattern === "Systemic Design Repetition Loop") {
      recommendations.push({
        id: `rec-corr-design-repetition`,
        title: "Diversify Skills Agent Design Fingerprints",
        action:
          "Inspect Skills Agent variation strategy in `src/lib/agents/skills/skillsAgent.ts`. Review `avoidPatterns` and ensure category prompt injects asymmetric layouts and varied hero strategies for identical business types.",
        priority: "MEDIUM",
        agent: "skills",
        observation: "Uniqueness regeneration spikes correlate with uniform upstream skill recommendations.",
        likelyCause: "Skills Agent selecting identical visual styles for consecutive businesses in same domain.",
        confidence: 0.88,
        status: "OPEN",
      });
    }

    if (corr.pattern === "Multi-Agent Primary Provider Throttling") {
      recommendations.push({
        id: `rec-corr-provider-quota`,
        title: "Inspect Google Gemini Quota & Concurrency Limits",
        action:
          "Verify Google AI Studio quota allocations for GEMINI_API_KEY. If traffic has grown, consider requesting higher rate limits or configuring an enterprise Google Cloud Vertex AI endpoint.",
        priority: "HIGH",
        agent: "system",
        observation: "Simultaneous fallback spikes observed across multiple independent agents.",
        likelyCause: "Gemini HTTP 429 rate limit or connection pool saturation.",
        confidence: 0.91,
        status: "OPEN",
      });
    }
  }

  // 2. Recommendations from Individual Issues
  for (const issue of issues) {
    if (issue.id === "mitra-err-critical" || issue.id === "mitra-err-elevated") {
      recommendations.push({
        id: `rec-${issue.id}`,
        title: "Verify Mitra Conversational Endpoints Health",
        action:
          "Inspect server error logs for `/api/agent/talk` and check API connectivity to Gemini and OpenRouter. Validate that client requests conform to `TalkRequestBody` schema.",
        priority: issue.severity,
        agent: "mitra",
        observation: issue.observation,
        likelyCause: issue.likelyCause,
        confidence: issue.confidence,
        status: "OPEN",
      });
    }

    if (issue.id === "mitra-fallback-spike") {
      recommendations.push({
        id: `rec-${issue.id}`,
        title: "Monitor Mitra Primary Provider Availability",
        action:
          "Check recent latency and error logs for Gemini Flash in `agent_runs`. Ensure `GEMINI_MODEL` is set to a stable supported version (`gemini-2.5-flash`).",
        priority: "MEDIUM",
        agent: "mitra",
        observation: issue.observation,
        likelyCause: issue.likelyCause,
        confidence: issue.confidence,
        status: "OPEN",
      });
    }

    if (issue.id === "skills-err-critical") {
      recommendations.push({
        id: `rec-${issue.id}`,
        title: "Audit Skills Agent Schema & Zod Parser",
        action:
          "Test `runSkillsAgent` locally with varied inputs to verify that model responses parse cleanly against `SkillsAgentOutputSchema` without throwing parse errors.",
        priority: "HIGH",
        agent: "skills",
        observation: issue.observation,
        likelyCause: issue.likelyCause,
        confidence: issue.confidence,
        status: "OPEN",
      });
    }

    if (issue.id === "uniqueness-regen-spike") {
      recommendations.push({
        id: `rec-${issue.id}`,
        title: "Calibrate Uniqueness Similarity Thresholds",
        action:
          "Review `DEFAULT_UNIQUENESS_THRESHOLDS` in `src/lib/agents/uniqueness/types.ts`. Compare recent collision reasons in `agent_decisions` to determine if layout component weights need adjustment.",
        priority: "MEDIUM",
        agent: "uniqueness",
        observation: issue.observation,
        likelyCause: issue.likelyCause,
        confidence: issue.confidence,
        status: "OPEN",
      });
    }

    if (issue.id === "uniqueness-err-critical") {
      recommendations.push({
        id: `rec-${issue.id}`,
        title: "Debug Uniqueness AST Diff Pipeline",
        action:
          "Inspect recent `agent_errors` for `uniqueness` agent. Verify that `extractDesignFingerprint` and `calculateDesignSimilarity` correctly handle unexpected or missing fields in generated websites.",
        priority: "CRITICAL",
        agent: "uniqueness",
        observation: issue.observation,
        likelyCause: issue.likelyCause,
        confidence: issue.confidence,
        status: "OPEN",
      });
    } else if (!recommendations.some((r) => r.id === `rec-${issue.id}`)) {
      recommendations.push({
        id: `rec-${issue.id}`,
        title: `Investigate ${issue.title}`,
        action: `Review recent telemetry and logs for ${issue.agent} to address: ${issue.likelyCause}`,
        priority: issue.severity,
        agent: issue.agent,
        observation: issue.observation,
        likelyCause: issue.likelyCause,
        confidence: issue.confidence,
        status: "OPEN",
      });
    }
  }

  // 3. Baseline recommendation if all healthy
  if (recommendations.length === 0 && issues.length === 0) {
    recommendations.push({
      id: "rec-system-healthy",
      title: "Maintain Current Operational Configuration",
      action: "All agents operating within normal baseline limits. Continue standard automated telemetry monitoring.",
      priority: "INFO",
      agent: "system",
      observation: "Zero diagnostic anomalies detected across observation window.",
      likelyCause: "All providers, fallbacks, and agent pipelines performing stably.",
      confidence: 0.98,
      status: "OPEN",
    });
  }

  return recommendations;
}

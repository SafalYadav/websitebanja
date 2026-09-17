// src/lib/agents/boss/bossAgent.ts
import { ModelRouter } from "@/lib/ai/router/modelRouter";
import { MODEL_CONFIG, sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import type { RoutingPolicy } from "@/lib/ai/router/types";
import { recordAgentRun } from "../telemetry";
import type {
  BossInput,
  BossReport,
  TelemetrySummary,
  AgentHealthMetric,
  DiagnosticIssue,
  CrossAgentCorrelation,
  BossRecommendation,
} from "./types";
import { BossReportSchema } from "./types";
import { analyzeAgentHealth } from "./healthAnalyzer";
import { fetchTelemetrySummary, evaluateDiagnosticRules } from "./diagnostics";
import { generateRecommendations } from "./recommendationEngine";
import { buildBossSystemPrompt, buildBossUserPrompt } from "./bossPrompt";

/**
 * Builds a deterministic voice-ready summary string from health metrics and issues.
 */
function buildDeterministicSummary(
  overallStatus: string,
  overallScore: number,
  issues: DiagnosticIssue[],
  agents: AgentHealthMetric[]
): string {
  if (overallStatus === "HEALTHY") {
    return `WebsiteBanja AI agent operations are fully healthy with an overall score of ${overallScore} out of 100. All monitored conversational and generation pipelines are operating stably.`;
  }

  const primaryIssue = issues[0];
  const affectedAgent = primaryIssue ? primaryIssue.agent.toUpperCase() : "system";
  const issueDetail = primaryIssue ? primaryIssue.observation : "elevated error or fallback rates detected";

  return `WebsiteBanja AI status is ${overallStatus} with an overall health score of ${overallScore} out of 100. Primary attention is required on ${affectedAgent}: ${issueDetail}. Review recommended developer actions.`;
}

/**
 * Executes the Boss Agent supervisory and diagnostic analysis engine.
 *
 * CRITICAL PERMISSION BOUNDARY:
 * Boss Agent has READ, ANALYZE, REPORT, RECOMMEND permissions only.
 * Zero autonomous code modifications, shell commands, or database mutations.
 */
export async function runBossAgent(
  input?: BossInput,
  options?: {
    userId?: string | null;
    timeoutMs?: number;
    policy?: Partial<RoutingPolicy>;
  }
): Promise<BossReport> {
  const startTime = performance.now();
  const windowMinutes = input?.windowMinutes ?? 1440; // Default 24 hours

  // 1. Ingest bounded telemetry (synthetic for isolated testing, or fetched from DB)
  const telemetry: TelemetrySummary =
    input?.syntheticTelemetry || (await fetchTelemetrySummary(windowMinutes));

  // 2. Deterministic baseline analysis
  const health = analyzeAgentHealth(telemetry, input?.thresholdOverrides);
  const { issues, crossAgentCorrelations } = evaluateDiagnosticRules(
    telemetry,
    input?.thresholdOverrides
  );
  const recommendations = generateRecommendations(
    issues,
    crossAgentCorrelations,
    health.agents
  );

  const deterministicSummary = buildDeterministicSummary(
    health.overallStatus,
    health.overallHealthScore,
    issues,
    health.agents
  );

  // Deterministic fallback report (used if LLM providers are unavailable or fail)
  const fallbackReport: BossReport = {
    generatedAt: new Date().toISOString(),
    windowMinutes,
    overallStatus: health.overallStatus,
    overallHealthScore: health.overallHealthScore,
    summary: deterministicSummary,
    agents: health.agents,
    issues,
    recommendations,
    crossAgentCorrelations,
    telemetrySummary: telemetry,
    metadata: {
      engine: "deterministic_rule_diagnostics",
      totalIssues: issues.length,
      totalRecommendations: recommendations.length,
    },
  };

  // 3. Attempt LLM supervisory synthesis via ModelRouter (Gemini -> OpenRouter -> Groq -> fallback)
  let finalReport: BossReport = fallbackReport;
  let modelProviderUsed = "deterministic";
  let modelNameUsed = "rule_engine";
  let routerSuccess = false;

  try {
    const router = new ModelRouter();
    const routingPolicy = options?.policy || MODEL_CONFIG.agentPolicies.boss();

    const systemPrompt = buildBossSystemPrompt();
    const userPrompt = buildBossUserPrompt(
      telemetry,
      health.agents,
      issues,
      crossAgentCorrelations
    );

    const routerResponse = await router.route({
      systemPrompt,
      userPrompt,
      temperature: 0.2, // Low temperature for factual diagnostic precision
      maxTokens: 1500,
      timeoutMs: options?.timeoutMs || routingPolicy.timeoutMs,
    }, routingPolicy);

    if (routerResponse.success && routerResponse.rawText) {
      let cleaned = routerResponse.rawText.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      }
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
      }

      const parsedJson = JSON.parse(cleaned);
      const validated = BossReportSchema.safeParse(parsedJson);

      if (validated.success) {
        finalReport = {
          generatedAt: new Date().toISOString(),
          windowMinutes,
          overallStatus: validated.data.overallStatus,
          overallHealthScore: validated.data.overallHealthScore,
          summary: validated.data.summary,
          agents: validated.data.agents as AgentHealthMetric[],
          issues: validated.data.issues as DiagnosticIssue[],
          recommendations: validated.data.recommendations as BossRecommendation[],
          crossAgentCorrelations: validated.data.crossAgentCorrelations as CrossAgentCorrelation[],
          telemetrySummary: telemetry,
          metadata: {
            engine: "ai_model_router",
            provider: routerResponse.provider,
            model: routerResponse.model,
            fallbackCount: routerResponse.fallbackCount,
          },
        };
        modelProviderUsed = routerResponse.provider;
        modelNameUsed = routerResponse.model;
        routerSuccess = true;
      } else {
        console.warn(
          "[BossAgent] AI output validation failed against schema; using deterministic fallback:",
          validated.error.issues
        );
      }
    }
  } catch (llmErr) {
    console.warn(
      "[BossAgent] Model router execution failed; using deterministic fallback:",
      sanitizeErrorOutput(String(llmErr))
    );
  }

  const totalLatencyMs = Math.round(performance.now() - startTime);

  // 4. Record Boss Agent's own invocation telemetry (non-blocking)
  void recordAgentRun({
    agentName: "boss",
    userId: options?.userId,
    status: routerSuccess ? "success" : "failed",
    modelProvider: modelProviderUsed as any,
    modelName: modelNameUsed,
    latencyMs: totalLatencyMs,
    tokensUsed: {},
    metadata: {
      overallStatus: finalReport.overallStatus,
      overallHealthScore: finalReport.overallHealthScore,
      issuesDetected: finalReport.issues.length,
      recommendationsCount: finalReport.recommendations.length,
      windowMinutes,
    },
  }).catch(() => {});

  return finalReport;
}

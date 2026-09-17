// src/lib/agents/boss/index.ts
export * from "./types";
export { runBossAgent } from "./bossAgent";
export { analyzeAgentHealth } from "./healthAnalyzer";
export { fetchTelemetrySummary, evaluateDiagnosticRules } from "./diagnostics";
export { generateRecommendations } from "./recommendationEngine";
export { buildBossSystemPrompt, buildBossUserPrompt } from "./bossPrompt";
export { analyzeVisualQuality } from "./visualQualityAnalyzer";
export type { BossVisualQualityReport, VisualDimensionAudit, VisualQualityInput } from "./visualQualityAnalyzer";
export * from "./research/types";
export { computeResearchFingerprint, CANONICAL_RESEARCH_DISCOVERIES, getBossResearchReport } from "./research/researchRepository";

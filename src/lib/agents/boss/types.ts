// src/lib/agents/boss/types.ts
import { z } from "zod";
import type { AgentName } from "../types";

export type AgentHealthStatus = "HEALTHY" | "DEGRADED" | "WARNING" | "CRITICAL" | "UNKNOWN";
export type IssueSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Health assessment of a specific agent.
 */
export interface AgentHealthMetric {
  agent: AgentName;
  status: AgentHealthStatus;
  healthScore: number; // 0 to 100 normalized
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  errorRate: number; // 0.0 to 1.0
  fallbackRate: number; // 0.0 to 1.0
  avgLatencyMs: number;
  reasons: string[];
  metrics?: Record<string, unknown>;
}

/**
 * Root-cause diagnostic issue separating observed facts from speculative causes.
 */
export interface DiagnosticIssue {
  id: string;
  agent: AgentName | "system";
  severity: IssueSeverity;
  title: string;
  observation: string; // Observed fact
  likelyCause: string; // Most probable primary cause
  possibleCauses: string[]; // Secondary or contributing possibilities
  confidence: number; // 0.0 to 1.0
  timestamp?: string;
}

/**
 * Actionable recommendation directed to human developers or administrators.
 * Strict permission: Boss CANNOT autonomously apply fixes.
 */
export interface BossRecommendation {
  id: string;
  title: string;
  action: string;
  priority: IssueSeverity;
  agent: AgentName | "system";
  observation?: string;
  likelyCause?: string;
  confidence: number;
  status: "OPEN" | "RESOLVED" | "DISMISSED";
}

/**
 * Correlated diagnostic pattern spanning multiple agents.
 */
export interface CrossAgentCorrelation {
  agents: AgentName[];
  pattern: string;
  significance: IssueSeverity;
  description: string;
}

/**
 * Bounded summary of raw system telemetry.
 */
export interface TelemetrySummary {
  windowMinutes: number;
  totalRuns: number;
  totalErrors: number;
  agentBreakdown: Record<
    AgentName,
    {
      runs: number;
      errors: number;
      successes: number;
      fallbacks: number;
      avgLatencyMs: number;
      errorTypes: Record<string, number>;
      recentErrors: Array<{ type: string; message: string; timestamp: string }>;
      metadataSummary?: Record<string, unknown>;
    }
  >;
  providerBreakdown: Record<
    string,
    {
      calls: number;
      errors: number;
      successes?: number;
      fallbacks?: number;
      avgLatencyMs?: number;
      recentErrors?: Array<{ type: string; message: string; timestamp: string }>;
    }
  >;
}

/**
 * Complete structured supervisor report returned by Boss Agent.
 */
export interface BossReport {
  generatedAt: string;
  windowMinutes: number;
  overallStatus: AgentHealthStatus;
  overallHealthScore: number; // 0 to 100 normalized
  summary: string; // Voice-ready concise narrative for future TTS
  agents: AgentHealthMetric[];
  issues: DiagnosticIssue[];
  recommendations: BossRecommendation[];
  crossAgentCorrelations: CrossAgentCorrelation[];
  telemetrySummary?: TelemetrySummary;
  metadata?: Record<string, unknown>;
}

/**
 * Configurable thresholds for health evaluation.
 */
export interface HealthThresholds {
  degradedErrorRate: number; // default: 0.05 (5%)
  warningErrorRate: number; // default: 0.15 (15%)
  criticalErrorRate: number; // default: 0.30 (30%)
  degradedFallbackRate: number; // default: 0.20 (20%)
  warningFallbackRate: number; // default: 0.40 (40%)
  highLatencyMs: number; // default: 8000ms
  uniquenessRegenWarningRate: number; // default: 0.25 (25%)
}

export const DEFAULT_HEALTH_THRESHOLDS: HealthThresholds = {
  degradedErrorRate: 0.05,
  warningErrorRate: 0.15,
  criticalErrorRate: 0.30,
  degradedFallbackRate: 0.20,
  warningFallbackRate: 0.40,
  highLatencyMs: 8000,
  uniquenessRegenWarningRate: 0.25,
};

/**
 * Input options when invoking Boss Agent.
 */
export interface BossInput {
  windowMinutes?: number; // default: 1440 (24 hours)
  filterAgent?: AgentName;
  thresholdOverrides?: Partial<HealthThresholds>;
  syntheticTelemetry?: TelemetrySummary; // Used for isolated testing & dry-runs
}

/**
 * Zod validation schema for runtime LLM output parsing.
 */
export const BossReportSchema = z.object({
  overallStatus: z.enum(["HEALTHY", "DEGRADED", "WARNING", "CRITICAL", "UNKNOWN"]),
  overallHealthScore: z.number().min(0).max(100),
  summary: z.string(),
  agents: z.array(
    z.object({
      agent: z.enum(["skills", "uniqueness", "boss", "mitra"]),
      status: z.enum(["HEALTHY", "DEGRADED", "WARNING", "CRITICAL", "UNKNOWN"]),
      healthScore: z.number().min(0).max(100),
      totalRuns: z.number().default(0),
      successfulRuns: z.number().default(0),
      failedRuns: z.number().default(0),
      errorRate: z.number().default(0),
      fallbackRate: z.number().default(0),
      avgLatencyMs: z.number().default(0),
      reasons: z.array(z.string()).default([]),
      metrics: z.record(z.string(), z.any()).optional(),
    })
  ),
  issues: z.array(
    z.object({
      id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
      agent: z.enum(["skills", "uniqueness", "boss", "mitra", "system"]),
      severity: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      title: z.string(),
      observation: z.string(),
      likelyCause: z.string(),
      possibleCauses: z.array(z.string()).default([]),
      confidence: z.number().min(0).max(1).default(0.8),
    })
  ).default([]),
  recommendations: z.array(
    z.object({
      id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
      title: z.string(),
      action: z.string(),
      priority: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      agent: z.enum(["skills", "uniqueness", "boss", "mitra", "system"]),
      observation: z.string().optional(),
      likelyCause: z.string().optional(),
      confidence: z.number().min(0).max(1).default(0.8),
      status: z.enum(["OPEN", "RESOLVED", "DISMISSED"]).default("OPEN"),
    })
  ).default([]),
  crossAgentCorrelations: z.array(
    z.object({
      agents: z.array(z.enum(["skills", "uniqueness", "boss", "mitra"])),
      pattern: z.string(),
      significance: z.enum(["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"]),
      description: z.string(),
    })
  ).default([]),
});

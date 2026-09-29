// src/lib/analytics/types.ts

import type { PipelineStage } from "../automation/pipelineTypes";

export type TimeFilter = "24h" | "7d" | "30d" | "all";

// ============================================================
// FUNNEL ANALYTICS
// ============================================================

export type FunnelStageId =
  | "discovered"
  | "qualified"
  | "audited"
  | "preview_created"
  | "outreach_prepared"
  | "outreach_simulated"
  | "reply_received"
  | "interested";

export interface FunnelStageMetric {
  stageId: FunnelStageId;
  label: string;
  count: number;
  conversionRateFromPrevious: number; // percentage (0 - 100)
  conversionRateFromStart: number;    // percentage (0 - 100)
  dropOffCount: number;
  dropOffRate: number;                // percentage (0 - 100)
}

export interface FunnelAnalyticsReport {
  stages: FunnelStageMetric[];
  totalLeadsStarted: number;
  totalLeadsConverted: number; // reached interested stage
  overallConversionRate: number; // percentage
  biggestDropOffStage: {
    stageId: FunnelStageId;
    label: string;
    dropOffCount: number;
    dropOffRate: number;
  } | null;
}

// ============================================================
// PIPELINE PERFORMANCE METRICS
// ============================================================

export interface StagePerformanceMetric {
  stage: PipelineStage | string;
  totalExecutions: number;
  successExecutions: number;
  failedExecutions: number;
  retryCount: number;
  avgDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  totalDurationMs: number;
}

export interface PipelinePerformanceReport {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  partialRuns: number;
  pausedRuns: number;
  runningRuns: number;
  avgPipelineDurationMs: number;
  minPipelineDurationMs: number;
  maxPipelineDurationMs: number;
  totalPipelineDurationMs: number;
  totalRetries: number;
  overallFailureRate: number; // percentage (0 - 100)
  stages: Record<string, StagePerformanceMetric>;
  slowestStage: {
    stage: string;
    avgDurationMs: number;
  } | null;
}

// ============================================================
// AI USAGE & COST ESTIMATION
// ============================================================

export interface AIOperationRecord {
  id: string;
  timestamp: string;
  provider: string;
  model: string;
  stage: string;
  operationType: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
}

export interface ModelUsageSummary {
  model: string;
  provider: string;
  operations: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  successRate: number; // percentage (0 - 100)
  pricingStatus: "KNOWN" | "UNKNOWN";
  estimatedCostUsd: number | null;
}

export interface AIUsageReport {
  totalOperations: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgLatencyMs: number;
  overallSuccessRate: number; // percentage
  byModel: Record<string, ModelUsageSummary>;
  byStage: Record<string, { operations: number; totalTokens: number; avgLatencyMs: number }>;
  byProvider: Record<string, { operations: number; totalTokens: number; avgLatencyMs: number }>;
}

export interface ModelPricingConfig {
  inputPerMillionUsd: number;
  outputPerMillionUsd: number;
  note?: string;
}

export interface UnitEconomics {
  costPerDiscoveredLeadUsd: number | null;
  costPerQualifiedLeadUsd: number | null;
  costPerAuditedLeadUsd: number | null;
  costPerPreviewGeneratedUsd: number | null;
  costPerOutreachDraftedUsd: number | null;
  costPerReplyAnalyzedUsd: number | null;
  costPerConvertedLeadUsd: number | null;
}

export interface CostEstimateReport {
  knownEstimatedCostUsd: number;
  hasUnknownCosts: boolean;
  unknownModelsCount: number;
  unknownModels: string[];
  totalOperations: number;
  costByStage: Record<string, number>;
  costByModel: Record<string, {
    operations: number;
    tokens: number;
    costUsd: number | null;
    status: "KNOWN" | "UNKNOWN";
  }>;
  unitEconomics: UnitEconomics;
}

// ============================================================
// CACHE & IDEMPOTENCY ANALYSIS
// ============================================================

export interface CacheAnalysisReport {
  totalCacheLookups: number;
  cacheHits: number;
  cacheMisses: number;
  hitRate: number; // percentage (0 - 100)
  preventedDuplicateOperations: number;
  estimatedTimeSavedMs: number;
  estimatedTokensSaved: number;
  estimatedCostSavedUsd: number;
}

// ============================================================
// OPTIMIZATION ENGINE
// ============================================================

export type OptimizationFindingType =
  | "excessive_retries"
  | "bottleneck_stage"
  | "repeated_generations"
  | "expensive_model_mismatch"
  | "low_confidence_classification"
  | "low_funnel_conversion"
  | "high_failure_rate";

export interface OptimizationFinding {
  id: string;
  type: OptimizationFindingType;
  stage?: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  evidence: string;
  impact: string;
  recommendation: string;
  potentialSavingsUsd?: number;
}

export interface OptimizationReport {
  timestamp: string;
  timeFilter: TimeFilter;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  healthScore: number; // 0 - 100
  findings: OptimizationFinding[];
}

// ============================================================
// COMPOSITE ANALYTICS REPORT
// ============================================================

export interface PipelineAnalyticsDashboard {
  timeFilter: TimeFilter;
  generatedAt: string;
  funnel: FunnelAnalyticsReport;
  performance: PipelinePerformanceReport;
  usage: AIUsageReport;
  cost: CostEstimateReport;
  cache: CacheAnalysisReport;
  optimization: OptimizationReport;
}

// ============================================================
// REAL-WORLD PROVIDER INTERFACES (PHASE 15+ CONTRACTS)
// ============================================================

export interface DiscoveryProviderCriteria {
  industry?: string;
  location?: string;
  radiusKm?: number;
  maxResults?: number;
  apiKey?: string;
}

export interface DiscoveredLeadRaw {
  externalId: string;
  name: string;
  phone?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  metadata?: Record<string, unknown>;
}

export interface DiscoveryProviderInterface {
  providerName: "google_places" | "maps_scraper" | "mock_directory" | string;
  isSimulated: boolean;
  search(criteria: DiscoveryProviderCriteria): Promise<{
    leads: DiscoveredLeadRaw[];
    totalFound: number;
    latencyMs: number;
  }>;
}

export interface EmailMessagePayload {
  toEmail: string;
  toName: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  replyTo?: string;
  trackingId?: string;
}

export interface EmailProviderInterface {
  providerName: "gmail_api" | "resend" | "sendgrid" | "mock_email" | string;
  isSimulated: boolean;
  sendEmail(payload: EmailMessagePayload): Promise<{
    messageId: string;
    status: "sent" | "queued" | "failed";
    sentAt: string;
    error?: string;
  }>;
}

export interface WhatsAppMessagePayload {
  toPhoneNumber: string;
  templateName?: string;
  bodyText: string;
  previewUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppProviderInterface {
  providerName: "whatsapp_cloud_api" | "twilio" | "mock_whatsapp" | string;
  isSimulated: boolean;
  sendMessage(payload: WhatsAppMessagePayload): Promise<{
    messageId: string;
    status: "sent" | "delivered" | "failed";
    sentAt: string;
    error?: string;
  }>;
}

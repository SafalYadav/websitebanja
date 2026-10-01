// src/lib/intelligence/commandCenter/commandCenterTypes.ts
// Phase 26 — CEO Command Center
// Strongly-typed definitions for all 15 required sections of the CEO Command Center.

export type SystemHealthStatus = "HEALTHY" | "DEGRADED" | "CRITICAL" | "Awaiting execution" | "Not available";

export interface ExecutiveOverviewData {
  activeObjectivesCount: number;
  activeTasksCount: number;
  delegatedTasksCount: number;
  pendingApprovalsCount: number;
  activePipelineRunsCount: number;
  recentFailuresCount: number;
  agentHealthSummary: {
    healthy: number;
    degraded: number;
    critical: number;
    unknown: number;
  };
  systemHealth: SystemHealthStatus;
  recentCeoDecisionsCount: number;
}

export interface CurrentObjectiveData {
  objective: string;
  priority: "low" | "medium" | "high" | "critical";
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  nextAction: string;
  constraints: string[];
}

export interface CurrentPriorityData {
  level: "low" | "medium" | "high" | "critical" | "Not available";
  objective: string;
  nextAction: string;
}

export interface ActiveTaskItem {
  taskId: string;
  parentTaskId: string | null;
  objective: string;
  agent: string;
  status: string;
  priority: string;
  riskLevel: string;
  deadline: string | null;
  progress: string | null;
  failureState: string | null;
}

export interface DelegationNodeItem {
  taskId: string;
  parentTaskId: string | null;
  assignedAgent: string;
  status: string;
  risk: string;
  approvalRequired: boolean;
  budget: Record<string, unknown> | null;
  deadline: string | null;
  children: DelegationNodeItem[];
}

export interface AgentStatusItem {
  agent: string;
  title: string;
  role: string;
  state: "active" | "idle" | "waiting" | "failed" | "unavailable";
  currentTask: string | null;
  lastActivity: string | null;
  lastResult: string | null;
  failureState: string | null;
}

export interface ToolActivityItem {
  tool: string;
  agent: string;
  task: string | null;
  timestamp: string;
  status: "success" | "failed" | "running" | "skipped" | "blocked";
  durationMs: number | null;
  failure: string | null;
}

export interface MemoryInsightsData {
  recentLessons: Array<{
    id: string;
    domain: string;
    rule: string;
    confidence: number;
    status: string;
    createdAt: string;
  }>;
  recentStrategicMemory: Array<{
    strategyId: string;
    domain: string;
    version: number;
    tacticsCount: number;
    status: string;
  }>;
  relevantExperienceMemory: Array<{
    runId: string;
    domain: string;
    objective: string;
    success: boolean;
    timestamp: string;
  }>;
  recentMemoryUpdates: Array<{
    id: string;
    type: string;
    title: string;
    timestamp: string;
  }>;
  evidenceStatus: Array<{
    source: string;
    verified: boolean;
    description: string;
  }>;
  contradictions: Array<{
    conflictId: string;
    topic: string;
    severity: string;
    resolution: string | null;
  }>;
  strategyVersions: Array<{
    version: number;
    domain: string;
    tacticsCount: number;
  }>;
}

export interface FailureIncidentItem {
  id: string;
  failureType: string;
  component: string;
  task: string | null;
  agent: string | null;
  timestamp: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  errorSummary: string;
  retryStatus: string | null;
  recoveryStatus: string | null;
}

export interface ApprovalQueueItem {
  approvalId: string;
  action: string;
  tool: string | null;
  requestingAgent: string;
  tenantId: string | null;
  riskLevel: string;
  createdAt: string;
  expiresAt: string | null;
  status: string;
  details: Record<string, unknown> | null;
}

export interface ApprovalQueueData {
  totalPending: number;
  approvals: ApprovalQueueItem[];
}

export interface PipelineRunItem {
  pipelineRunId: string;
  leadCount: number;
  currentStage: string;
  status: string;
  lastUpdate: string;
  failure: string | null;
  approvalState: string | null;
  nextStage: string | null;
  leadsSummary: Array<{
    leadId: string;
    businessName: string;
    stage: string;
    status: string;
  }>;
}

export interface ProductionJobOverviewItem {
  jobId: string;
  businessName: string;
  location: string;
  niche: string;
  state: string;
  objective: string;
  websiteStatus: string;
  validationDecision: string | null;
  approvalStatus: string | null;
  retries: number;
  failureFingerprint: string | null;
  blockedReason: string | null;
  nextAction: string;
  updatedAt: string;
}

export interface PipelineStatusData {
  activeRunsCount: number;
  stages: string[];
  runs: PipelineRunItem[];
  productionJobs?: ProductionJobOverviewItem[];
  activeProductionJobsCount?: number;
}

export interface LearningStatusData {
  totalLessons: number;
  candidateLessons: number;
  validatedLessons: number;
  promotedStrategies: number;
  recentExperiments: Array<{
    experimentId: string;
    hypothesis: string;
    status: string;
    outcome?: string;
  }>;
  evaluationActivity: Array<{
    evalId: string;
    score: number;
    passed: boolean;
    timestamp: string;
  }>;
  // Phase 27 Learning Loop Enrichments
  activeCandidates?: number;
  underEvaluation?: number;
  regressionPending?: number;
  approvalPending?: number;
  rolledBackCount?: number;
  rejectedCount?: number;
}

export interface SystemHealthData {
  overallStatus: SystemHealthStatus;
  websiteBanja: {
    status: string;
    uptimeSec: number;
    version: string;
  };
  database: {
    status: string;
    latencyMs?: number;
    isAzureConfigured: boolean;
  };
  storage: {
    status: string;
    provider: string;
  };
  n8nOpsAgent: {
    status: string;
    webhookConfigured: boolean;
    mode: string;
  };
  readiness: {
    ready: boolean;
    environment: string;
  };
}

export interface RecentCeoDecisionItem {
  runId: string;
  timestamp: string;
  objective: string;
  priority: string;
  decisionSummary: string;
  plan: string[];
  delegationsCount: number;
  toolCallsCount: number;
  constraints: string[];
  risk: string[];
  approvalRequired: boolean;
  nextAction: string;
  outcome: string;
}

export interface NextRecommendedActionData {
  action: string;
  source: string;
  priority: string;
  reason: string | null;
}

export interface ValidationStatusSummary {
  validationStatus: string;
  currentStage: string;
  passFail: string;
  blockingFailuresCount: number;
  retryCount: number;
  remainingRetries: number;
  lastValidationTimestamp: string | null;
  nextAction: string;
}

export interface CeoCommandCenterData {
  timestamp: string;
  tenantId: string | null;
  // 15 Sections
  executiveOverview: ExecutiveOverviewData;
  currentObjective: CurrentObjectiveData;
  currentPriority: CurrentPriorityData;
  activeTasks: ActiveTaskItem[];
  delegations: DelegationNodeItem[];
  agentStatus: AgentStatusItem[];
  toolActivity: ToolActivityItem[];
  memoryInsights: MemoryInsightsData;
  failures: FailureIncidentItem[];
  approvalQueue: ApprovalQueueData;
  pipelineStatus: PipelineStatusData;
  learningStatus: LearningStatusData;
  systemHealth: SystemHealthData;
  recentCeoDecisions: RecentCeoDecisionItem[];
  nextRecommendedAction: NextRecommendedActionData;
  // Self-Correction & Validation Layer (Requirement #21)
  validationStatus?: ValidationStatusSummary;
}


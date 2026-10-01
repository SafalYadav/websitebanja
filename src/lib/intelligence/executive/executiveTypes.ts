// src/lib/intelligence/executive/executiveTypes.ts
import { z } from "zod";

export type ExecutiveExecutionState =
  | "IDLE"
  | "OBSERVING"
  | "UNDERSTANDING"
  | "PLANNING"
  | "DELEGATING"
  | "VERIFYING"
  | "REPAIRING"
  | "ESCALATING"
  | "REPORTING"
  | "COMPLETED"
  | "FAILED";

export type ExecutivePriority = "low" | "medium" | "high" | "critical";

export type ToolPermissionLevel =
  | "READ"
  | "ANALYZE"
  | "PLAN"
  | "WRITE_INTERNAL"
  | "WRITE_EXTERNAL"
  | "HIGH_RISK_ACTION";

export interface ExecutiveDelegation {
  agent: string;
  task: string;
  priority?: ExecutivePriority;
  expected_output?: string;
  parameters?: Record<string, unknown>;
  status?: "pending" | "running" | "completed" | "failed" | "skipped";
  result?: unknown;
  error?: string;
}

export interface ExecutiveToolCall {
  tool: string;
  parameters: Record<string, unknown>;
  permission_level?: ToolPermissionLevel;
  status?: "pending" | "running" | "completed" | "failed" | "blocked";
  result?: unknown;
  error?: string;
}

export interface ExecutiveDecision {
  objective: string;
  priority: ExecutivePriority;
  plan: string[];
  delegations: ExecutiveDelegation[];
  tool_calls: ExecutiveToolCall[];
  constraints: string[];
  risk: string[];
  approval_required: boolean;
  next_action: string;
  report: string;
}

export const ExecutiveDelegationSchema = z.object({
  agent: z.string(),
  task: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
  expected_output: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).optional().default({}),
  status: z.enum(["pending", "running", "completed", "failed", "skipped"]).optional().default("pending"),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export const ExecutiveToolCallSchema = z.object({
  tool: z.string(),
  parameters: z.record(z.string(), z.unknown()).optional().default({}),
  permission_level: z
    .enum(["READ", "ANALYZE", "PLAN", "WRITE_INTERNAL", "WRITE_EXTERNAL", "HIGH_RISK_ACTION"])
    .optional(),
  status: z.enum(["pending", "running", "completed", "failed", "blocked"]).optional().default("pending"),
  result: z.unknown().optional(),
  error: z.string().optional(),
});

export const ExecutiveDecisionSchema = z.object({
  objective: z.string(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  plan: z.array(z.string()).default([]),
  delegations: z.array(ExecutiveDelegationSchema).default([]),
  tool_calls: z.array(ExecutiveToolCallSchema).default([]),
  constraints: z.array(z.string()).default([]),
  risk: z.array(z.string()).default([]),
  approval_required: z.boolean().default(false),
  next_action: z.string().default("execute_plan"),
  report: z.string().default(""),
});

export interface ExecutiveTaskRequest {
  objective: string;
  priority?: ExecutivePriority;
  context?: Record<string, unknown>;
  constraints?: string[];
  userId?: string | null;
  projectId?: string | null;
  sessionId?: string | null;
  allowExternalWrite?: boolean;
  requireHumanApproval?: boolean;
  overrides?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface ExecutiveVerificationResult {
  rule: string;
  passed: boolean;
  details?: string;
  categoryMismatch?: boolean;
  detectedCategory?: string;
  expectedCategory?: string;
}

export interface ExecutiveEscalation {
  reason: string;
  severity: "warning" | "critical";
  timestamp: string;
  actionRequired?: string;
}

export interface ExecutiveExecutionTrajectoryStep {
  state: ExecutiveExecutionState;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface ExecutiveExecutionResult {
  runId: string;
  objective: string;
  state: ExecutiveExecutionState;
  priority: ExecutivePriority;
  decision: ExecutiveDecision;
  delegationResults: Array<{
    agent: string;
    task: string;
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
  toolCallResults: Array<{
    tool: string;
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
  verifications: ExecutiveVerificationResult[];
  escalations: ExecutiveEscalation[];
  repairsApplied: number;
  trajectory: ExecutiveExecutionTrajectoryStep[];
  report: string;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface RegisteredAgentMetadata {
  name: string;
  role: string;
  capabilities: string[];
  allowedInputs: string[];
  expectedOutputSchema: string;
  riskLevel: "low" | "medium" | "high";
  operationalAvailability: "healthy" | "degraded" | "disabled";
  delegationRules: string[];
  execute: (task: string, params: Record<string, unknown>, context: ExecutiveContext) => Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
}

export interface RegisteredToolMetadata {
  name: string;
  description: string;
  permissionLevel: ToolPermissionLevel;
  riskLevel: "low" | "medium" | "high";
  parametersSchema: z.ZodTypeAny;
  timeoutMs: number;
  maxRetries: number;
  execute: (params: Record<string, unknown>, context: ExecutiveContext) => Promise<{
    success: boolean;
    data?: unknown;
    error?: string;
  }>;
}

export interface ExecutiveContext {
  runId: string;
  objective: string;
  priority: ExecutivePriority;
  userId?: string | null;
  projectId?: string | null;
  sessionId?: string | null;
  allowExternalWrite: boolean;
  requireHumanApproval: boolean;
  constraints: string[];
  detectedDomain?: string;
  systemMetrics?: Record<string, unknown>;
  availableAgents: string[];
  availableTools: string[];
  history: Array<{ action: string; result: unknown; timestamp: string }>;
  startTime: number;
  retrievedMemories?: Array<{
    id: string;
    level: string;
    title: string;
    content: unknown;
    domain: string;
    confidence: number;
  }>;
  activeStrategy?: Record<string, unknown> | null;
  relevantLessons?: Array<Record<string, unknown>>;
  businessContext?: Record<string, unknown> | null;
  retrievedMemory?: any;
}

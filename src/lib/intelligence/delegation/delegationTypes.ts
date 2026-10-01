// src/lib/intelligence/delegation/delegationTypes.ts
import { z } from "zod";

export type DelegationRiskLevel = "low" | "medium" | "high" | "critical";

export type DelegationStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "ESCALATED"
  | "BLOCKED"
  | "PARTIAL";

export interface TaskBudget {
  maxToolCalls?: number;
  maxModelCalls?: number;
  maxRetries?: number;
  maxDurationMs?: number;
  estimatedCost?: number;
}

export interface TaskEnvelope {
  taskId: string;
  parentTaskId: string | null;
  objective: string;
  agent: string;
  input: Record<string, unknown>;
  constraints: string[];
  toolAllowlist: string[];
  budget: TaskBudget;
  deadline: string; // ISO 8601 string
  expectedOutput: Record<string, unknown> | string;
  successCriteria: string[];
  riskLevel: DelegationRiskLevel;

  // Metadata & Context
  depth: number; // 0: CEO, 1: Boss, 2: Skill / Uniqueness
  createdAt: string;
  createdBy: string;
  correlationId: string;
  tenantId?: string | null;
  projectId?: string | null;
  approvalRequired: boolean;
  status: DelegationStatus;
  metadata?: Record<string, unknown>;
}

export interface TaskConflict {
  conflictId: string;
  topic: string;
  sourceA: { agent: string; recommendation: string; reason?: string };
  sourceB: { agent: string; recommendation: string; reason?: string };
  severity: "low" | "medium" | "high";
  resolution: "resolved_locally" | "escalated_to_ceo" | "unresolved";
  resolvedOutcome: string | null;
  resolutionRationale: string | null;
}

export interface TaskEscalation {
  reason: string;
  fromAgent: string;
  toAgent: string;
  severity: DelegationRiskLevel;
  unresolvedConflicts: TaskConflict[];
  partialResults?: unknown;
  timestamp: string;
}

export interface TaskResultEnvelope {
  taskId: string;
  parentTaskId: string | null;
  agent: string;
  status: "completed" | "failed" | "escalated" | "partial";
  data: unknown;
  subtasks?: TaskResultEnvelope[];
  findings: string[];
  conflicts: TaskConflict[];
  recommendations: string[];
  confidence: number;
  evidence: Array<{
    source: string;
    description: string;
    verified: boolean;
  }>;
  artifacts: Array<{
    type: string;
    name: string;
    content: unknown;
  }>;
  durationMs: number;
  error?: string | null;
  escalation?: TaskEscalation | null;
  validation?: {
    passed: boolean;
    details?: string;
  };
  report?: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionTreeNode {
  taskId: string;
  parentTaskId: string | null;
  agent: string;
  objective: string;
  depth: number;
  status: DelegationStatus | "completed" | "failed" | "escalated";
  riskLevel: DelegationRiskLevel;
  approvalRequired: boolean;
  durationMs: number;
  result?: unknown;
  error?: string | null;
  escalation?: TaskEscalation | null;
  children: ExecutionTreeNode[];
  createdAt: string;
  completedAt?: string;
}

export interface AgentCapability {
  name: string;
  agent: string;
  category: "supervision" | "design" | "ux" | "validation" | "intake";
  description: string;
  keywords: string[];
}

export interface CapabilityMatchResult {
  agent: string;
  score: number;
  matchedCapabilities: string[];
  rationale: string;
}

export const TaskBudgetSchema = z.object({
  maxToolCalls: z.number().int().nonnegative().optional(),
  maxModelCalls: z.number().int().nonnegative().optional(),
  maxRetries: z.number().int().nonnegative().optional(),
  maxDurationMs: z.number().int().positive().optional(),
  estimatedCost: z.number().nonnegative().optional(),
});

export const TaskEnvelopeSchema = z.object({
  taskId: z.string().min(1),
  parentTaskId: z.string().nullable(),
  objective: z.string().min(1),
  agent: z.string().min(1),
  input: z.record(z.string(), z.unknown()).default({}),
  constraints: z.array(z.string()).default([]),
  toolAllowlist: z.array(z.string()).default([]),
  budget: TaskBudgetSchema.default({}),
  deadline: z.string().min(1),
  expectedOutput: z.union([z.record(z.string(), z.unknown()), z.string()]).default({}),
  successCriteria: z.array(z.string()).default([]),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  depth: z.number().int().min(0).max(2),
  createdAt: z.string(),
  createdBy: z.string(),
  correlationId: z.string(),
  tenantId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  approvalRequired: z.boolean(),
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "FAILED", "ESCALATED", "BLOCKED", "PARTIAL"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

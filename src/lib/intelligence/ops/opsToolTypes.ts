// src/lib/intelligence/ops/opsToolTypes.ts
import { z } from "zod";

export const OPS_TOOL_NAMES = [
  "discover_leads",
  "qualify_lead",
  "research_business",
  "audit_website",
  "generate_preview",
  "validate_preview",
  "create_outreach",
  "get_lead_status",
  "analyze_reply",
  "schedule_followup",
  "update_crm",
  "report_to_ceo",
] as const;

export type OpsToolName = (typeof OPS_TOOL_NAMES)[number];

export interface OpsToolRequest<TInput = Record<string, unknown>> {
  tool: OpsToolName;
  input: TInput;
  context?: Record<string, unknown>;
  requestId: string;
  taskId: string;
  tenantId?: string | null;
  projectId?: string | null;
  leadId?: string | null;
  userId?: string | null;
  idempotencyKey?: string;
  timestamp?: string;
}

export interface OpsToolResponse<TResult = unknown> {
  success: boolean;
  tool: OpsToolName;
  requestId: string;
  taskId: string;
  result: TResult;
  errors: string[];
  warnings: string[];
  metadata: {
    durationMs: number;
    executedAt: string;
    cached?: boolean;
    tenantId?: string | null;
    [key: string]: unknown;
  };
}

export interface CeoN8nTaskDispatch {
  taskId: string;
  objective: string;
  priority?: "low" | "medium" | "high" | "critical";
  constraints: string[];
  allowedTools: OpsToolName[];
  approvalRequired: boolean;
  tenantId?: string | null;
  projectId?: string | null;
  leadId?: string | null;
  input?: Record<string, unknown>;
  correlationId?: string;
}

export interface N8nCeoTaskCallback {
  taskId: string;
  status: "completed" | "failed" | "partial" | "approval_required" | "blocked";
  summary: string;
  actions: Array<{
    tool: OpsToolName;
    status: "success" | "failed" | "skipped";
    details?: string;
    timestamp: string;
  }>;
  results: Record<string, unknown>;
  failures: string[];
  approvalRequired: boolean;
  nextAction?: string;
  evidence: Array<{
    source: string;
    description: string;
    verified: boolean;
  }>;
  report?: string;
  timestamp: string;
}

// Zod validation schemas
export const OpsToolRequestSchema = z.object({
  tool: z.enum(OPS_TOOL_NAMES),
  input: z.record(z.string(), z.unknown()).default({}),
  context: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().min(1),
  taskId: z.string().min(1),
  tenantId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
  idempotencyKey: z.string().optional(),
  timestamp: z.string().optional(),
});

export const CeoN8nTaskDispatchSchema = z.object({
  taskId: z.string().min(1),
  objective: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  constraints: z.array(z.string()).default([]),
  allowedTools: z.array(z.enum(OPS_TOOL_NAMES)).default([...OPS_TOOL_NAMES]),
  approvalRequired: z.boolean().default(false),
  tenantId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  leadId: z.string().nullable().optional(),
  input: z.record(z.string(), z.unknown()).optional(),
  correlationId: z.string().optional(),
});

export const N8nCeoTaskCallbackSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["completed", "failed", "partial", "approval_required", "blocked"]),
  summary: z.string().min(1),
  actions: z.array(
    z.object({
      tool: z.enum(OPS_TOOL_NAMES),
      status: z.enum(["success", "failed", "skipped"]),
      details: z.string().optional(),
      timestamp: z.string(),
    })
  ).default([]),
  results: z.record(z.string(), z.unknown()).default({}),
  failures: z.array(z.string()).default([]),
  approvalRequired: z.boolean().default(false),
  nextAction: z.string().optional(),
  evidence: z.array(
    z.object({
      source: z.string(),
      description: z.string(),
      verified: z.boolean(),
    })
  ).default([]),
  report: z.string().optional(),
  timestamp: z.string(),
});

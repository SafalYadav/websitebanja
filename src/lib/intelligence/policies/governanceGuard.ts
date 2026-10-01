// src/lib/intelligence/policies/governanceGuard.ts
// Phase 25 — Governance & Action Authority
//
// GovernanceGuard wraps OpsToolExecutor.executeTool() with a pre-execution
// policy engine check. Every ops tool invocation must pass governance before
// it reaches the executor.
//
// Architecture: CEO → GovernanceGuard → PolicyEngine → OpsToolExecutor
//
// Rules:
// - If BLOCK → throw GovernanceViolationError immediately.
// - If REQUIRE_APPROVAL → return a requires_approval response (do NOT execute).
// - If ALLOW → proceed to OpsToolExecutor.
//
// The CEO remains outside n8n. GovernanceGuard sits between decision and execution.

import type { OpsToolRequest, OpsToolResponse } from "../ops/opsToolTypes";
import { OpsToolExecutor, opsToolExecutor } from "../ops/opsToolExecutor";
import { policyEngine, GovernanceViolationError } from "./policyEngine";
import { governanceAuditLog } from "./governanceAuditLog";
import type { GovernanceRequest, AuthorityLevel, GovernanceRiskLevel } from "./governanceTypes";

// Tool → authority level mapping
const TOOL_AUTHORITY: Record<string, AuthorityLevel> = {
  discover_leads: "READ",
  qualify_lead: "ANALYZE",
  research_business: "ANALYZE",
  audit_website: "ANALYZE",
  generate_preview: "WRITE_INTERNAL",
  validate_preview: "ANALYZE",
  create_outreach: "WRITE_INTERNAL",
  get_lead_status: "READ",
  analyze_reply: "ANALYZE",
  schedule_followup: "WRITE_INTERNAL",
  update_crm: "WRITE_INTERNAL",
  report_to_ceo: "WRITE_INTERNAL",
  // Executive tool registry tools
  lead_discovery: "READ",
  website_audit: "ANALYZE",
  preview_generation: "WRITE_INTERNAL",
  preview_validation: "ANALYZE",
  crm_lookup: "READ",
  outreach_draft: "WRITE_INTERNAL",
  system_health_check: "READ",
  send_outreach_email: "WRITE_EXTERNAL",
  send_whatsapp_message: "HIGH_RISK_ACTION",
};

const TOOL_RISK: Record<string, GovernanceRiskLevel> = {
  discover_leads: "low",
  qualify_lead: "low",
  research_business: "low",
  audit_website: "low",
  generate_preview: "medium",
  validate_preview: "low",
  create_outreach: "medium",
  get_lead_status: "low",
  analyze_reply: "low",
  schedule_followup: "low",
  update_crm: "low",
  report_to_ceo: "low",
  lead_discovery: "low",
  website_audit: "low",
  preview_generation: "medium",
  preview_validation: "low",
  crm_lookup: "low",
  outreach_draft: "medium",
  system_health_check: "low",
  send_outreach_email: "high",
  send_whatsapp_message: "critical",
};

export class GovernanceGuard {
  private static instance: GovernanceGuard;
  private executor: OpsToolExecutor;

  private constructor() {
    this.executor = opsToolExecutor;
  }

  public static getInstance(): GovernanceGuard {
    if (!GovernanceGuard.instance) {
      GovernanceGuard.instance = new GovernanceGuard();
    }
    return GovernanceGuard.instance;
  }

  /**
   * Governance-gated tool execution.
   *
   * Workflow:
   * 1. Build GovernanceRequest from OpsToolRequest context.
   * 2. Evaluate against PolicyEngine.
   * 3. If BLOCK → return error response (never execute).
   * 4. If REQUIRE_APPROVAL → return requires_approval response (never execute).
   * 5. If ALLOW → delegate to OpsToolExecutor.
   */
  public async executeTool(
    rawRequest: unknown,
    governanceContext?: {
      requestingAgent?: string;
      approvalId?: string;
      approvalState?: "pending" | "approved" | "rejected" | "expired";
    }
  ): Promise<OpsToolResponse<unknown>> {
    const req = rawRequest as Partial<OpsToolRequest>;
    const toolName = String(req?.tool || "unknown");
    const authorityLevel: AuthorityLevel = TOOL_AUTHORITY[toolName] ?? "HIGH_RISK_ACTION";
    const riskLevel: GovernanceRiskLevel = TOOL_RISK[toolName] ?? "critical";

    const govRequest: GovernanceRequest = {
      action: toolName,
      tool: toolName,
      requestingAgent: governanceContext?.requestingAgent || "n8n_ops_agent",
      authorityLevel,
      riskLevel,
      tenantId: req?.tenantId,
      taskId: req?.taskId,
      approvalId: governanceContext?.approvalId,
      approvalState: governanceContext?.approvalState,
      channel: (req?.input as Record<string, unknown>)?.channel as string | undefined,
      platform: (req?.input as Record<string, unknown>)?.platform as string | undefined,
    };

    const decision = policyEngine.evaluateAction(govRequest);

    if (decision.decision === "BLOCK") {
      return {
        success: false,
        tool: (req.tool as OpsToolRequest["tool"]) || "report_to_ceo",
        requestId: req.requestId || `gov_block_${Date.now()}`,
        taskId: req.taskId || "unknown",
        result: null,
        errors: [
          `[GOVERNANCE BLOCK] ${decision.reason} (policy: ${decision.policyId})`,
        ],
        warnings: [],
        metadata: {
          durationMs: 0,
          executedAt: new Date().toISOString(),
          tenantId: req.tenantId,
          governanceDecision: "BLOCK",
          policyId: decision.policyId,
        },
      };
    }

    if (decision.decision === "REQUIRE_APPROVAL") {
      return {
        success: false,
        tool: (req.tool as OpsToolRequest["tool"]) || "report_to_ceo",
        requestId: req.requestId || `gov_appr_req_${Date.now()}`,
        taskId: req.taskId || "unknown",
        result: {
          requiresHumanApproval: true,
          reason: decision.reason,
          policyId: decision.policyId,
        },
        errors: [`[GOVERNANCE REQUIRES_APPROVAL] ${decision.reason}`],
        warnings: [
          "Human approval is required before this action can be executed. " +
            "AI and CEO approval do not satisfy this requirement.",
        ],
        metadata: {
          durationMs: 0,
          executedAt: new Date().toISOString(),
          tenantId: req.tenantId,
          governanceDecision: "REQUIRE_APPROVAL",
          policyId: decision.policyId,
        },
      };
    }

    // ALLOW — delegate to OpsToolExecutor
    return this.executor.executeTool(rawRequest);
  }
}

export const governanceGuard = GovernanceGuard.getInstance();

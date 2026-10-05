// src/lib/intelligence/policies/policyEngine.ts
// Phase 25 — Governance & Action Authority
//
// Central PolicyEngine singleton.
// Evaluates every action against the governance rule set BEFORE execution.
// Integrates with existing SafetyPolicy — does NOT replace or duplicate it.
//
// Decision precedence (hard rule):
//   BLOCK > REQUIRE_APPROVAL > ALLOW
//
// Default-deny: if no rule explicitly allows an action → BLOCK.

import { randomUUID } from "crypto";
export { hashActionPayload } from "./canonicalPayloadHash";
import type {
  GovernanceDecision,
  GovernanceRequest,
  GovernanceApprovalRecord,
  GovernanceOutcome,
  PolicyRule,
  AuthorityLevel,
  GovernanceRiskLevel,
} from "./governanceTypes";
import { AUTHORITY_LEVEL_ORDER, authorityIndex } from "./governanceTypes";
import { GovernanceAuditLog, governanceAuditLog } from "./governanceAuditLog";
import { GovernanceApprovalStore, governanceApprovalStore } from "./governanceApprovalStore";

// ─── Canonical Auto-Allowed Read/Analyze/Internal Tools ──────────────────────

const AUTO_ALLOWED_TOOLS = new Set<string>([
  "discover_leads",
  "qualify_lead",
  "research_business",
  "audit_website",
  "generate_preview",
  "validate_preview",
  "get_lead_status",
  "update_crm",
  "report_to_ceo",
  "analyze_reply",
  "schedule_followup",
  // Executive tool registry equivalents
  "lead_discovery",
  "website_audit",
  "preview_generation",
  "preview_validation",
  "crm_lookup",
  "outreach_draft",
  "system_health_check",
]);

const WRITE_EXTERNAL_TOOLS = new Set<string>([
  "send_outreach_email",
  "create_outreach",
  "email_send",
]);

const PERMANENTLY_BLOCKED: PolicyRule = {
  ruleId: "BLOCK_WHATSAPP",
  description: "WhatsApp is permanently and unconditionally disabled in WebsiteBanja.",
  outcome: "BLOCK",
  priority: 0, // always evaluated first
  authorityLevel: "HIGH_RISK_ACTION",
  riskLevel: "critical",
  requiresHumanApproval: false,
  reason:
    "WhatsApp outbound communication is permanently disabled by WebsiteBanja safety policy. " +
    "This cannot be overridden by CEO approval, AI approval, or any agent.",
  matches: (req) => {
    const action = req.action.toLowerCase();
    const tool = (req.tool || "").toLowerCase();
    return (
      action.includes("whatsapp") ||
      tool.includes("whatsapp") ||
      req.channel === "whatsapp" ||
      req.platform === "whatsapp"
    );
  },
};

const PERMANENTLY_BLOCKED_TELEGRAM: PolicyRule = {
  ruleId: "BLOCK_TELEGRAM_PREMATURE",
  description: "Telegram is not yet implemented. Block any attempt to enable it.",
  outcome: "BLOCK",
  priority: 1,
  authorityLevel: "HIGH_RISK_ACTION",
  riskLevel: "high",
  requiresHumanApproval: false,
  reason: "Telegram integration is not yet implemented. Block all premature activation attempts.",
  matches: (req) => {
    const action = req.action.toLowerCase();
    const tool = (req.tool || "").toLowerCase();
    return (
      action.includes("telegram") ||
      tool.includes("telegram") ||
      req.channel === "telegram" ||
      req.platform === "telegram"
    );
  },
};

const BLOCK_HIGH_RISK_UNAPPROVED: PolicyRule = {
  ruleId: "BLOCK_HIGH_RISK_NO_APPROVAL",
  description:
    "HIGH_RISK_ACTION authority level requires an explicit, non-expired human approval record.",
  outcome: "BLOCK",
  priority: 5,
  authorityLevel: "HIGH_RISK_ACTION",
  riskLevel: "critical",
  requiresHumanApproval: true,
  reason:
    "HIGH_RISK_ACTION requires elevated human approval. No valid approval record was found. " +
    "AI approval and CEO approval do not count as human approval.",
  matches: (req) =>
    req.authorityLevel === "HIGH_RISK_ACTION" &&
    req.approvalState !== "approved",
};

const REQUIRE_APPROVAL_EXTERNAL_WRITE: PolicyRule = {
  ruleId: "REQUIRE_HUMAN_APPROVAL_EXTERNAL_WRITE",
  description:
    "Any external communication (email send, outreach dispatch) requires explicit human approval.",
  outcome: "REQUIRE_APPROVAL",
  priority: 10,
  authorityLevel: "WRITE_EXTERNAL",
  riskLevel: "high",
  requiresHumanApproval: true,
  reason:
    "External write actions (email sending, outreach dispatch) require explicit human approval. " +
    "AI approval and CEO approval are insufficient. Automated self-approval is blocked.",
  matches: (req) => {
    if (req.authorityLevel === "WRITE_EXTERNAL") return true;
    const tool = (req.tool || "").toLowerCase();
    const action = req.action.toLowerCase();
    if (WRITE_EXTERNAL_TOOLS.has(tool)) return true;
    if (action.includes("send_outreach") || action.includes("email_send")) return true;
    return false;
  },
};

const ALLOW_AUTO_ALLOWED_TOOLS: PolicyRule = {
  ruleId: "ALLOW_INTERNAL_OPS_TOOLS",
  description:
    "Research, audit, preview generation, CRM updates, and internal reporting are auto-allowed.",
  outcome: "ALLOW",
  priority: 20,
  authorityLevel: "WRITE_INTERNAL",
  riskLevel: "low",
  requiresHumanApproval: false,
  reason: "Action is on the governance auto-allowed list. No approval required.",
  matches: (req) => {
    const tool = (req.tool || "").toLowerCase();
    const action = req.action.toLowerCase();
    if (AUTO_ALLOWED_TOOLS.has(tool)) return true;
    if (AUTO_ALLOWED_TOOLS.has(action)) return true;
    return false;
  },
};

const ALLOW_READ_ANALYZE: PolicyRule = {
  ruleId: "ALLOW_READ_ANALYZE",
  description: "READ and ANALYZE authority levels are permitted without approval.",
  outcome: "ALLOW",
  priority: 25,
  authorityLevel: "READ",
  riskLevel: "low",
  requiresHumanApproval: false,
  reason: "READ/ANALYZE authority level — no external side effect. Permitted.",
  matches: (req) =>
    req.authorityLevel === "READ" || req.authorityLevel === "ANALYZE",
};

const ALLOW_PLAN: PolicyRule = {
  ruleId: "ALLOW_PLAN",
  description: "PLAN authority level is permitted without approval (no external side effect).",
  outcome: "ALLOW",
  priority: 26,
  authorityLevel: "PLAN",
  riskLevel: "low",
  requiresHumanApproval: false,
  reason: "PLAN authority level — creates plans/recommendations. No external side effect. Permitted.",
  matches: (req) => req.authorityLevel === "PLAN",
};

const ALLOW_WRITE_INTERNAL: PolicyRule = {
  ruleId: "ALLOW_WRITE_INTERNAL",
  description:
    "WRITE_INTERNAL authority level (CRM, memory, task records) is permitted without approval.",
  outcome: "ALLOW",
  priority: 27,
  authorityLevel: "WRITE_INTERNAL",
  riskLevel: "medium",
  requiresHumanApproval: false,
  reason: "WRITE_INTERNAL — modifies internal WebsiteBanja state only. Permitted.",
  matches: (req) => req.authorityLevel === "WRITE_INTERNAL",
};

// DEFAULT DENY — catches everything not explicitly allowed
const DEFAULT_DENY: PolicyRule = {
  ruleId: "DEFAULT_DENY",
  description:
    "Default-deny: any action not explicitly permitted by a prior rule is blocked.",
  outcome: "BLOCK",
  priority: 999,
  authorityLevel: "HIGH_RISK_ACTION",
  riskLevel: "critical",
  requiresHumanApproval: false,
  reason:
    "This action was not explicitly permitted by any governance policy rule. Default-deny applies. " +
    "Permission cannot be inferred from agent confidence, CEO intention, or previous successful execution.",
  matches: () => true, // always matches — evaluated last
};

// ─── Canonical Rule Set (ordered by priority ascending) ──────────────────────

const POLICY_RULES: PolicyRule[] = [
  PERMANENTLY_BLOCKED,
  PERMANENTLY_BLOCKED_TELEGRAM,
  BLOCK_HIGH_RISK_UNAPPROVED,
  REQUIRE_APPROVAL_EXTERNAL_WRITE,
  ALLOW_AUTO_ALLOWED_TOOLS,
  ALLOW_READ_ANALYZE,
  ALLOW_PLAN,
  ALLOW_WRITE_INTERNAL,
  DEFAULT_DENY,
].sort((a, b) => a.priority - b.priority);

// ─── Helper: hash action payload ─────────────────────────────────────────────

// ─── PolicyEngine ─────────────────────────────────────────────────────────────

export class PolicyEngine {
  private static instance: PolicyEngine;
  private rules: PolicyRule[];

  private constructor() {
    this.rules = [...POLICY_RULES];
  }

  public static getInstance(): PolicyEngine {
    if (!PolicyEngine.instance) {
      PolicyEngine.instance = new PolicyEngine();
    }
    return PolicyEngine.instance;
  }

  /**
   * Evaluates a governance request against all policy rules.
   *
   * Decision precedence (enforced by rule priority ordering):
   *   BLOCK > REQUIRE_APPROVAL > ALLOW
   *
   * If no rule matches (which cannot happen because DEFAULT_DENY always matches),
   * BLOCK is returned.
   *
   * @throws Never — returns a decision even for invalid inputs (with BLOCK decision).
   */
  public evaluateAction(request: GovernanceRequest): GovernanceDecision {
    const evaluatedAt = new Date().toISOString();

    // Walk rules in priority order; first rule that matches and is BLOCK or
    // REQUIRE_APPROVAL wins immediately (short-circuit). ALLOW rules only win
    // if no BLOCK or REQUIRE_APPROVAL rule has matched.
    let firstAllow: PolicyRule | null = null;

    for (const rule of this.rules) {
      if (!rule.matches(request)) continue;

      // BLOCK always wins — return immediately
      if (rule.outcome === "BLOCK") {
        const decision: GovernanceDecision = {
          decision: "BLOCK",
          authorityLevel: rule.authorityLevel,
          requiresHumanApproval: rule.requiresHumanApproval,
          reason: rule.reason,
          policyId: rule.ruleId,
          riskLevel: rule.riskLevel,
          tenantId: request.tenantId,
          taskId: request.taskId,
          evaluatedAt,
        };
        governanceAuditLog.record({ ...decision, action: request.action, requestingAgent: request.requestingAgent });
        return decision;
      }

      // REQUIRE_APPROVAL wins over ALLOW — continue scanning for BLOCK
      if (rule.outcome === "REQUIRE_APPROVAL") {
        // Don't return yet — keep checking for a BLOCK rule at higher priority
        // But since rules are sorted by priority, any BLOCK at lower priority
        // number has already been checked. Continue scan.
        const decision: GovernanceDecision = {
          decision: "REQUIRE_APPROVAL",
          authorityLevel: rule.authorityLevel,
          requiresHumanApproval: rule.requiresHumanApproval,
          reason: rule.reason,
          policyId: rule.ruleId,
          riskLevel: rule.riskLevel,
          tenantId: request.tenantId,
          taskId: request.taskId,
          evaluatedAt,
        };
        governanceAuditLog.record({ ...decision, action: request.action, requestingAgent: request.requestingAgent });
        return decision;
      }

      // ALLOW — record first match but continue checking for higher-priority blocks
      if (rule.outcome === "ALLOW" && firstAllow === null) {
        firstAllow = rule;
        // No break — continue to ensure no later BLOCK rule matches
        // (Rules are sorted so any BLOCK with lower priority number was already checked)
        // Since we've already passed all BLOCK rules of lower priority number,
        // we can return ALLOW immediately.
        const decision: GovernanceDecision = {
          decision: "ALLOW",
          authorityLevel: rule.authorityLevel,
          requiresHumanApproval: false,
          reason: rule.reason,
          policyId: rule.ruleId,
          riskLevel: rule.riskLevel,
          tenantId: request.tenantId,
          taskId: request.taskId,
          evaluatedAt,
        };
        governanceAuditLog.record({ ...decision, action: request.action, requestingAgent: request.requestingAgent });
        return decision;
      }
    }

    // Should never reach here because DEFAULT_DENY matches everything
    const fallback: GovernanceDecision = {
      decision: "BLOCK",
      authorityLevel: "HIGH_RISK_ACTION",
      requiresHumanApproval: false,
      reason: "Default-deny fallback (no rule matched, which should not occur).",
      policyId: "DEFAULT_DENY_FALLBACK",
      riskLevel: "critical",
      tenantId: request.tenantId,
      taskId: request.taskId,
      evaluatedAt,
    };
    governanceAuditLog.record({ ...fallback, action: request.action, requestingAgent: request.requestingAgent });
    return fallback;
  }

  /**
   * Convenience: evaluate and throw if BLOCK.
   */
  public requireAllow(request: GovernanceRequest): GovernanceDecision {
    const decision = this.evaluateAction(request);
    if (decision.decision === "BLOCK") {
      throw new GovernanceViolationError(decision.reason, decision.policyId, decision);
    }
    return decision;
  }

  /**
   * Lists all registered policy rules (metadata only, no closures).
   */
  public listRules(): Array<{
    ruleId: string;
    description: string;
    outcome: GovernanceOutcome;
    priority: number;
    authorityLevel: AuthorityLevel;
    riskLevel: GovernanceRiskLevel;
    requiresHumanApproval: boolean;
  }> {
    return this.rules.map((r) => ({
      ruleId: r.ruleId,
      description: r.description,
      outcome: r.outcome,
      priority: r.priority,
      authorityLevel: r.authorityLevel,
      riskLevel: r.riskLevel,
      requiresHumanApproval: r.requiresHumanApproval,
    }));
  }
}

export class GovernanceViolationError extends Error {
  public policyId: string;
  public decision: GovernanceDecision;

  constructor(message: string, policyId: string, decision: GovernanceDecision) {
    super(message);
    this.name = "GovernanceViolationError";
    this.policyId = policyId;
    this.decision = decision;
  }
}

export const policyEngine = PolicyEngine.getInstance();

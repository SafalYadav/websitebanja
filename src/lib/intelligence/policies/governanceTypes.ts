// src/lib/intelligence/policies/governanceTypes.ts
// Phase 25 — Governance & Action Authority
// Defines the canonical types for the Policy Engine, governance decisions,
// approval records, and budget policy.

import type { OpsToolName } from "../ops/opsToolTypes";

// ─── Authority Levels ────────────────────────────────────────────────────────

/**
 * Ordered authority levels. Higher indexes = greater privilege.
 * DENY/SAFETY takes precedence over REQUIRE_APPROVAL, which takes precedence
 * over ALLOW. Authority cannot be self-escalated by agents or the CEO.
 */
export type AuthorityLevel =
  | "READ"
  | "ANALYZE"
  | "PLAN"
  | "WRITE_INTERNAL"
  | "WRITE_EXTERNAL"
  | "HIGH_RISK_ACTION";

export const AUTHORITY_LEVEL_ORDER: AuthorityLevel[] = [
  "READ",
  "ANALYZE",
  "PLAN",
  "WRITE_INTERNAL",
  "WRITE_EXTERNAL",
  "HIGH_RISK_ACTION",
];

export function authorityIndex(level: AuthorityLevel): number {
  return AUTHORITY_LEVEL_ORDER.indexOf(level);
}

// ─── Risk Levels ─────────────────────────────────────────────────────────────

export type GovernanceRiskLevel = "low" | "medium" | "high" | "critical";

// ─── Governance Decisions ────────────────────────────────────────────────────

export type GovernanceOutcome = "ALLOW" | "REQUIRE_APPROVAL" | "BLOCK";

/**
 * Governance decision returned by the policy engine for every action evaluation.
 * DENY/SAFETY RESTRICTION > REQUIRE_APPROVAL > ALLOW
 */
export interface GovernanceDecision {
  /** The final outcome for this action evaluation. */
  decision: GovernanceOutcome;
  /** The authority level associated with this action. */
  authorityLevel: AuthorityLevel;
  /** Whether explicit human approval (not AI approval) is required. */
  requiresHumanApproval: boolean;
  /** Human-readable reason for the decision. Never contains secrets. */
  reason: string;
  /** The specific policy rule that drove this decision. */
  policyId: string;
  /** Risk classification for the action. */
  riskLevel: GovernanceRiskLevel;
  /** Tenant isolation context. */
  tenantId?: string | null;
  /** Task that triggered the evaluation. */
  taskId?: string | null;
  /** ISO timestamp of evaluation. */
  evaluatedAt: string;
}

// ─── Governance Request ──────────────────────────────────────────────────────

/**
 * Input to the policy engine. Submitted before any action is executed.
 */
export interface GovernanceRequest {
  /** The action name or tool name being evaluated. */
  action: string;
  /** The agent or system component requesting authorization. */
  requestingAgent: string;
  /** If this is a tool invocation, the ops tool name. */
  tool?: OpsToolName | string;
  /** The authority level being claimed by the requesting agent. */
  authorityLevel: AuthorityLevel;
  /** Risk level claimed or inferred. */
  riskLevel: GovernanceRiskLevel;
  /** Tenant context (required for multi-tenant isolation). */
  tenantId?: string | null;
  /** Associated task identifier. */
  taskId?: string | null;
  /** Budget context for cost-related actions. */
  budget?: {
    estimatedCost?: number;
    currency?: string;
  };
  /** If there is a pre-existing approval record, its ID. */
  approvalId?: string | null;
  /** The channel (e.g., "email", "whatsapp"). */
  channel?: string;
  /** Platform, for WhatsApp detection. */
  platform?: string;
  /** Whether approval state is being consulted. */
  approvalState?: "pending" | "approved" | "rejected" | "expired";
  /** Any additional context for rule evaluation. */
  context?: Record<string, unknown>;
}

// ─── Governance Approval Records ─────────────────────────────────────────────

export type GovernanceApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "SUPERSEDED";

/**
 * A one-time, non-reusable approval record for a specific versioned action.
 * An approval NEVER becomes an unlimited reusable authorization.
 * Modifying the approved content requires re-approval.
 */
export interface GovernanceApprovalRecord {
  approvalId: string;
  tenantId?: string | null;
  taskId?: string | null;
  action: string;
  tool?: string;
  requestedBy: string;
  requestedAt: string;
  status: GovernanceApprovalStatus;
  /** MUST NOT be "system", "ai", or any automated identifier. */
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  /** Hard expiry. Expired records cannot authorize actions. */
  expiresAt?: string;
  /**
   * SHA-256 hex hash of the exact action payload that was approved.
   * If the payload changes, a new approval is required.
   */
  actionHash: string;
  /** Whether this record has been consumed (used to execute an action). */
  consumed: boolean;
  consumedAt?: string;
}

// ─── Budget Policy ────────────────────────────────────────────────────────────

export interface BudgetPolicy {
  /** Budget envelope ID. */
  policyId: string;
  tenantId?: string | null;
  currency: string;
  maxAllowedSpend: number;
  currentSpend: number;
  /** Whether approval is required for any spend exceeding this threshold. */
  approvalThreshold: number;
  approvalRequired: boolean;
}

// ─── Policy Rule ──────────────────────────────────────────────────────────────

/**
 * A single governance policy rule. Rules are evaluated in order.
 * First matching rule whose outcome is BLOCK or REQUIRE_APPROVAL wins.
 * If no rule matches, default-deny applies (BLOCK).
 */
export interface PolicyRule {
  /** Unique policy identifier. */
  ruleId: string;
  /** Human description. */
  description: string;
  /** The outcome this rule enforces. */
  outcome: GovernanceOutcome;
  /** Priority — lower number = evaluated first. */
  priority: number;
  /**
   * Matcher function.
   * @returns true if this rule applies to the given request.
   */
  matches: (request: GovernanceRequest) => boolean;
  /** The authority level associated with this rule. */
  authorityLevel: AuthorityLevel;
  /** Risk level associated with this rule. */
  riskLevel: GovernanceRiskLevel;
  /** Whether human approval (not AI) is required when this rule triggers. */
  requiresHumanApproval: boolean;
  /** The reason returned in the GovernanceDecision. */
  reason: string;
}

// ─── Audit Log Entry ─────────────────────────────────────────────────────────

/**
 * Append-only governance audit log entry.
 * Secrets MUST NOT appear in any field.
 */
export interface GovernanceAuditEntry {
  auditId: string;
  evaluatedAt: string;
  action: string;
  requestingAgent: string;
  decision: GovernanceOutcome;
  authorityLevel: AuthorityLevel;
  riskLevel: GovernanceRiskLevel;
  policyId: string;
  reason: string;
  tenantId?: string | null;
  taskId?: string | null;
  requiresHumanApproval: boolean;
}

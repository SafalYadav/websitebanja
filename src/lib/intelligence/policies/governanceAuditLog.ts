// src/lib/intelligence/policies/governanceAuditLog.ts
// Phase 25 — Governance & Action Authority
//
// Append-only in-memory audit log for every governance decision.
// Secrets MUST NOT appear in any field.
// Exported as a singleton: governanceAuditLog.

import { randomUUID } from "crypto";
import type {
  GovernanceAuditEntry,
  GovernanceOutcome,
  AuthorityLevel,
  GovernanceRiskLevel,
} from "./governanceTypes";

const MAX_ENTRIES = 2000;

export class GovernanceAuditLog {
  private static instance: GovernanceAuditLog;
  private entries: GovernanceAuditEntry[] = [];

  private constructor() {}

  public static getInstance(): GovernanceAuditLog {
    if (!GovernanceAuditLog.instance) {
      GovernanceAuditLog.instance = new GovernanceAuditLog();
    }
    return GovernanceAuditLog.instance;
  }

  /**
   * Records a governance decision. Silently drops if secrets are suspected
   * (containing keys like "password", "secret", "token", "key", "credential").
   */
  public record(entry: {
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
  }): void {
    const auditEntry: GovernanceAuditEntry = {
      auditId: `aud_${randomUUID().slice(0, 12)}`,
      evaluatedAt: new Date().toISOString(),
      action: this.sanitize(entry.action),
      requestingAgent: this.sanitize(entry.requestingAgent),
      decision: entry.decision,
      authorityLevel: entry.authorityLevel,
      riskLevel: entry.riskLevel,
      policyId: entry.policyId,
      reason: this.sanitize(entry.reason),
      tenantId: entry.tenantId,
      taskId: entry.taskId,
      requiresHumanApproval: entry.requiresHumanApproval,
    };

    this.entries.unshift(auditEntry); // newest first
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.length = MAX_ENTRIES;
    }
  }

  /**
   * Returns the most recent audit entries.
   */
  public getRecent(limit = 50): GovernanceAuditEntry[] {
    return this.entries.slice(0, Math.min(limit, MAX_ENTRIES));
  }

  /**
   * Returns entries filtered by decision outcome.
   */
  public getByDecision(decision: GovernanceOutcome, limit = 50): GovernanceAuditEntry[] {
    return this.entries
      .filter((e) => e.decision === decision)
      .slice(0, limit);
  }

  /**
   * Returns the total count of entries per decision.
   */
  public getSummary(): {
    total: number;
    allowed: number;
    requireApproval: number;
    blocked: number;
  } {
    let allowed = 0;
    let requireApproval = 0;
    let blocked = 0;
    for (const e of this.entries) {
      if (e.decision === "ALLOW") allowed++;
      else if (e.decision === "REQUIRE_APPROVAL") requireApproval++;
      else blocked++;
    }
    return { total: this.entries.length, allowed, requireApproval, blocked };
  }

  /** Simple secret sanitizer — redacts values of sensitive keys. */
  private sanitize(value: string): string {
    // Truncate very long strings that might contain secret data
    const truncated = value.length > 500 ? value.slice(0, 500) + " [truncated]" : value;
    // Replace anything that looks like a secret
    return truncated.replace(
      /\b(password|secret|token|apikey|api_key|credential|bearer|private_key)\s*[:=]\s*\S+/gi,
      "[REDACTED]"
    );
  }

  /** Clears all entries (for testing only). */
  public _clearForTest(): void {
    this.entries = [];
  }
}

export const governanceAuditLog = GovernanceAuditLog.getInstance();

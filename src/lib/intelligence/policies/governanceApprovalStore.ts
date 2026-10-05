// src/lib/intelligence/policies/governanceApprovalStore.ts
// Phase 25 — Governance & Action Authority
//
// In-memory store for GovernanceApprovalRecord.
//
// Security invariants:
// - An approval is ONE-TIME only; once consumed it cannot re-authorize.
// - Expired approvals cannot authorize actions.
// - Rejected approvals cannot authorize actions.
// - approvedBy MUST NOT be "system", "ai", "ceo", or any automated identifier.
// - Modifying the approved action payload requires new approval (hash check).
// - CEO approval ≠ human approval.
// - Cross-tenant approvals are impossible.

import { randomUUID } from "crypto";
import type {
  GovernanceApprovalRecord,
} from "./governanceTypes";
import { hashActionPayload } from "./policyEngine";
import { requireHumanApproval } from "../pipeline/humanApprovalAuthorization";

const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours default
const MAX_RECORDS = 1000;

/** Identifiers that are NEVER valid as a human approver. */
const FORBIDDEN_APPROVER_IDS = new Set([
  "system",
  "ai",
  "ceo",
  "executive",
  "agent",
  "boss",
  "auto",
  "automated",
  "n8n",
  "pipeline",
  "gemini",
  "openai",
  "anthropic",
  "model",
]);

function isForbiddenApprover(approvedBy: string): boolean {
  const lower = approvedBy.toLowerCase().trim();
  if (FORBIDDEN_APPROVER_IDS.has(lower)) return true;
  // also block empty strings
  if (!lower) return true;
  return false;
}

export class GovernanceApprovalStore {
  private static instance: GovernanceApprovalStore;
  private records: Map<string, GovernanceApprovalRecord> = new Map();

  private constructor() {}

  public static getInstance(): GovernanceApprovalStore {
    if (!GovernanceApprovalStore.instance) {
      GovernanceApprovalStore.instance = new GovernanceApprovalStore();
    }
    return GovernanceApprovalStore.instance;
  }

  /**
   * Creates a new pending approval record.
   * Returns the approvalId.
   */
  public createApproval(params: {
    action: string;
    tool?: string;
    requestedBy: string;
    tenantId?: string | null;
    taskId?: string | null;
    actionPayload: unknown;
    ttlMs?: number;
  }): GovernanceApprovalRecord {
    const approvalId = `gov_appr_${randomUUID().slice(0, 12)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.ttlMs ?? APPROVAL_TTL_MS)).toISOString();

    const record: GovernanceApprovalRecord = {
      approvalId,
      tenantId: params.tenantId,
      taskId: params.taskId,
      action: params.action,
      tool: params.tool,
      requestedBy: params.requestedBy,
      requestedAt: now.toISOString(),
      status: "PENDING",
      actionHash: hashActionPayload(params.actionPayload),
      consumed: false,
      expiresAt,
    };

    this.records.set(approvalId, record);
    this.pruneOldest();
    return record;
  }

  /**
   * Approves a pending record.
   *
   * @throws If approvedBy is a forbidden (automated) identifier.
   * @throws If the record does not exist or is not in PENDING state.
   * @throws If the record belongs to a different tenant.
   */
  public approve(params: {
    approvalId: string;
    approvedBy: string;
    tenantId?: string | null;
    authorization?: unknown;
  }): GovernanceApprovalRecord {
    if (isForbiddenApprover(params.approvedBy)) {
      throw new Error(
        `Governance: '${params.approvedBy}' is not a valid human approver. ` +
          "AI, CEO, and automated identifiers cannot approve governance actions."
      );
    }
    const authenticatedUser = requireHumanApproval(params.authorization, params.tenantId);
    if (authenticatedUser !== params.approvedBy) throw new Error("Governance approver identity mismatch");

    const record = this.records.get(params.approvalId);
    if (!record) {
      throw new Error(`Governance: Approval record '${params.approvalId}' not found.`);
    }

    // Cross-tenant check
    if (
      !params.tenantId || !record.tenantId || params.tenantId !== record.tenantId
    ) {
      throw new Error(
        `Governance: Cross-tenant approval is forbidden. ` +
          `Record tenant: '${record.tenantId}', requestor tenant: '${params.tenantId}'.`
      );
    }

    if (record.status !== "PENDING") {
      throw new Error(
        `Governance: Cannot approve record '${params.approvalId}' with status '${record.status}'.`
      );
    }

    if (this.isExpired(record)) {
      const updated: GovernanceApprovalRecord = { ...record, status: "EXPIRED" };
      this.records.set(params.approvalId, updated);
      throw new Error(
        `Governance: Approval record '${params.approvalId}' has expired and cannot be approved.`
      );
    }

    const updated: GovernanceApprovalRecord = {
      ...record,
      status: "APPROVED",
      approvedBy: params.approvedBy,
      approvedAt: new Date().toISOString(),
    };
    this.records.set(params.approvalId, updated);
    return updated;
  }

  /**
   * Rejects a pending record.
   */
  public reject(params: {
    approvalId: string;
    rejectedBy: string;
    rejectionReason?: string;
    tenantId?: string | null;
    authorization?: unknown;
  }): GovernanceApprovalRecord {
    const authenticatedUser = requireHumanApproval(params.authorization, params.tenantId);
    if (authenticatedUser !== params.rejectedBy) throw new Error("Governance rejector identity mismatch");
    const record = this.records.get(params.approvalId);
    if (!record) {
      throw new Error(`Governance: Approval record '${params.approvalId}' not found.`);
    }
    if (!record.tenantId || record.tenantId !== params.tenantId) throw new Error("Governance approval is outside the authenticated tenant");
    if (record.status !== "PENDING") {
      throw new Error(`Governance: Record '${params.approvalId}' is not in PENDING state.`);
    }

    const updated: GovernanceApprovalRecord = {
      ...record,
      status: "REJECTED",
      rejectionReason: params.rejectionReason || "Rejected by reviewer.",
    };
    this.records.set(params.approvalId, updated);
    return updated;
  }

  /**
   * Validates whether an approval record can authorize an action.
   *
   * Checks:
   * - Record exists
   * - Status is APPROVED
   * - Not expired
   * - Not consumed
   * - Action hash matches (payload not modified)
   * - Tenant matches
   *
   * Returns { valid: true } or { valid: false, reason: string }.
   */
  public validateForExecution(params: {
    approvalId: string;
    actionPayload: unknown;
    tenantId?: string | null;
  }): { valid: boolean; reason?: string } {
    const record = this.records.get(params.approvalId);
    if (!record) {
      return { valid: false, reason: `Approval record '${params.approvalId}' not found.` };
    }

    if (record.status !== "APPROVED") {
      return {
        valid: false,
        reason: `Approval record '${params.approvalId}' has status '${record.status}', not APPROVED.`,
      };
    }

    if (this.isExpired(record)) {
      // Mark as expired
      this.records.set(params.approvalId, { ...record, status: "EXPIRED" });
      return { valid: false, reason: `Approval record '${params.approvalId}' has expired.` };
    }

    if (record.consumed) {
      return {
        valid: false,
        reason: `Approval record '${params.approvalId}' has already been consumed. Approvals are one-time use only.`,
      };
    }

    // Cross-tenant check
    if (
      !params.tenantId || !record.tenantId || params.tenantId !== record.tenantId
    ) {
      return {
        valid: false,
        reason: `Cross-tenant approval check failed for record '${params.approvalId}'.`,
      };
    }

    // Hash check — prevent "bait-and-switch" (approve draft A, send draft B)
    const currentHash = hashActionPayload(params.actionPayload);
    if (currentHash !== record.actionHash) {
      return {
        valid: false,
        reason:
          `Approval record '${params.approvalId}': the approved action payload has been modified. ` +
          "Re-approval is required.",
      };
    }

    return { valid: true };
  }

  /**
   * Marks an approval as consumed after the action executes.
   * Consumed records CANNOT be reused.
   */
  public consume(approvalId: string, tenantId?: string | null): void {
    const record = this.records.get(approvalId);
    if (!tenantId || !record || record.tenantId !== tenantId || record.status !== "APPROVED" || record.consumed || this.isExpired(record)) {
      throw new Error("Valid owned unconsumed governance approval required");
    }
    this.records.set(approvalId, {
      ...record,
      consumed: true,
      consumedAt: new Date().toISOString(),
    });
  }

  /**
   * Retrieves a record by ID.
   */
  public getRecord(approvalId: string): GovernanceApprovalRecord | undefined {
    return this.records.get(approvalId);
  }

  /**
   * Lists recent records (newest first, no secrets).
   */
  public listRecords(limit = 50, tenantId?: string | null): GovernanceApprovalRecord[] {
    if (!tenantId) return [];
    return Array.from(this.records.values())
      .filter(record => record.tenantId === tenantId)
      .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt))
      .slice(0, limit);
  }

  /**
   * Returns pending records for admin review.
   */
  public listPending(tenantId?: string | null): GovernanceApprovalRecord[] {
    if (!tenantId) return [];
    return Array.from(this.records.values()).filter((r) => r.tenantId === tenantId && r.status === "PENDING" && !this.isExpired(r));
  }

  private isExpired(record: GovernanceApprovalRecord): boolean {
    if (!record.expiresAt) return false;
    return new Date(record.expiresAt).getTime() < Date.now();
  }

  private pruneOldest(): void {
    if (this.records.size <= MAX_RECORDS) return;
    const sorted = Array.from(this.records.entries()).sort(([, a], [, b]) =>
      a.requestedAt.localeCompare(b.requestedAt)
    );
    const excess = this.records.size - MAX_RECORDS;
    for (let i = 0; i < excess; i++) {
      this.records.delete(sorted[i][0]);
    }
  }

  /** Clears all records (for testing only). */
  public _clearForTest(): void {
    this.records.clear();
  }
}

export const governanceApprovalStore = GovernanceApprovalStore.getInstance();

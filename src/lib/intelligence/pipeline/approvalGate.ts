// src/lib/intelligence/pipeline/approvalGate.ts
import { randomUUID } from "crypto";
import type {
  LeadApprovalStatus,
  TelegramApprovalRequest,
} from "./pipelineTypes";
import { outreachRepository, hasCurrentHumanApproval } from "@/lib/outreach/outreachRepository";
import type { OutreachRecord } from "@/lib/outreach/types";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";
import { requireHumanApproval, type HumanApprovalAuthorization } from "./humanApprovalAuthorization";

export interface StoredApprovalRecord {
  approvalId: string;
  pipelineRunId: string;
  leadId: string;
  outreachId: string;
  businessName: string;
  recipientEmail: string;
  subject: string;
  bodyPreview: string;
  reviewedBody: string;
  previewUrl?: string;
  qualificationScore?: number;
  auditHighlights: string[];
  status: LeadApprovalStatus;
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  rejectedReason?: string;
  sentAt?: string;
  gmailMessageId?: string;
  tenantId?: string | null;
  userId?: string;
  persistenceBlocked?: boolean;
}

export class ApprovalGate {
  private static instance: ApprovalGate;
  private approvals: Map<string, StoredApprovalRecord> = new Map();
  private reviewing = new Set<string>();

  private constructor() {}

  public static getInstance(): ApprovalGate {
    if (!ApprovalGate.instance) {
      ApprovalGate.instance = new ApprovalGate();
    }
    return ApprovalGate.instance;
  }

  /**
   * Registers a newly generated outreach draft into the human approval queue.
   * State: DRAFT_CREATED -> PENDING_HUMAN_APPROVAL.
   */
  public async registerDraft(data: {
    pipelineRunId: string;
    leadId: string;
    outreachId: string;
    businessName: string;
    recipientEmail: string;
    subject: string;
    body: string;
    previewUrl?: string;
    qualificationScore?: number;
    auditHighlights?: string[];
    tenantId?: string | null;
    userId?: string;
  }): Promise<StoredApprovalRecord> {
    const tenant = data.userId || data.tenantId;
    if (!tenant) throw new Error("Trusted approval queue owner required");
    const draft = await outreachRepository.findOutreachById(data.outreachId, tenant);
    if (!draft || draft.leadId !== data.leadId || draft.message !== data.body ||
      (draft.subject || "") !== data.subject || (draft.business.email || "") !== data.recipientEmail) {
      throw new Error("Approval queue must reference the exact owned outreach draft");
    }
    if (draft.approvalRequest) {
      const existing = draft.approvalRequest;
      if (existing.pipelineRunId !== data.pipelineRunId || existing.leadId !== data.leadId || existing.tenantId !== tenant ||
        existing.reviewedBody !== data.body || existing.subject !== data.subject || existing.recipientEmail !== data.recipientEmail) {
        throw new Error("Approval queue identity/snapshot conflict");
      }
      const restored = this.restoreApproval(draft, tenant);
      if (!restored) throw new Error("Durable approval recovery failed");
      return restored;
    }
    const approvalId = `appr_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const record: StoredApprovalRecord = {
      approvalId,
      pipelineRunId: data.pipelineRunId,
      leadId: data.leadId,
      outreachId: data.outreachId,
      businessName: data.businessName,
      recipientEmail: data.recipientEmail,
      subject: data.subject,
      bodyPreview: data.body.slice(0, 300) + (data.body.length > 300 ? "..." : ""),
      reviewedBody: data.body,
      previewUrl: data.previewUrl,
      qualificationScore: data.qualificationScore,
      auditHighlights: data.auditHighlights || [],
      status: "PENDING_HUMAN_APPROVAL",
      requestedAt: now,
      tenantId: tenant,
      userId: tenant,
    };
    draft.approvalRequest = record;
    await outreachRepository.saveOutreachRecord(draft);
    this.approvals.set(data.outreachId, record);
    this.approvals.set(approvalId, record);

    emitAgentEvent({
      agent: "executive",
      event: "outreach.created",
      requestId: data.pipelineRunId,
      metadata: {
        approvalId,
        outreachId: data.outreachId,
        leadId: data.leadId,
        recipient: data.recipientEmail,
      },
    });

    return record;
  }

  /**
   * Explicitly approves an outreach draft by a human reviewer.
   * State: PENDING_HUMAN_APPROVAL -> APPROVED -> READY_TO_SEND.
   */
  public async approveDraft(
    outreachIdOrApprovalId: string,
    authorization: HumanApprovalAuthorization,
    notes?: string
  ): Promise<StoredApprovalRecord> {
    const record = this.approvals.get(outreachIdOrApprovalId);
    if (!record) {
      throw new Error(`Approval record for '${outreachIdOrApprovalId}' not found.`);
    }
    const approvedBy = requireHumanApproval(authorization, record.tenantId);
    if (this.reviewing.has(record.outreachId)) throw new Error("Approval review already in progress");

    if (record.status !== "PENDING_HUMAN_APPROVAL" && record.status !== "DRAFT_CREATED") {
      throw new Error(`Cannot approve draft in state '${record.status}'. Only pending drafts can be approved.`);
    }

    this.reviewing.add(record.outreachId);
    try {
      const persisted = await outreachRepository.updateOutreachStatus({
        outreachId: record.outreachId,
        status: "approved",
        userId: record.userId || record.tenantId || undefined,
        notes: `Approved by human reviewer: ${approvedBy}`,
        expectedReviewedMessage: record.reviewedBody,
        expectedReviewedSubject: record.subject,
        expectedReviewedRecipient: record.recipientEmail,
      }, authorization);
      if (!persisted || persisted.outreachId !== record.outreachId || persisted.status !== "approved" || persisted.userId !== (record.userId || record.tenantId)) throw new Error("Approval persistence failed");
      record.status = "READY_TO_SEND";
      record.reviewedAt = new Date().toISOString();
      record.reviewedBy = approvedBy;
      record.notes = notes;
      record.persistenceBlocked = false;
    } finally { this.reviewing.delete(record.outreachId); }

    emitAgentEvent({
      agent: "executive",
      event: "outreach.approved",
      requestId: record.pipelineRunId,
      metadata: {
        outreachId: record.outreachId,
        approvedBy,
        status: record.status,
      },
    });

    return record;
  }

  /**
   * Rejects an outreach draft.
   * State: PENDING_HUMAN_APPROVAL -> REJECTED.
   */
  public async rejectDraft(
    outreachIdOrApprovalId: string,
    authorization: HumanApprovalAuthorization,
    reason: string
  ): Promise<StoredApprovalRecord> {
    const record = this.approvals.get(outreachIdOrApprovalId);
    if (!record) {
      throw new Error(`Approval record for '${outreachIdOrApprovalId}' not found.`);
    }
    const rejectedBy = requireHumanApproval(authorization, record.tenantId);
    if (this.reviewing.has(record.outreachId)) throw new Error("Approval review already in progress");
    if (!["PENDING_HUMAN_APPROVAL", "DRAFT_CREATED", "READY_TO_SEND", "APPROVED"].includes(record.status)) throw new Error("Approval cannot be rejected in its current state");
    this.reviewing.add(record.outreachId);
    // A requested revocation must block dispatch even if its storage write fails.
    record.persistenceBlocked = true;
    try {
      const persisted = await outreachRepository.updateOutreachStatus({
        outreachId: record.outreachId,
        status: "rejected",
        userId: record.userId || record.tenantId || undefined,
        notes: `Rejected by ${rejectedBy}: ${reason}`,
      });
      if (!persisted || persisted.outreachId !== record.outreachId || persisted.status !== "rejected" || persisted.userId !== (record.userId || record.tenantId)) throw new Error("Rejection persistence failed");
      record.status = "REJECTED";
      record.reviewedAt = new Date().toISOString();
      record.reviewedBy = rejectedBy;
      record.rejectedReason = reason;
      record.persistenceBlocked = false;
    } finally { this.reviewing.delete(record.outreachId); }

    return record;
  }

  /**
   * Marks outreach draft as SENT after successful dispatch.
   * State: READY_TO_SEND -> SENT.
   */
  public markSent(
    outreachId: string,
    gmailMessageId: string
  ): StoredApprovalRecord {
    const record = this.approvals.get(outreachId);
    if (!record) {
      throw new Error(`Approval record for '${outreachId}' not found.`);
    }

    record.status = "SENT";
    record.sentAt = new Date().toISOString();
    record.gmailMessageId = gmailMessageId;
    return record;
  }

  /**
   * Verifies if a draft has received verified human approval and is ready to send.
   */
  public canSend(outreachId: string): boolean {
    const record = this.approvals.get(outreachId);
    return Boolean(record && !record.persistenceBlocked && !this.reviewing.has(record.outreachId) && (record.status === "READY_TO_SEND" || record.status === "APPROVED"));
  }

  /**
   * Returns a specific approval record by outreachId or approvalId.
   */
  public getApprovalRecord(id: string): StoredApprovalRecord | undefined {
    return this.approvals.get(id);
  }
  private restoreApproval(draft: OutreachRecord, tenant: string): StoredApprovalRecord | undefined {
    const original = draft.approvalRequest;
    if (!original) return undefined;
    if (draft.userId !== tenant || original.tenantId !== tenant || original.userId !== tenant ||
      original.outreachId !== draft.outreachId || original.leadId !== draft.leadId || !original.approvalId || !original.pipelineRunId) {
      throw new Error("Durable approval identity mismatch");
    }
    const snapshotMatches = original.reviewedBody === draft.message && original.subject === (draft.subject || "") &&
      original.recipientEmail === (draft.business.email || "");
    const record = { ...original, persistenceBlocked: false };
    if (!snapshotMatches) {
      record.status = "REJECTED"; record.persistenceBlocked = true;
      record.rejectedReason = "Reviewed snapshot changed; a new human review is required";
    } else if (["draft", "review"].includes(draft.status)) {
      record.status = "PENDING_HUMAN_APPROVAL";
    } else if (["approved", "queued", "sent"].includes(draft.status) && hasCurrentHumanApproval(draft)) {
      record.status = draft.status === "sent" ? "SENT" : "READY_TO_SEND";
      record.persistenceBlocked = draft.status === "queued";
      record.reviewedBy = draft.approvedBy; record.reviewedAt = draft.approvedAt;
      record.sentAt = draft.sentAt; record.gmailMessageId = draft.externalMessageId;
    } else {
      record.status = "REJECTED"; record.persistenceBlocked = true;
    }
    this.approvals.set(record.outreachId, record); this.approvals.set(record.approvalId, record);
    return record;
  }

  public async getStoredApprovalRecord(id: string, tenant: string): Promise<StoredApprovalRecord | undefined> {
    if (!tenant?.trim()) throw new Error("Trusted approval owner required");
    const draft = await outreachRepository.findOutreachById(id, tenant) || await outreachRepository.findOutreachByApprovalId(id, tenant);
    return draft ? this.restoreApproval(draft, tenant) : undefined;
  }

  public async getStoredPendingApprovals(tenant: string): Promise<StoredApprovalRecord[]> {
    if (!tenant?.trim()) throw new Error("Trusted approval owner required");
    const drafts = await outreachRepository.listOutreachRecords({ userId: tenant });
    return drafts.map(draft => this.restoreApproval(draft, tenant)).filter((record): record is StoredApprovalRecord =>
      !!record && record.status === "PENDING_HUMAN_APPROVAL" && !record.persistenceBlocked);
  }

  /**
   * Lists all pending approval requests.
   */
  public getPendingApprovals(tenantId?: string | null): StoredApprovalRecord[] {
    const unique = new Map<string, StoredApprovalRecord>();
    for (const record of this.approvals.values()) {
      if (record.status === "PENDING_HUMAN_APPROVAL") {
        if (tenantId && record.tenantId !== tenantId) {
          continue;
        }
        unique.set(record.outreachId, record);
      }
    }
    return Array.from(unique.values());
  }

  /**
   * Formats a structured Telegram approval request object for future Telegram interface.
   */
  public formatTelegramApprovalRequest(
    record: StoredApprovalRecord
  ): TelegramApprovalRequest {
    return {
      approvalId: record.approvalId,
      pipelineRunId: record.pipelineRunId,
      leadId: record.leadId,
      businessName: record.businessName,
      recipientEmail: record.recipientEmail,
      subject: record.subject,
      bodyPreview: record.bodyPreview,
      previewUrl: record.previewUrl,
      qualificationScore: record.qualificationScore,
      auditHighlights: record.auditHighlights,
      status: record.status,
      actions: {
        approveCallbackData: `approve:${record.approvalId}`,
        rejectCallbackData: `reject:${record.approvalId}`,
        previewUrl: record.previewUrl,
      },
      createdAt: record.requestedAt,
    };
  }

  /**
   * Clears the in-memory approval cache (used for isolated test suites).
   */
  public clear(): void {
    this.approvals.clear();
    this.reviewing.clear();
  }
}

export const approvalGate = ApprovalGate.getInstance();

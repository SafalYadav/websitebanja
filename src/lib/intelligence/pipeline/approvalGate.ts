// src/lib/intelligence/pipeline/approvalGate.ts
import { randomUUID } from "crypto";
import type {
  LeadApprovalStatus,
  TelegramApprovalRequest,
} from "./pipelineTypes";
import { outreachRepository } from "@/lib/outreach/outreachRepository";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

export interface StoredApprovalRecord {
  approvalId: string;
  pipelineRunId: string;
  leadId: string;
  outreachId: string;
  businessName: string;
  recipientEmail: string;
  subject: string;
  bodyPreview: string;
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
}

export class ApprovalGate {
  private static instance: ApprovalGate;
  private approvals: Map<string, StoredApprovalRecord> = new Map();

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
      previewUrl: data.previewUrl,
      qualificationScore: data.qualificationScore,
      auditHighlights: data.auditHighlights || [],
      status: "PENDING_HUMAN_APPROVAL",
      requestedAt: now,
      tenantId: data.tenantId,
      userId: data.userId,
    };

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
    approvedBy: string,
    notes?: string
  ): Promise<StoredApprovalRecord> {
    if (!approvedBy || approvedBy.trim().toLowerCase() === "system" || approvedBy.trim().toLowerCase() === "ai") {
      throw new Error("Safety Invariant Violation: External email approval requires explicit human clearance. System/AI cannot self-approve.");
    }

    const record = this.approvals.get(outreachIdOrApprovalId);
    if (!record) {
      throw new Error(`Approval record for '${outreachIdOrApprovalId}' not found.`);
    }

    if (record.status !== "PENDING_HUMAN_APPROVAL" && record.status !== "DRAFT_CREATED") {
      throw new Error(`Cannot approve draft in state '${record.status}'. Only pending drafts can be approved.`);
    }

    const now = new Date().toISOString();
    record.status = "READY_TO_SEND";
    record.reviewedAt = now;
    record.reviewedBy = approvedBy;
    record.notes = notes;

    // Update in outreach repository so pre-flight checks pass
    try {
      await outreachRepository.updateOutreachStatus({
        outreachId: record.outreachId,
        status: "approved",
        userId: record.userId || record.tenantId || undefined,
        notes: `Approved by human reviewer: ${approvedBy}`,
      });
    } catch {
      // Safe fallback for test environments without DB
    }

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
    rejectedBy: string,
    reason: string
  ): Promise<StoredApprovalRecord> {
    const record = this.approvals.get(outreachIdOrApprovalId);
    if (!record) {
      throw new Error(`Approval record for '${outreachIdOrApprovalId}' not found.`);
    }

    const now = new Date().toISOString();
    record.status = "REJECTED";
    record.reviewedAt = now;
    record.reviewedBy = rejectedBy;
    record.rejectedReason = reason;

    try {
      await outreachRepository.updateOutreachStatus({
        outreachId: record.outreachId,
        status: "rejected",
        userId: record.tenantId || undefined,
        notes: `Rejected by ${rejectedBy}: ${reason}`,
      });
    } catch {
      // Safe fallback
    }

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
    return record?.status === "READY_TO_SEND" || record?.status === "APPROVED";
  }

  /**
   * Returns a specific approval record by outreachId or approvalId.
   */
  public getApprovalRecord(id: string): StoredApprovalRecord | undefined {
    return this.approvals.get(id);
  }

  /**
   * Lists all pending approval requests.
   */
  public getPendingApprovals(tenantId?: string | null): StoredApprovalRecord[] {
    const unique = new Map<string, StoredApprovalRecord>();
    for (const record of this.approvals.values()) {
      if (record.status === "PENDING_HUMAN_APPROVAL") {
        if (tenantId && record.tenantId && record.tenantId !== tenantId) {
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
  }
}

export const approvalGate = ApprovalGate.getInstance();

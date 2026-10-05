import { getPool } from "@/lib/db/queries";
import { createHash, randomUUID } from "node:crypto";
import { sanitizeErrorOutput } from "@/lib/ai/router/modelConfig";
import { requireHumanApproval, type HumanApprovalAuthorization } from "@/lib/intelligence/pipeline/humanApprovalAuthorization";
import type { OutreachRecord, ListOutreachFilter, UpdateOutreachStatusRequest, OutreachChannel } from "./types";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

interface StoredRow { record_data: OutreachRecord; revision: number }
interface RecordVersion { revision: number; owner: string; id: string; lead: string; preview: string; channel: string; status: string; content: string; approval: string; queue?: string; history: string; dispatch?: string }
const versions = new WeakMap<OutreachRecord, RecordVersion>();
function owner(value?: string): string {
  if (!value?.trim()) throw new Error("Trusted outreach owner required");
  return value;
}
function content(record: OutreachRecord): string {
  return JSON.stringify({ business: record.business, subject: record.subject, message: record.message,
    previewUrl: record.previewUrl, personalization: record.personalization });
}
function remember(record: OutreachRecord, revision: number): void {
  versions.set(record, { revision, owner: owner(record.userId), id: record.outreachId, lead: record.leadId,
    preview: record.previewId, channel: record.channel, status: record.status, content: content(record), approval: approval(record), queue: record.approvalRequest ? JSON.stringify(record.approvalRequest) : undefined,
    history: JSON.stringify(record.approvalHistory || []), dispatch: record.dispatchClaimedAt });
}
function approval(record: OutreachRecord): string {
  return JSON.stringify([record.approvedBy, record.approvedAt, record.approvedContentHash]);
}
function contentHash(record: OutreachRecord): string {
  return createHash("sha256").update(content(record)).digest("hex");
}
export function hasCurrentHumanApproval(record: OutreachRecord): boolean {
  return !!record.userId && record.approvedBy === record.userId && !!record.approvedAt &&
    record.approvedContentHash === contentHash(record);
}
function hydrate(row: StoredRow, tenant: string): OutreachRecord {
  if (!row.record_data || row.record_data.userId !== tenant || !Number.isSafeInteger(row.revision) || row.revision < 0) {
    throw new Error("Invalid durable outreach scope/version");
  }
  remember(row.record_data, row.revision);
  return row.record_data;
}

/** Tenant-scoped durable outbox. No filesystem/cache fallback and no blind upserts. */
export class OutreachRepository {
  async saveOutreachRecord(record: OutreachRecord, authorization?: HumanApprovalAuthorization): Promise<OutreachRecord> {
    const tenant = owner(record.userId);
    if (!record.outreachId?.trim() || !record.leadId?.trim() || !record.previewId?.trim() || !record.message?.trim() || !record.business?.name?.trim()) {
      throw new Error("Complete outreach identity and content required");
    }
    const previous = versions.get(record);
    const persisted = { ...record, updatedAt: new Date().toISOString() };
    if (previous) {
      if (previous.owner !== tenant || previous.id !== record.outreachId || previous.lead !== record.leadId ||
        previous.preview !== record.previewId || previous.channel !== record.channel) throw new Error("Outreach identity is immutable");
      if (previous.queue && previous.queue !== JSON.stringify(record.approvalRequest)) throw new Error("Registered approval snapshot is immutable");
      if (previous.history !== JSON.stringify(record.approvalHistory || [])) throw new Error("Approval review history is immutable");
      if (previous.dispatch !== record.dispatchClaimedAt) throw new Error("Dispatch claim provenance is immutable");
      if (previous.dispatch && ["draft", "review", "approved"].includes(record.status)) throw new Error("Claimed dispatch requires delivery reconciliation, not a new approval");
      if (["sent", "replied", "simulated_sent"].includes(previous.status) && record.status !== previous.status &&
        !(previous.status === "sent" && record.status === "replied")) throw new Error("Delivered outreach cannot be reset for sending again");
      if (!previous.queue && record.approvalRequest) {
        const queue = record.approvalRequest;
        if (queue.tenantId !== tenant || queue.userId !== tenant || queue.outreachId !== record.outreachId || queue.leadId !== record.leadId ||
          queue.reviewedBody !== record.message || queue.subject !== (record.subject || "") || queue.recipientEmail !== (record.business.email || "") ||
          !queue.approvalId?.trim() || !queue.pipelineRunId?.trim() || queue.status !== "PENDING_HUMAN_APPROVAL" ||
          queue.reviewedBy || queue.reviewedAt || queue.sentAt || queue.gmailMessageId) throw new Error("Invalid approval queue snapshot");
      }
      const changed = previous.content !== content(record);
      if (record.status === "approved" && (previous.status !== "approved" || changed || previous.approval !== approval(record))) {
        persisted.approvedBy = requireHumanApproval(authorization, tenant);
        persisted.approvedAt = new Date().toISOString();
        persisted.approvedContentHash = contentHash(record);
        const original = record.approvalRequest;
        if (original && (original.reviewedBody !== record.message || original.subject !== (record.subject || "") ||
          original.recipientEmail !== (record.business.email || ""))) {
          if (!["draft", "review"].includes(previous.status)) throw new Error("Revised approval requires a saved draft under review");
          persisted.approvalHistory = [...(record.approvalHistory || []), { ...original }];
          persisted.approvalRequest = { ...original, approvalId: `appr_${randomUUID()}`, requestedAt: new Date().toISOString(),
            reviewedBody: record.message, bodyPreview: record.message.slice(0, 300) + (record.message.length > 300 ? "..." : ""),
            subject: record.subject || "", recipientEmail: record.business.email || "", status: "PENDING_HUMAN_APPROVAL" };
        }
      } else if (previous.approval !== approval(record)) {
        throw new Error("Outreach approval provenance is immutable without a new human review");
      }
      if (["sent", "replied", "simulated_sent"].includes(previous.status) && changed) throw new Error("Delivered outreach content is immutable");
      if (["approved", "queued"].includes(previous.status) && changed && !["review", "rejected", "cancelled"].includes(record.status)) {
        throw new Error("Changed approved outreach requires revocation and a new review");
      }
      if (record.status === "sent" && !["approved", "queued", "sent"].includes(previous.status)) {
        throw new Error("Unapproved outreach cannot be recorded as sent");
      }
      if (record.status === "queued" && !["approved", "queued"].includes(previous.status)) throw new Error("Unapproved outreach cannot be queued");
      if (record.status === "queued" && !persisted.dispatchClaimedAt) persisted.dispatchClaimedAt = new Date().toISOString();
      if (record.status === "replied" && !["sent", "replied"].includes(previous.status)) throw new Error("Unsent outreach cannot be recorded as replied");
      if (["approved", "queued", "sent"].includes(record.status) &&
        (!persisted.approvedBy || !persisted.approvedAt || persisted.approvedContentHash !== contentHash(record))) {
        throw new Error("Outreach approval does not match the exact reviewed content; human review required");
      }
      if (["draft", "review", "rejected", "cancelled"].includes(record.status)) {
        delete persisted.approvedBy; delete persisted.approvedAt; delete persisted.approvedContentHash;
      }
      const result = await getPool().query<StoredRow>("UPDATE public.governed_outreach_records SET record_data=$3::jsonb,status=$4,revision=revision+1,updated_at=NOW() " +
        "WHERE outreach_id=$1 AND user_id=$2 AND revision=$5 RETURNING record_data,revision",
      [record.outreachId, tenant, sanitizeErrorOutput(JSON.stringify(persisted)), record.status, previous.revision]);
      if (result.rowCount !== 1 || result.rows[0]?.revision !== previous.revision + 1) throw new Error("Outreach checkpoint conflict; reload before retrying");
      const saved = hydrate(result.rows[0], tenant);
      Object.assign(record, saved);
      remember(record, result.rows[0].revision);
      return saved;
    }
    if (!["draft", "review"].includes(record.status)) throw new Error("New outreach must start as an unapproved draft");
    if (record.approvalRequest) throw new Error("Approval registration requires an existing owned outreach draft");
    if (record.approvalHistory?.length) throw new Error("New outreach cannot carry forged review history");
    if (record.dispatchClaimedAt) throw new Error("New outreach cannot carry forged dispatch provenance");
    if (record.approvedBy || record.approvedAt || record.approvedContentHash) throw new Error("New outreach cannot carry forged approval provenance");
    const result = await getPool().query<StoredRow>("INSERT INTO public.governed_outreach_records " +
      "(outreach_id,user_id,lead_id,preview_id,channel,status,record_data) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) " +
      "ON CONFLICT DO NOTHING RETURNING record_data,revision",
    [record.outreachId, tenant, record.leadId, record.previewId, record.channel, record.status, sanitizeErrorOutput(JSON.stringify(persisted))]);
    if (result.rowCount === 1) {
      const saved = hydrate(result.rows[0], tenant);
      Object.assign(record, saved); remember(record, result.rows[0].revision);
      return saved;
    }
    const existing = await this.findExistingDraft(record.leadId, record.channel, record.previewId, tenant);
    if (!existing) throw new Error("Outreach identity conflict; creation denied");
    return existing;
  }

  async findExistingDraft(leadId: string, channel: OutreachChannel, previewId: string, userId?: string): Promise<OutreachRecord | null> {
    const tenant = owner(userId);
    const result = await getPool().query<StoredRow>("SELECT record_data,revision FROM public.governed_outreach_records " +
      "WHERE user_id=$1 AND lead_id=$2 AND channel=$3 AND preview_id=$4 AND status NOT IN ('rejected','cancelled') ORDER BY created_at DESC LIMIT 1",
    [tenant, leadId, channel, previewId]);
    return result.rows[0] ? hydrate(result.rows[0], tenant) : null;
  }

  async findOutreachById(outreachId: string, userId?: string): Promise<OutreachRecord | null> {
    const tenant = owner(userId);
    const result = await getPool().query<StoredRow>("SELECT record_data,revision FROM public.governed_outreach_records WHERE outreach_id=$1 AND user_id=$2", [outreachId, tenant]);
    if (!result.rows[0]) return null;
    const record = hydrate(result.rows[0], tenant);
    if (record.outreachId !== outreachId) throw new Error("Durable outreach identity mismatch");
    return record;
  }

  async findOutreachByLeadId(leadId: string, userId?: string): Promise<OutreachRecord[]> {
    return this.listOutreachRecords({ leadId, userId });
  }
  async findOutreachByApprovalId(approvalId: string, userId: string): Promise<OutreachRecord | null> {
    const tenant = owner(userId);
    const result = await getPool().query<StoredRow>("SELECT record_data,revision FROM public.governed_outreach_records " +
      "WHERE user_id=$1 AND record_data->'approvalRequest'->>'approvalId'=$2", [tenant, approvalId]);
    if (result.rows.length > 1) throw new Error("Ambiguous durable approval identity");
    return result.rows[0] ? hydrate(result.rows[0], tenant) : null;
  }

  async listOutreachRecords(filter: ListOutreachFilter = {}): Promise<OutreachRecord[]> {
    const tenant = owner(filter.userId);
    const result = await getPool().query<StoredRow>("SELECT record_data,revision FROM public.governed_outreach_records WHERE user_id=$1 " +
      "AND ($2::text IS NULL OR lead_id=$2) AND ($3::text IS NULL OR channel=$3) AND ($4::text IS NULL OR status=$4) " +
      "AND ($5::text IS NULL OR POSITION(lower($5) IN lower(record_data::text))>0) ORDER BY created_at DESC,outreach_id DESC",
    [tenant, filter.leadId || null, filter.channel || null, filter.status || null, filter.search || null]);
    return result.rows.map(row => hydrate(row, tenant));
  }

  async updateOutreachStatus(request: UpdateOutreachStatusRequest, authorization?: HumanApprovalAuthorization): Promise<OutreachRecord | null> {
    const tenant = owner(request.userId);
    const record = await this.findOutreachById(request.outreachId, tenant);
    if (!record) return null;
    if (request.status === "approved" && !["draft", "review", "approved"].includes(record.status)) {
      throw new Error("Current outreach state does not permit approval; a fresh review is required");
    }
    if (request.status === "approved" && (
      (request.editedMessage !== undefined && request.editedMessage !== record.message) ||
      (request.editedSubject !== undefined && request.editedSubject !== (record.subject || "")) ||
      (request.recipientEmail !== undefined && request.recipientEmail !== (record.business.email || "")))) {
      throw new Error("Edit outreach separately and review the saved content before approval");
    }
    if (request.status === "approved" && (
      (request.expectedReviewedMessage !== undefined && record.message !== request.expectedReviewedMessage) ||
      (request.expectedReviewedSubject !== undefined && (record.subject || "") !== request.expectedReviewedSubject) ||
      (request.expectedReviewedRecipient !== undefined && (record.business.email || "") !== request.expectedReviewedRecipient))) {
      throw new Error("Reviewed outreach snapshot changed; reload and review before approval");
    }
    if (request.status === "approved") record.approvedBy = requireHumanApproval(authorization, tenant);
    record.status = request.status;
    if (request.editedSubject !== undefined) record.subject = request.editedSubject;
    if (request.editedMessage !== undefined) record.message = request.editedMessage;
    if (request.recipientEmail !== undefined) record.business.email = request.recipientEmail;
    if (request.notes !== undefined) record.notes = request.notes;
    const now = new Date().toISOString();
    if (request.status === "review") record.reviewedAt = now;
    if (request.status === "approved") record.approvedAt = now;
    if (request.status === "rejected") record.rejectedAt = now;
    const saved = await this.saveOutreachRecord(record, authorization);
    if (["review", "approved", "rejected"].includes(request.status)) emitAgentEvent({
      event: request.status === "review" ? "outreach.reviewed" : request.status === "approved" ? "outreach.approved" : "outreach.rejected",
      agent: request.status === "approved" ? "human_review" : "outreach_repository",
      metadata: { outreachId: saved.outreachId, leadId: saved.leadId, approvedBy: saved.approvedBy },
    });
    return saved;
  }

  async deleteOutreachRecord(outreachId: string, userId?: string): Promise<boolean> {
    const result = await getPool().query("DELETE FROM public.governed_outreach_records WHERE outreach_id=$1 AND user_id=$2", [outreachId, owner(userId)]);
    return result.rowCount === 1;
  }
}
export const outreachRepository = new OutreachRepository();

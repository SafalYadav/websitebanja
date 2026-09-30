// src/lib/outreach/outreachRepository.ts
/**
 * WebsiteBanja Outreach Repository & Local Outbox
 * Phase: Phase 11 (Personalized Outreach Foundation)
 *
 * Persists outreach records to local scratch storage:
 *   - scratch/outreach/outreach.json (Manifest / Index)
 *   - scratch/outreach/{outreachId}.json (Full records)
 *
 * Enforces deduplication key: leadId + channel + previewId
 * Enforces tenant isolation via optional userId.
 */

import fs from "fs";
import path from "path";
import type {
  OutreachRecord,
  ListOutreachFilter,
  UpdateOutreachStatusRequest,
  OutreachChannel,
} from "./types";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

const OUTREACH_DIR = path.resolve(process.cwd(), "scratch/outreach");
const MANIFEST_PATH = path.join(OUTREACH_DIR, "outreach.json");

function ensureOutreachStorage(): void {
  if (!fs.existsSync(OUTREACH_DIR)) {
    fs.mkdirSync(OUTREACH_DIR, { recursive: true });
  }
  if (!fs.existsSync(MANIFEST_PATH)) {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

function readManifest(): OutreachRecord[] {
  ensureOutreachStorage();
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutreachRecord[]) : [];
  } catch (err) {
    console.error("[OutreachRepository] Failed to read manifest, resetting:", err);
    return [];
  }
}

function writeManifest(records: OutreachRecord[]): void {
  ensureOutreachStorage();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(records, null, 2), "utf-8");
}

export class OutreachRepository {
  /**
   * Persists or updates an OutreachRecord
   */
  async saveOutreachRecord(record: OutreachRecord): Promise<OutreachRecord> {
    ensureOutreachStorage();
    const manifest = readManifest();

    const existingIndex = manifest.findIndex((r) => r.outreachId === record.outreachId);
    if (existingIndex >= 0) {
      manifest[existingIndex] = {
        ...record,
        updatedAt: new Date().toISOString(),
      };
    } else {
      manifest.unshift(record);
    }

    writeManifest(manifest);

    // Save individual JSON
    const recordFile = path.join(OUTREACH_DIR, `${record.outreachId}.json`);
    fs.writeFileSync(recordFile, JSON.stringify(record, null, 2), "utf-8");

    return record;
  }

  /**
   * Finds an active outreach record by leadId + channel + previewId
   * Excludes rejected or cancelled to allow re-drafting if previously rejected
   */
  async findExistingDraft(
    leadId: string,
    channel: OutreachChannel,
    previewId: string,
    userId?: string
  ): Promise<OutreachRecord | null> {
    const manifest = readManifest();
    const found = manifest.find((r) => {
      const matchIdentity =
        r.leadId === leadId && r.channel === channel && r.previewId === previewId;
      const matchUser = userId ? r.userId === userId : true;
      const isStillActive = !["rejected", "cancelled"].includes(r.status);
      return matchIdentity && matchUser && isStillActive;
    });

    return found || null;
  }

  /**
   * Finds an outreach record by ID
   */
  async findOutreachById(outreachId: string, userId?: string): Promise<OutreachRecord | null> {
    ensureOutreachStorage();
    const manifest = readManifest();
    let record = manifest.find((r) => r.outreachId === outreachId);

    if (!record) {
      const recordFile = path.join(OUTREACH_DIR, `${outreachId}.json`);
      if (fs.existsSync(recordFile)) {
        try {
          record = JSON.parse(fs.readFileSync(recordFile, "utf-8"));
        } catch {
          // ignore error
        }
      }
    }

    if (!record) return null;
    if (userId && record.userId && record.userId !== userId) {
      return null; // Tenant isolation
    }

    return record;
  }

  /**
   * Finds all outreach records for a specific lead
   */
  async findOutreachByLeadId(leadId: string, userId?: string): Promise<OutreachRecord[]> {
    const manifest = readManifest();
    return manifest.filter((r) => {
      const matchLead = r.leadId === leadId;
      const matchUser = userId ? r.userId === userId : true;
      return matchLead && matchUser;
    });
  }

  /**
   * Lists outreach records with optional filtering
   */
  async listOutreachRecords(filter?: ListOutreachFilter): Promise<OutreachRecord[]> {
    let records = readManifest();

    if (filter?.userId) {
      records = records.filter((r) => !r.userId || r.userId === filter.userId);
    }

    if (filter?.leadId) {
      records = records.filter((r) => r.leadId === filter.leadId);
    }

    if (filter?.channel) {
      records = records.filter((r) => r.channel === filter.channel);
    }

    if (filter?.status) {
      records = records.filter((r) => r.status === filter.status);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      records = records.filter(
        (r) =>
          r.business.name.toLowerCase().includes(q) ||
          r.business.industry.toLowerCase().includes(q) ||
          r.business.location.toLowerCase().includes(q) ||
          (r.subject && r.subject.toLowerCase().includes(q)) ||
          r.message.toLowerCase().includes(q)
      );
    }

    return records;
  }

  /**
   * Updates the workflow status of an outreach record (review, approve, reject, edit)
   */
  async updateOutreachStatus(
    request: UpdateOutreachStatusRequest
  ): Promise<OutreachRecord | null> {
    const record = await this.findOutreachById(request.outreachId, request.userId);
    if (!record) return null;

    const now = new Date().toISOString();
    record.status = request.status;
    record.updatedAt = now;

    if (request.editedSubject !== undefined) {
      record.subject = request.editedSubject;
    }
    if (request.editedMessage !== undefined) {
      record.message = request.editedMessage;
    }
    if (request.recipientEmail !== undefined) {
      record.business.email = request.recipientEmail;
    }
    if (request.notes !== undefined) {
      record.notes = request.notes;
    }

    if (request.status === "review") {
      record.reviewedAt = now;
      emitAgentEvent({
        event: "outreach.reviewed",
        agent: "mitra",
        metadata: { outreachId: record.outreachId, leadId: record.leadId },
      });
    } else if (request.status === "approved") {
      record.approvedAt = now;
      emitAgentEvent({
        event: "outreach.approved",
        agent: "mitra",
        metadata: { outreachId: record.outreachId, leadId: record.leadId },
      });
    } else if (request.status === "rejected") {
      record.rejectedAt = now;
      emitAgentEvent({
        event: "outreach.rejected",
        agent: "mitra",
        metadata: { outreachId: record.outreachId, leadId: record.leadId, notes: request.notes },
      });
    }

    await this.saveOutreachRecord(record);
    return record;
  }

  /**
   * Deletes an outreach record (useful for testing and reset)
   */
  async deleteOutreachRecord(outreachId: string, userId?: string): Promise<boolean> {
    ensureOutreachStorage();
    const manifest = readManifest();
    const index = manifest.findIndex((r) => r.outreachId === outreachId);
    if (index === -1) return false;

    if (userId && manifest[index].userId && manifest[index].userId !== userId) {
      return false; // Tenant isolation
    }

    manifest.splice(index, 1);
    writeManifest(manifest);

    const recordFile = path.join(OUTREACH_DIR, `${outreachId}.json`);
    if (fs.existsSync(recordFile)) {
      try {
        fs.unlinkSync(recordFile);
      } catch (e) {
        console.warn(`[OutreachRepository] Could not unlink ${recordFile}:`, e);
      }
    }

    return true;
  }
}

export const outreachRepository = new OutreachRepository();

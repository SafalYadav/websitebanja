// src/lib/outreach/types.ts
/**
 * WebsiteBanja Personalized Outreach Foundation — Types & Contracts
 * Phase: Phase 11 (Personalized Outreach Foundation)
 */

export type OutreachChannel = "email" | "whatsapp" | "instagram" | "sms";

export type OutreachStatus =
  | "draft"
  | "review"
  | "approved"
  | "queued"
  | "sent"
  | "simulated_sent"
  | "rejected"
  | "cancelled"
  | "replied"
  | "failed";

export interface OutreachBusinessInfo {
  name: string;
  industry: string;
  location: string;
  email?: string;
  phone?: string;
  website?: string;
}

export interface OutreachPersonalizationData {
  websiteProblems: string[];
  improvements: string[];
  businessSpecificPoints: string[];
}

export interface OutreachValidationResult {
  isValid: boolean;
  issues: string[];
  passedChecks: string[];
  checkedAt: string;
}

export interface SimulationReceipt {
  simulatedAt: string;
  provider: "local_simulation";
  recipient: string;
  channel: OutreachChannel;
  payloadPreview: string;
}

export interface OutreachRecord {
  outreachId: string;
  leadId: string;
  auditId: string;
  previewId: string;

  business: OutreachBusinessInfo;

  channel: OutreachChannel;
  status: OutreachStatus;

  subject?: string; // Primarily for email
  message: string;
  previewUrl: string;

  personalization: OutreachPersonalizationData;
  validation: OutreachValidationResult;
  simulationReceipt?: SimulationReceipt;

  notes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  simulatedAt?: string;
  sentAt?: string;
  externalMessageId?: string;
  threadId?: string;

  userId?: string;
  handoffPhase: "phase12_reply_intelligence_crm";
}

export interface DraftOutreachRequest {
  leadId: string;
  channel?: OutreachChannel;
  auditId?: string;
  previewId?: string;
  userId?: string;
  regenerate?: boolean;
  recipientEmail?: string;

  // Optional overrides for offline unit testing
  overrideLead?: unknown;
  overrideAudit?: unknown;
  overridePreview?: unknown;
}

export interface DraftOutreachResponse {
  success: boolean;
  outreach?: OutreachRecord;
  reusedExisting?: boolean;
  handoffPhase: "phase12_reply_intelligence_crm";
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface UpdateOutreachStatusRequest {
  outreachId: string;
  status: OutreachStatus;
  editedSubject?: string;
  editedMessage?: string;
  recipientEmail?: string;
  notes?: string;
  userId?: string;
}

export interface UpdateOutreachStatusResponse {
  success: boolean;
  outreach?: OutreachRecord;
  handoffPhase?: "phase12_reply_intelligence_crm";
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ListOutreachFilter {
  leadId?: string;
  channel?: OutreachChannel;
  status?: OutreachStatus;
  search?: string;
  userId?: string;
}

export interface Phase12HandoffContract {
  leadId: string;
  previewId: string;
  outreachId: string;
  status: OutreachStatus;
  channel: OutreachChannel;
  outreach: {
    subject?: string;
    message: string;
    previewUrl: string;
  };
  handoffPhase: "phase12_reply_intelligence_crm";
}

// src/lib/crm/types.ts
/**
 * WebsiteBanja Reply Intelligence & CRM Foundation — Types & Contracts
 * Phase: Phase 12 (Reply Intelligence + CRM Foundation)
 *
 * Implements canonical CRM models:
 *   - CRMLeadStatus: 15-state lifecycle model
 *   - CRMMessage: Normalized inbound/outbound communication
 *   - CRMConversation: Multi-channel conversation tracking
 *   - ReplyAnalysis: 14 intent categories, sentiment, urgency, confidence
 *   - NextAction: Deterministic human recommendation vs automated action
 *   - CRMEvent: Chronological timeline activities
 *   - Phase 13 Handoff Contract
 */

import type { OutreachChannel, OutreachRecord } from "@/lib/outreach/types";
import type { BusinessLead } from "@/lib/discovery/types";

// =============================================================================
// 1. LEAD LIFECYCLE STATES (15 States)
// =============================================================================

export type CRMLeadStatus =
  | "DISCOVERED"
  | "QUALIFIED"
  | "AUDITED"
  | "PREVIEW_READY"
  | "OUTREACH_DRAFTED"
  | "OUTREACH_APPROVED"
  | "OUTREACH_SENT"
  | "REPLIED"
  | "INTERESTED"
  | "NOT_INTERESTED"
  | "FOLLOW_UP"
  | "MEETING_REQUESTED"
  | "WON"
  | "LOST"
  | "DO_NOT_CONTACT";

export interface StatusTransitionRecord {
  previousStatus: CRMLeadStatus;
  newStatus: CRMLeadStatus;
  reason: string;
  timestamp: string; // ISO 8601
  source: "system" | "admin" | "ai_classification" | "simulation" | "n8n";
  messageId?: string;
  conversationId?: string;
}

// =============================================================================
// 2. CONVERSATION MODEL
// =============================================================================

export type ConversationStatus =
  | "OPEN"
  | "WAITING_FOR_REPLY"
  | "REPLIED"
  | "FOLLOW_UP_DUE"
  | "CLOSED";

export interface CRMConversation {
  id: string; // conv_{leadId}_{channel}
  leadId: string;
  channel: OutreachChannel;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  messageCount: number;
  unreadCount: number;
  currentIntent?: ReplyIntent;
  currentSentiment?: ReplySentiment;
  nextAction?: string;
  owner?: string;
  metadata?: Record<string, unknown>;
  userId?: string; // Tenant isolation
}

// =============================================================================
// 3. MESSAGE MODEL
// =============================================================================

export type MessageDirection = "inbound" | "outbound";

export interface CRMMessage {
  id: string; // msg_{timestamp}_{random}
  leadId: string;
  conversationId: string;
  channel: OutreachChannel;
  direction: MessageDirection;
  messageText: string;
  timestamp: string; // ISO 8601
  source: "simulation" | "admin" | "outreach_handoff" | "n8n" | "system";
  externalMessageId?: string;
  metadata?: {
    previewUrl?: string;
    outreachId?: string;
    subject?: string;
    senderName?: string;
    senderContact?: string;
    rawPayload?: Record<string, unknown>;
  };
}

// =============================================================================
// 4. REPLY INTELLIGENCE MODEL
// =============================================================================

export type ReplyIntent =
  | "INTERESTED"
  | "ASKING_PRICE"
  | "ASKING_FOR_DETAILS"
  | "ASKING_FOR_DEMO"
  | "ASKING_FOR_CALL"
  | "POSITIVE_GENERAL"
  | "NEEDS_TIME"
  | "NOT_INTERESTED"
  | "ALREADY_HAS_WEBSITE"
  | "WRONG_CONTACT"
  | "DO_NOT_CONTACT"
  | "CONFUSED"
  | "UNCLEAR"
  | "OTHER";

export type ReplySentiment = "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "MIXED" | "UNKNOWN";

export type ReplyUrgency = "LOW" | "MEDIUM" | "HIGH";

export interface ReplyAnalysis {
  intent: ReplyIntent;
  sentiment: ReplySentiment;
  urgency: ReplyUrgency;
  confidence: number; // 0.0 to 1.0
  summary: string;
  keySignals: string[];
  recommendedAction: string;
  requiresHumanReview: boolean;
  analyzedAt: string;
  provider: "ai_model" | "deterministic_fallback" | "rule_engine";
}

// =============================================================================
// 5. NEXT ACTION MODEL
// =============================================================================

export type RecommendedActionType =
  | "HUMAN_REPLY_REQUIRED"
  | "SEND_DEMO_LINK"
  | "SCHEDULE_CALL"
  | "FOLLOW_UP_LATER"
  | "CLOSE_LEAD"
  | "DO_NOT_CONTACT"
  | "HUMAN_REVIEW"
  | "AWAIT_CLIENT";

export interface NextAction {
  recommendedAction: RecommendedActionType;
  automatedAction: null; // Strictly null in Phase 12 - NO automated outbound execution
  reason: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  followUpDueDays?: number;
  suggestedFollowUpDate?: string;
  notes?: string;
}

// =============================================================================
// 6. CRM TIMELINE & EVENT MODEL
// =============================================================================

export type CRMEventType =
  | "LEAD_CREATED"
  | "LEAD_QUALIFIED"
  | "AUDIT_COMPLETED"
  | "PREVIEW_CREATED"
  | "OUTREACH_DRAFTED"
  | "OUTREACH_APPROVED"
  | "OUTREACH_SIMULATED"
  | "MESSAGE_RECEIVED"
  | "REPLY_ANALYZED"
  | "STATUS_CHANGED"
  | "ACTION_RECOMMENDED"
  | "FOLLOW_UP_CREATED";

export interface CRMEvent {
  id: string; // evt_{timestamp}_{random}
  leadId: string;
  type: CRMEventType;
  timestamp: string; // ISO 8601
  actor: "system" | "admin" | "simulation" | "ai_classifier" | "mitra";
  description: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// 7. COMPREHENSIVE LEAD CRM STATE
// =============================================================================

export interface LeadCRMState {
  leadId: string;
  businessName: string;
  industry: string;
  city?: string;
  email?: string;
  phone?: string;
  website?: string;
  status: CRMLeadStatus;
  statusHistory: StatusTransitionRecord[];
  activeConversation?: CRMConversation;
  messages: CRMMessage[];
  latestAnalysis?: ReplyAnalysis;
  nextAction?: NextAction;
  timeline: CRMEvent[];
  updatedAt: string;
  userId?: string;
}

// =============================================================================
// 8. API REQUEST & RESPONSE CONTRACTS
// =============================================================================

export interface SimulateReplyRequest {
  leadId: string;
  channel?: OutreachChannel;
  messageText: string;
  senderName?: string;
  senderContact?: string;
  userId?: string;
}

export interface SimulateReplyResponse {
  success: boolean;
  message?: CRMMessage;
  conversation?: CRMConversation;
  analysis?: ReplyAnalysis;
  nextAction?: NextAction;
  leadStatus?: CRMLeadStatus;
  event?: CRMEvent;
  handoffPhase: "phase13_autonomous_lead_pipeline";
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ListCRMFilter {
  status?: CRMLeadStatus;
  channel?: OutreachChannel;
  intent?: ReplyIntent;
  sentiment?: ReplySentiment;
  requiresReview?: boolean;
  search?: string;
  userId?: string;
}

export interface AnalyzeReplyRequest {
  messageText: string;
  leadContext?: {
    businessName?: string;
    industry?: string;
    previewUrl?: string;
    lastOutboundMessage?: string;
  };
}

export interface AnalyzeReplyResponse {
  success: boolean;
  analysis?: ReplyAnalysis;
  nextAction?: NextAction;
  handoffPhase: "phase13_autonomous_lead_pipeline";
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface UpdateLeadCRMStatusRequest {
  newStatus: CRMLeadStatus;
  reason: string;
  notes?: string;
  userId?: string;
}

// =============================================================================
// 9. PHASE 13 HANDOFF CONTRACT
// =============================================================================

export interface Phase13HandoffContract {
  leadId: string;
  businessName: string;
  channel: OutreachChannel;
  leadStatus: CRMLeadStatus;
  conversationId: string;
  latestInboundMessage: CRMMessage;
  intelligence: ReplyAnalysis;
  nextAction: NextAction;
  handoffPhase: "phase13_autonomous_lead_pipeline";
}

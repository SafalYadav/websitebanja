// src/lib/integrations/types.ts
/**
 * WebsiteBanja Real-World Integrations — Types & Contracts
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * WhatsApp MUST remain DISABLED.
 * All credentials strictly local, environment-based, and server-side only.
 * No secrets exposed to client-side bundles, API responses, or logs.
 */

export type IntegrationStatus =
  | "CONNECTED"
  | "NOT_CONFIGURED"
  | "NOT_AUTHORIZED"
  | "INVALID"
  | "DISABLED";

export interface GooglePlacesConfigStatus {
  status: "CONNECTED" | "NOT_CONFIGURED" | "INVALID";
  provider: "google_places";
  isConfigured: boolean;
  apiKeyPresent: boolean;
  redactedKey?: string; // e.g. "AIza...****"
  lastRequestAt?: string | null;
  lastSuccessAt?: string | null;
  lastError?: string | null;
}

export interface GmailConfigStatus {
  status: "CONNECTED" | "NOT_AUTHORIZED" | "NOT_CONFIGURED" | "INVALID";
  provider: "gmail";
  account: "websitebanja@gmail.com";
  isConfigured: boolean;
  clientIdPresent: boolean;
  clientSecretPresent: boolean;
  refreshTokenPresent: boolean;
  sendingEnabled: boolean;
  receivingEnabled: boolean;
  lastSyncAt?: string | null;
  lastSendAt?: string | null;
  lastError?: string | null;
}

export interface WhatsAppConfigStatus {
  status: "DISABLED";
  provider: "whatsapp";
  isEnabled: false;
  reason: "WhatsApp integration disabled — dedicated business number required.";
}

export interface IntegrationsStatusResponse {
  googlePlaces: GooglePlacesConfigStatus;
  gmail: GmailConfigStatus;
  whatsapp: WhatsAppConfigStatus;
  environment: "local" | "production";
  checkedAt: string;
}

export interface RateLimitState {
  hourlyCount: number;
  dailyCount: number;
  lastResetHour: string;
  lastResetDay: string;
  hourlyLimit: number;
  dailyLimit: number;
}

export interface InboundEmailMatch {
  messageId: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  snippet: string;
  bodyText: string;
  matchedLeadId?: string;
  matchedOutreachId?: string;
  matchType: "thread_id" | "in_reply_to" | "recipient_email" | "unknown";
}

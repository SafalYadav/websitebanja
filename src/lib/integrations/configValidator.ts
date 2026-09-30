// src/lib/integrations/configValidator.ts
/**
 * WebsiteBanja Integrations Config Validator & Safe Status Checker
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * ABSOLUTE SECRECY:
 * Never exposes unredacted API keys, OAuth client secrets, or refresh tokens.
 * All checks remain strictly server-side.
 */

import fs from "fs";
import path from "path";
import type {
  GooglePlacesConfigStatus,
  GmailConfigStatus,
  WhatsAppConfigStatus,
  IntegrationsStatusResponse,
} from "./types";

const STATE_DIR = path.resolve(process.cwd(), "scratch/integrations");
const STATE_FILE = path.join(STATE_DIR, "state.json");
const GMAIL_AUTH_FILE = path.join(process.cwd(), "scratch/config/gmail_auth.json");

interface IntegrationInternalState {
  googlePlaces: {
    lastRequestAt: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
  };
  gmail: {
    lastSendAt: string | null;
    lastSyncAt: string | null;
    lastError: string | null;
  };
}

let memoryState: IntegrationInternalState = {
  googlePlaces: { lastRequestAt: null, lastSuccessAt: null, lastError: null },
  gmail: { lastSendAt: null, lastSyncAt: null, lastError: null },
};

function ensureStorage(): void {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
  } catch {}
  try {
    const configDir = path.dirname(GMAIL_AUTH_FILE);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  } catch {}
}

export function redactSecret(secret?: string | null): string {
  if (!secret || typeof secret !== "string") return "";
  const trimmed = secret.trim();
  if (trimmed.length <= 8) return "********";
  return `${trimmed.slice(0, 4)}...****`;
}

export class ConfigValidator {
  static getInternalState(): IntegrationInternalState {
    ensureStorage();
    try {
      if (fs.existsSync(STATE_FILE)) {
        const raw = fs.readFileSync(STATE_FILE, "utf-8");
        return JSON.parse(raw);
      }
    } catch {
      // Fallback to memory
    }
    return memoryState;
  }

  static updateInternalState(updater: (state: IntegrationInternalState) => void): void {
    ensureStorage();
    const current = this.getInternalState();
    updater(current);
    updater(memoryState);
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(current, null, 2), "utf-8");
    } catch {
      // Non-fatal in read-only / restricted containers
    }
  }

  /**
   * Retrieves persistent refresh token from local scratch store or environment.
   */
  static getStoredRefreshToken(): string | null {
    try {
      if (fs.existsSync(GMAIL_AUTH_FILE)) {
        const raw = fs.readFileSync(GMAIL_AUTH_FILE, "utf-8");
        const data = JSON.parse(raw);
        if (data.refresh_token && typeof data.refresh_token === "string" && data.refresh_token.trim().length > 0) {
          return data.refresh_token.trim();
        }
      }
    } catch {
      // Ignore read error
    }

    const envToken = process.env.GMAIL_REFRESH_TOKEN?.trim() || process.env.GOOGLE_REFRESH_TOKEN?.trim();
    if (envToken) {
      return envToken;
    }
    return null;
  }

  /**
   * Securely saves refresh token locally without committing to git.
   */
  static saveRefreshToken(token: string): void {
    ensureStorage();
    const trimmed = token.trim();
    const payload = {
      account: "websitebanja@gmail.com",
      refresh_token: trimmed,
      updatedAt: new Date().toISOString(),
    };
    try {
      fs.writeFileSync(GMAIL_AUTH_FILE, JSON.stringify(payload, null, 2), "utf-8");
    } catch {}
    // Keep in-memory environment synced
    process.env.GMAIL_REFRESH_TOKEN = trimmed;
  }

  static getGooglePlacesStatus(): GooglePlacesConfigStatus {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
    const state = this.getInternalState().googlePlaces;

    const apiKeyPresent = Boolean(apiKey && apiKey.length > 5);
    let status: GooglePlacesConfigStatus["status"] = "NOT_CONFIGURED";

    if (apiKeyPresent) {
      // Check for common malformed placeholders
      if (apiKey?.includes("<") || apiKey?.includes("your-api-key") || apiKey === "placeholder") {
        status = "INVALID";
      } else {
        status = "CONNECTED";
      }
    }

    return {
      status,
      provider: "google_places",
      isConfigured: status === "CONNECTED",
      apiKeyPresent,
      redactedKey: apiKeyPresent ? redactSecret(apiKey) : undefined,
      lastRequestAt: state.lastRequestAt,
      lastSuccessAt: state.lastSuccessAt,
      lastError: state.lastError,
    };
  }

  static getGmailStatus(): GmailConfigStatus {
    const clientId = (process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)?.trim();
    const clientSecret = (process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)?.trim();
    const refreshToken = this.getStoredRefreshToken();
    const state = this.getInternalState().gmail;

    const clientIdPresent = Boolean(clientId && clientId.length > 5);
    const clientSecretPresent = Boolean(clientSecret && clientSecret.length > 5);
    const refreshTokenPresent = Boolean(refreshToken && refreshToken.length > 5);

    let status: GmailConfigStatus["status"] = "NOT_CONFIGURED";

    if (!clientIdPresent || !clientSecretPresent) {
      status = "NOT_CONFIGURED";
    } else if (!refreshTokenPresent) {
      status = "NOT_AUTHORIZED";
    } else {
      status = "CONNECTED";
    }

    // Auto-send is strictly false by default in Phase 16
    const sendingEnabled = process.env.AUTO_SEND_ENABLED === "true";
    const receivingEnabled = status === "CONNECTED";

    return {
      status,
      provider: "gmail",
      account: "websitebanja@gmail.com",
      isConfigured: status === "CONNECTED",
      clientIdPresent,
      clientSecretPresent,
      refreshTokenPresent,
      sendingEnabled,
      receivingEnabled,
      lastSyncAt: state.lastSyncAt,
      lastSendAt: state.lastSendAt,
      lastError: state.lastError,
    };
  }

  static getWhatsAppStatus(): WhatsAppConfigStatus {
    return {
      status: "DISABLED",
      provider: "whatsapp",
      isEnabled: false,
      reason: "WhatsApp integration disabled — dedicated business number required.",
    };
  }

  static getFullStatus(): IntegrationsStatusResponse {
    return {
      googlePlaces: this.getGooglePlacesStatus(),
      gmail: this.getGmailStatus(),
      whatsapp: this.getWhatsAppStatus(),
      environment: process.env.NODE_ENV === "production" ? "production" : "local",
      checkedAt: new Date().toISOString(),
    };
  }
}

// src/lib/integrations/gmailOAuth.ts
/**
 * WebsiteBanja Gmail OAuth 2.0 Client & Token Manager
 * Phase: Phase 16 (Google Places + Gmail + Inbound Gmail Replies)
 *
 * Account Identity: websitebanja@gmail.com
 * Minimum MVP Scopes:
 *   - https://www.googleapis.com/auth/gmail.send
 *   - https://www.googleapis.com/auth/gmail.readonly
 *   - https://www.googleapis.com/auth/gmail.modify
 *
 * Security:
 *   - Server-side only
 *   - Offline access with consent prompt for persistent refresh token
 *   - Cryptographic state token for CSRF protection
 *   - In-memory cached access token with automatic refresh
 *   - Refresh token securely stored locally in scratch/config/gmail_auth.json
 *   - Zero secrets leaked to browser or logs
 */

import crypto from "crypto";
import fs from "fs";
import path from "path";
import { ConfigValidator } from "./configValidator";
import { emitAgentEvent } from "@/lib/telemetry/agentTelemetry";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
].join(" ");

interface OAuthStateRecord {
  state: string;
  createdAt: number;
}

const STATE_CACHE_FILE = path.resolve(process.cwd(), "scratch/config/oauth_states.json");

// In-memory access token cache
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

function ensureStateStorage(): void {
  const dir = path.dirname(STATE_CACHE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadStateRecords(): OAuthStateRecord[] {
  ensureStateStorage();
  try {
    if (!fs.existsSync(STATE_CACHE_FILE)) return [];
    const raw = fs.readFileSync(STATE_CACHE_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveStateRecords(records: OAuthStateRecord[]): void {
  ensureStateStorage();
  fs.writeFileSync(STATE_CACHE_FILE, JSON.stringify(records, null, 2), "utf-8");
}

export class GmailOAuthManager {
  /**
   * Generates a secure authorization URL with CSRF state protection.
   */
  static generateAuthorizationUrl(redirectUriOverride?: string): { url: string; state: string } {
    const clientId = (process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)?.trim();
    if (!clientId) {
      throw new Error("GMAIL_CLIENT_ID or GOOGLE_CLIENT_ID is not configured in local environment.");
    }

    const redirectUri =
      redirectUriOverride ||
      (process.env.GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI)?.trim() ||
      "http://localhost:3000/api/integrations/gmail/callback";

    const state = crypto.randomBytes(24).toString("hex");

    // Prune states older than 15 minutes
    const now = Date.now();
    const existing = loadStateRecords().filter((r) => now - r.createdAt < 15 * 60 * 1000);
    existing.push({ state, createdAt: now });
    saveStateRecords(existing);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GMAIL_SCOPES,
      access_type: "offline",
      prompt: "consent",
      login_hint: "websitebanja@gmail.com",
      state,
    });

    emitAgentEvent({
      event: "agent.provider_call",
      agent: "mitra",
      provider: "gmail",
      metadata: { operation: "oauth.generate_auth_url" },
    });

    return {
      url: `${GOOGLE_AUTH_URL}?${params.toString()}`,
      state,
    };
  }

  /**
   * Verifies CSRF state token.
   */
  static verifyState(state: string): boolean {
    if (!state) return false;
    const now = Date.now();
    const existing = loadStateRecords();
    const valid = existing.some((r) => r.state === state && now - r.createdAt < 15 * 60 * 1000);

    // Consume the state once checked
    const remaining = existing.filter((r) => r.state !== state);
    saveStateRecords(remaining);

    return valid;
  }

  /**
   * Exchanges authorization code for tokens and saves refresh token securely.
   */
  static async exchangeCode(code: string, redirectUriOverride?: string): Promise<{ success: boolean; error?: string }> {
    const clientId = (process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)?.trim();
    const clientSecret = (process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)?.trim();
    const redirectUri =
      redirectUriOverride ||
      (process.env.GMAIL_REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI)?.trim() ||
      "http://localhost:3000/api/integrations/gmail/callback";

    if (!clientId || !clientSecret) {
      return { success: false, error: "GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET is missing." };
    }

    try {
      const response = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        ConfigValidator.updateInternalState((state) => {
          state.gmail.lastError = `OAuth exchange failed (${response.status}): ${errorText}`;
        });
        emitAgentEvent({
          event: "agent.provider_call",
          agent: "mitra",
          provider: "gmail",
          metadata: { operation: "oauth.exchange.failed", status: response.status },
        });
        return { success: false, error: `Token exchange failed: ${errorText}` };
      }

      const data = await response.json();

      if (data.refresh_token) {
        ConfigValidator.saveRefreshToken(data.refresh_token);
      }

      if (data.access_token) {
        const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
        cachedAccessToken = {
          token: data.access_token,
          expiresAt: Date.now() + (expiresInSec - 60) * 1000,
        };
      }

      ConfigValidator.updateInternalState((state) => {
        state.gmail.lastError = null;
      });

      emitAgentEvent({
        event: "agent.provider_call",
        agent: "mitra",
        provider: "gmail",
        metadata: { operation: "oauth.exchange.success" },
      });

      return { success: true };
    } catch (err: any) {
      const message = err.message || "Unknown error during token exchange.";
      ConfigValidator.updateInternalState((state) => {
        state.gmail.lastError = message;
      });
      return { success: false, error: message };
    }
  }

  /**
   * Retrieves a valid access token, refreshing automatically using stored refresh token.
   */
  static async getValidAccessToken(): Promise<string> {
    if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
      return cachedAccessToken.token;
    }

    const clientId = (process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID)?.trim();
    const clientSecret = (process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET)?.trim();
    const refreshToken = ConfigValidator.getStoredRefreshToken();

    if (!clientId || !clientSecret) {
      throw new Error("Cannot refresh Gmail token: GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET missing.");
    }

    if (!refreshToken) {
      throw new Error("Cannot refresh Gmail token: GMAIL_REFRESH_TOKEN is not authorized. Please connect Gmail via OAuth.");
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      ConfigValidator.updateInternalState((state) => {
        state.gmail.lastError = `Token refresh failed (${response.status}): ${errorText}`;
      });
      throw new Error(`Gmail access token refresh failed: ${errorText}`);
    }

    const data = await response.json();
    const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;

    cachedAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + (expiresInSec - 60) * 1000,
    };

    return cachedAccessToken.token;
  }
}

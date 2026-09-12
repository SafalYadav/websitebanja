import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client factories and request helpers.
 *
 * SECURITY: never import this module from a client component. It is intended for
 * API route handlers only.
 *
 * Two distinct clients are exposed on purpose:
 *
 *  - getUserScopedClient(token): anon key + the caller's JWT. Row Level Security
 *    applies, so the database is the second line of defence behind the route's
 *    own checks. This is the DEFAULT choice.
 *
 *  - getServiceRoleClient(): service role key, which BYPASSES RLS entirely. Only
 *    valid for routes that have already established authorization themselves
 *    (e.g. platform-admin endpoints). It throws when the key is absent instead of
 *    quietly falling back to the anon key, because a silent fallback makes local
 *    and production behave differently and hides authorization bugs.
 */

import { DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY } from "@/lib/supabase";

const SERVER_AUTH_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

function ensureEnvLoaded() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { loadEnvConfig } = require("@next/env");
      loadEnvConfig(process.cwd());
    } catch {
      // Ignore in environments where @next/env is not loaded
    }
  }
}

function requireEnv(name: string): string {
  ensureEnvLoaded();
  const value = process.env[name];
  if (!value) {
    if (name === "NEXT_PUBLIC_SUPABASE_URL") return DEFAULT_SUPABASE_URL;
    if (name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") return DEFAULT_SUPABASE_ANON_KEY;
    throw new Error(`Server misconfiguration: ${name} is not set.`);
  }
  return value.trim();
}

/** Anon-key client with no user context. Use only to validate a JWT. */
export function getAuthClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    SERVER_AUTH_OPTIONS
  );
}

/** Anon-key client that acts as the caller, so RLS policies are enforced. */
export function getUserScopedClient(token: string): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      ...SERVER_AUTH_OPTIONS,
      global: { headers: { Authorization: `Bearer ${token}` } },
    }
  );
}

/** Service-role client. Bypasses RLS — the caller MUST authorize the request first. */
export function getServiceRoleClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    SERVER_AUTH_OPTIONS
  );
}

/** Extracts a Bearer token from an Authorization header, or null when absent/blank. */
export function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token || token === "undefined" || token === "null") return null;

  return token;
}

export interface AuthenticatedUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
  token: string;
  app_metadata?: Record<string, unknown>;
}

/**
 * Validates the request's Bearer token against Supabase Auth.
 * Returns null when there is no valid session — callers must respond 401.
 */
import type { AuthErrorType } from "@/types/authErrors";

export interface AuthValidationResult {
  user: AuthenticatedUser | null;
  status: 200 | 401 | 503;
  error: string | null;
  errorType?: AuthErrorType;
}

/**
 * Executes auth.getUser(token) with up to 3 attempts, backoff, and network error classification.
 */
async function getUserWithRetry(token: string, maxAttempts = 3) {
  let lastResult: Awaited<ReturnType<ReturnType<typeof getAuthClient>["auth"]["getUser"]>> | null = null;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const client = getAuthClient();
      const res = await client.auth.getUser(token);
      lastResult = res;

      if (!res.error) {
        return { data: res.data, error: null, isNetworkError: false };
      }

      const errMsg = res.error.message || "";
      const isNet =
        errMsg.includes("fetch failed") ||
        res.error.status === 0 ||
        res.error.status === 502 ||
        res.error.status === 503 ||
        res.error.status === 504 ||
        (res.error as unknown as { code?: string })?.code === "ENOTFOUND" ||
        (res.error as unknown as { code?: string })?.code === "ECONNRESET";

      if (!isNet || attempt === maxAttempts) {
        return { data: res.data, error: res.error, isNetworkError: isNet };
      }

      const delayMs = 150 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 80);
      console.warn(`[validateUserAuth] Supabase Auth connection failed on attempt ${attempt}/${maxAttempts} (${errMsg}). Retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isNet =
        errMsg.includes("fetch failed") ||
        errMsg.includes("ENOTFOUND") ||
        errMsg.includes("ECONNRESET") ||
        errMsg.includes("ETIMEDOUT");

      if (!isNet || attempt === maxAttempts) {
        return { data: { user: null }, error: err, isNetworkError: isNet };
      }

      const delayMs = 150 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 80);
      console.warn(`[validateUserAuth] Supabase Auth fetch threw on attempt ${attempt}/${maxAttempts} (${errMsg}). Retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return {
    data: lastResult?.data ?? { user: null },
    error: lastResult?.error ?? lastError,
    isNetworkError: true,
  };
}

/**
 * Validates the request's Bearer token against Supabase Auth.
 * Accurately distinguishes between invalid credentials (401) and network/infrastructure errors (503).
 */
export async function validateUserAuth(req: Request): Promise<AuthValidationResult> {
  const authStart = Date.now();
  console.log("[AUTH] validate:start");
  const token = getBearerToken(req);
  if (!token) {
    console.warn("[AUTH] validate:failure duration=" + (Date.now() - authStart) + "ms reason=missing_bearer_token");
    return {
      user: null,
      status: 401,
      error: "Unauthorized: Missing Bearer token.",
      errorType: "AUTH_UNAUTHENTICATED",
    };
  }

  const authProvider = process.env.AUTH_PROVIDER?.toLowerCase();
  if (authProvider === "azure") {
    const { validateToken } = await import("./auth/tokenValidator");
    const res = await validateToken(token);
    console.log("[AUTH] validate:azure duration=" + (Date.now() - authStart) + "ms status=" + res.status);
    return res;
  }

  try {
    const { data: { user }, error, isNetworkError } = await getUserWithRetry(token, 3);
    if (error) {
      if (isNetworkError) {
        const errMsg = error instanceof Error ? error.message : (error as { message?: string })?.message || String(error);
        console.error("[AUTH] validate:network_error duration=" + (Date.now() - authStart) + "ms error=" + errMsg);
        return {
          user: null,
          status: 503,
          error: "Authentication service temporarily unreachable. Please try again shortly.",
          errorType: "AUTH_PROVIDER_ERROR",
        };
      }

      const errObj = error as { message?: string };
      console.warn("[AUTH] validate:rejected duration=" + (Date.now() - authStart) + "ms reason=" + (errObj?.message || "invalid_token"));
      return {
        user: null,
        status: 401,
        error: errObj?.message || "Unauthorized: Session invalid or expired.",
        errorType: "AUTH_SESSION_EXPIRED",
      };
    }

    if (!user) {
      console.warn("[AUTH] validate:user_not_found duration=" + (Date.now() - authStart) + "ms");
      return {
        user: null,
        status: 401,
        error: "Unauthorized: User account not found.",
        errorType: "API_AUTH_ERROR",
      };
    }

    console.log("[AUTH] validate:success duration=" + (Date.now() - authStart) + "ms userId=" + user.id);
    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        emailVerified: Boolean(user.email_confirmed_at),
        token,
        app_metadata: (user.app_metadata as Record<string, unknown> | undefined) || {},
      },
      status: 200,
      error: null,
      errorType: "AUTHENTICATED",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isNetwork = message.includes("fetch failed") || message.includes("ENOTFOUND");
    console.error("[AUTH] validate:unexpected_error duration=" + (Date.now() - authStart) + "ms isNetwork=" + isNetwork + " error=" + message);
    return {
      user: null,
      status: isNetwork ? 503 : 401,
      error: isNetwork
        ? "Authentication service temporarily unreachable. Please try again shortly."
        : "Unauthorized: Token verification error.",
      errorType: isNetwork ? "AUTH_PROVIDER_ERROR" : "API_AUTH_ERROR",
    };
  }
}

/**
 * Validates the request's Bearer token against Supabase Auth.
 * Returns null when there is no valid session.
 */
export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  const result = await validateUserAuth(req);
  return result.user;
}

/**
 * Best-effort client IP for rate limiting.
 *
 * SECURITY: `x-forwarded-for` is a client-settable header that proxies APPEND to,
 * so the left-most entry is attacker-controlled and must never be trusted. We read
 * the right-most entry (added by the closest trusted proxy) and prefer the
 * platform-provided `x-real-ip` (standard reverse proxy / Azure Container Apps ingress) when present.
 *
 * IP is still a weak identifier — prefer a user id whenever the route is authenticated.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "unknown";
}

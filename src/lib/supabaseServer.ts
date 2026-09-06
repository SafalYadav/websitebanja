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

const SERVER_AUTH_OPTIONS = {
  auth: { persistSession: false, autoRefreshToken: false },
} as const;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Server misconfiguration: ${name} is not set.`);
  }
  return value;
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
}

/**
 * Validates the request's Bearer token against Supabase Auth.
 * Returns null when there is no valid session — callers must respond 401.
 */
export async function authenticateRequest(req: Request): Promise<AuthenticatedUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;

  try {
    const { data: { user }, error } = await getAuthClient().auth.getUser(token);
    if (error || !user) return null;

    return {
      id: user.id,
      email: user.email ?? null,
      emailVerified: Boolean(user.email_confirmed_at),
      token,
    };
  } catch (err) {
    console.error("[authenticateRequest] token validation failed:", err);
    return null;
  }
}

/**
 * Best-effort client IP for rate limiting.
 *
 * SECURITY: `x-forwarded-for` is a client-settable header that proxies APPEND to,
 * so the left-most entry is attacker-controlled and must never be trusted. We read
 * the right-most entry (added by the closest trusted proxy) and prefer the
 * platform-provided `x-real-ip` / `x-vercel-forwarded-for` when present.
 *
 * IP is still a weak identifier — prefer a user id whenever the route is authenticated.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  const vercelIp = req.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercelIp) return vercelIp.split(",").pop()!.trim();

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }

  return "unknown";
}

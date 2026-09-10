// src/lib/auth/index.ts

import { supabase } from "@/lib/supabase";
import { validateToken } from "./tokenValidator";
import { resolveUserUuid, HISTORICAL_USER_MAP } from "./identityMap";
import type { AuthValidationResult } from "./types";

export * from "./types";
export * from "./config";
export { resolveUserUuid, HISTORICAL_USER_MAP, validateToken };

/**
 * Validates the request's Bearer token against the active authentication provider
 * (supporting both Azure Entra ID and Supabase Auth).
 */
export async function validateUserAuth(req: Request): Promise<AuthValidationResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      user: null,
      status: 401,
      error: "Unauthorized: Missing or invalid Bearer token.",
    };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  return validateToken(token);
}

/**
 * Client-Side Authentication Facade
 * Delegates to Microsoft Entra or Supabase Auth based on AUTH_PROVIDER configuration.
 */
export async function signUp(email: string, password: string) {
  // Standard Supabase Auth signup (or Entra CIAM signup flow)
  return await supabase.auth.signUp({
    email,
    password,
  });
}

export async function signIn(email: string, password: string) {
  return await supabase.auth.signInWithPassword({
    email,
    password,
  });
}

export async function signInWithGoogle() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  });
}

export async function resetPasswordForEmail(email: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  });
}

export async function updateUserPassword(password: string) {
  return await supabase.auth.updateUser({
    password,
  });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

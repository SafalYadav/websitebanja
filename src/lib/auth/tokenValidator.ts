// src/lib/auth/tokenValidator.ts

import * as jose from "jose";
import { getAuthConfig } from "./config";
import { resolveUserUuid } from "./identityMap";
import { getAuthClient } from "@/lib/supabaseServer";
import type { AuthValidationResult } from "./types";

let cachedJwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJwks(jwksUri: string) {
  if (!cachedJwks) {
    cachedJwks = jose.createRemoteJWKSet(new URL(jwksUri));
  }
  return cachedJwks;
}

/**
 * Validates a Bearer token across both Azure Entra ID (OIDC) and Supabase Auth.
 * Automatically inspects the token structure to route to the appropriate validator,
 * providing zero-downtime transition and 100% rollback capability.
 */
export async function validateToken(
  token: string
): Promise<AuthValidationResult> {
  if (!token || token === "undefined" || token === "null") {
    return {
      user: null,
      status: 401,
      error: "Unauthorized: Missing or invalid Bearer token.",
    };
  }

  const authConfig = getAuthConfig();

  let iss = "";
  try {
    const claims = jose.decodeJwt(token);
    if (typeof claims.iss === "string") {
      iss = claims.iss;
    }
  } catch {
    // invalid JWT format
  }

  const isEntraToken =
    iss.includes("login.microsoftonline.com") ||
    iss.includes("ciamlogin.com") ||
    iss.includes("b2clogin.com");

  // Path 1: Validate via Azure Microsoft Entra ID
  if (authConfig.provider === "azure" || isEntraToken) {
    if (authConfig.entraJwksUri) {
      try {
        const jwks = getJwks(authConfig.entraJwksUri);
        const { payload } = await jose.jwtVerify(token, jwks, {
          audience: authConfig.entraClientId,
        });

        const email =
          (payload.email as string) ||
          (payload.preferred_username as string) ||
          (payload.upn as string);

        if (!email) {
          return {
            user: null,
            status: 401,
            error: "Unauthorized: Token does not contain a verified email claim.",
          };
        }

        const persistentId = await resolveUserUuid(email, {
          oid: payload.oid,
          sub: payload.sub,
          name: payload.name,
        });

        return {
          user: {
            id: persistentId,
            email,
            emailVerified: true,
            token,
            app_metadata: { provider: "azure_entra", roles: payload.roles },
            provider: "azure",
          },
          status: 200,
          error: null,
        };
      } catch (err) {
        // If Entra validation failed and Supabase is active, try Supabase fallback
        if (authConfig.provider === "supabase") {
          // fall through to Supabase check
        } else {
          return {
            user: null,
            status: 401,
            error: `Unauthorized: Entra token verification failed (${err instanceof Error ? err.message : String(err)})`,
          };
        }
      }
    }
  }

  // Path 2: Validate via Supabase Auth (Default & Rollback mode)
  try {
    const {
      data: { user },
      error,
    } = await getAuthClient().auth.getUser(token);

    if (error || !user) {
      return {
        user: null,
        status: 401,
        error: error?.message || "Unauthorized: Session invalid or expired.",
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email ?? null,
        emailVerified: Boolean(user.email_confirmed_at),
        token,
        app_metadata: (user.app_metadata as Record<string, unknown> | undefined) || {},
        provider: "supabase",
      },
      status: 200,
      error: null,
    };
  } catch (_err) {
    return {
      user: null,
      status: 401,
      error: "Unauthorized: Token verification error.",
    };
  }
}

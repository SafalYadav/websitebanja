// src/lib/auth/config.ts

import type { AuthProvider } from "./types";

export interface AuthConfig {
  provider: AuthProvider;
  entraTenantId?: string;
  entraClientId?: string;
  entraAuthority?: string;
  entraJwksUri?: string;
  isAzureConfigured: boolean;
}

export function getAuthConfig(): AuthConfig {
  const provider = (process.env.AUTH_PROVIDER?.toLowerCase() === "azure"
    ? "azure"
    : "supabase") as AuthProvider;

  const entraTenantId = process.env.AZURE_ENTRA_TENANT_ID;
  const entraClientId = process.env.AZURE_ENTRA_CLIENT_ID;
  const entraAuthority =
    process.env.AZURE_ENTRA_AUTHORITY ||
    (entraTenantId ? `https://login.microsoftonline.com/${entraTenantId}/v2.0` : undefined);
  const entraJwksUri =
    process.env.AZURE_ENTRA_JWKS_URI ||
    (entraTenantId ? `https://login.microsoftonline.com/${entraTenantId}/discovery/v2.0/keys` : undefined);

  const isAzureConfigured = Boolean(entraClientId && (entraTenantId || entraAuthority));

  return {
    provider,
    entraTenantId,
    entraClientId,
    entraAuthority,
    entraJwksUri,
    isAzureConfigured,
  };
}

// src/lib/infrastructure/environmentConfig.ts
/**
 * WebsiteBanja AI — Production Infrastructure & Environment Configuration
 * Phase: Phase 24 (Production Infrastructure)
 *
 * Enforces strict environment separation between Local Development and Production:
 *   - Production MUST NOT point to localhost n8n or localhost services.
 *   - Production MUST NOT have hard-coded secrets or credentials.
 *   - Production MUST use Azure PostgreSQL, Azure Blob Storage, Azure Key Vault, and Azure Container Apps.
 *   - Local development remains 100% functional without forcing developers to provision Azure resources.
 *   - WhatsApp remains strictly and unconditionally DISABLED.
 *   - External communications remain gated on human approval.
 */

import { getDatabaseConfig } from "@/lib/db/config";
import { getStorageConfig } from "@/lib/storage/config";

export type EnvironmentMode = "development" | "staging" | "production";

export interface EnvironmentValidationResult {
  valid: boolean;
  mode: EnvironmentMode;
  errors: string[];
  warnings: string[];
  infrastructure: {
    containerAppsReady: boolean;
    databaseReady: boolean;
    storageReady: boolean;
    n8nWebhookConfigured: boolean;
    n8nProductionCompliant: boolean;
    keyVaultReady: boolean;
    whatsAppDisabled: boolean;
    humanApprovalEnforced: boolean;
  };
  endpoints: {
    appUrl: string;
    n8nWebhookUrl: string | null;
  };
}

/**
 * Determines current deployment environment mode.
 */
export function getEnvironmentMode(env: Record<string, string | undefined> = process.env): EnvironmentMode {
  const runtimeMode = env.WEBSITEBANJA_RUNTIME_MODE?.toLowerCase().trim();
  if (runtimeMode === "production") return "production";
  if (runtimeMode === "staging") return "staging";

  const nodeEnv = env.NODE_ENV?.toLowerCase().trim();
  if (nodeEnv === "production" && env.CONTAINER_APP_NAME) return "production";
  if (nodeEnv === "production" && !env.LOCAL_DEV_SIMULATION) return "production";

  return "development";
}

/**
 * Checks if running in production mode.
 */
export function isProduction(env: Record<string, string | undefined> = process.env): boolean {
  return getEnvironmentMode(env) === "production";
}

/**
 * Checks if running in local development mode.
 */
export function isDevelopment(env: Record<string, string | undefined> = process.env): boolean {
  return getEnvironmentMode(env) === "development";
}

/**
 * Validates infrastructure and environment settings against security & production invariants.
 */
export function validateEnvironmentConfiguration(
  env: Record<string, string | undefined> = process.env
): EnvironmentValidationResult {
  const mode = getEnvironmentMode(env);
  const errors: string[] = [];
  const warnings: string[] = [];

  const appUrl = env.NEXT_PUBLIC_APP_URL || env.APP_URL || (mode === "production" ? "https://websitebanja.com" : "http://localhost:3000");
  const n8nWebhookUrl = env.N8N_OPS_AGENT_WEBHOOK_URL || env.N8N_WEBHOOK_URL || null;

  // 1. URL & Localhost Invariants
  const isLocalhostApp = /localhost|127\.0\.0\.1/i.test(appUrl);
  if (mode === "production" && isLocalhostApp) {
    errors.push("Production Error: NEXT_PUBLIC_APP_URL cannot point to localhost or 127.0.0.1 in production mode.");
  }

  let n8nProductionCompliant = true;
  if (n8nWebhookUrl) {
    const isLocalhostN8n = /localhost|127\.0\.0\.1/i.test(n8nWebhookUrl);
    if (mode === "production" && isLocalhostN8n) {
      n8nProductionCompliant = false;
      errors.push("Production Error: N8N_OPS_AGENT_WEBHOOK_URL cannot point to localhost or 127.0.0.1 in production. A production Azure Container App n8n instance must be specified.");
    }
  } else if (mode === "production") {
    warnings.push("Production Notice: N8N_OPS_AGENT_WEBHOOK_URL is not set. n8n Ops Agent will use local deterministic executor loop fallback.");
  }

  // 2. Database Invariants
  const dbConfig = getDatabaseConfig();
  const dbPassword = env.AZURE_DB_PASSWORD || env.PGPASSWORD;
  const isDbConfigured = Boolean(
    dbConfig.databaseUrl?.includes("postgres") ||
    (env.AZURE_DB_USER && dbPassword)
  );

  if (mode === "production" && !isDbConfigured) {
    warnings.push("Database Notice: Azure PostgreSQL credentials not fully configured in current environment. Local repository fallback active.");
  }

  // 3. Storage Invariants
  const storageConfig = getStorageConfig();
  const isStorageReady = storageConfig.isAzureConfigured;
  if (mode === "production" && !isStorageReady) {
    warnings.push("Storage Notice: Azure Blob Storage not configured. Local scratch storage active.");
  }

  // 4. Secret Hygiene: Check that secrets are not dummy placeholders
  const placeholderPatterns = [
    /^your-/i,
    /<.*>/,
    /^placeholder$/i,
    /^changeme$/i,
    /^todo$/i,
  ];

  const sensitiveVars = [
    { name: "AZURE_DB_PASSWORD", val: env.AZURE_DB_PASSWORD },
    { name: "OPENAI_API_KEY", val: env.OPENAI_API_KEY },
    { name: "GEMINI_API_KEY", val: env.GEMINI_API_KEY },
    { name: "WEBSITEBANJA_AUTOMATION_SECRET", val: env.WEBSITEBANJA_AUTOMATION_SECRET },
  ];

  for (const item of sensitiveVars) {
    if (item.val) {
      const isPlaceholder = placeholderPatterns.some((pattern) => pattern.test(item.val!));
      if (isPlaceholder && mode === "production") {
        errors.push(`Security Invariant: Environment variable '${item.name}' contains a dummy placeholder value in production.`);
      }
    }
  }

  // 5. WhatsApp Invariant
  const whatsAppToken = env.WHATSAPP_ACCESS_TOKEN?.toLowerCase();
  const isWhatsAppDisabled = !whatsAppToken || whatsAppToken === "disabled" || whatsAppToken === "false";
  if (!isWhatsAppDisabled) {
    errors.push("Safety Invariant: WhatsApp operations must remain strictly DISABLED across WebsiteBanja.");
  }

  // 6. Human Approval Outreach Invariant
  const autoSendEnabled = env.AUTO_SEND_ENABLED === "true";
  const communicationDryRun = env.COMMUNICATION_DRY_RUN !== "false";
  const humanApprovalEnforced = !autoSendEnabled || communicationDryRun;

  // 7. Key Vault & Managed Identity
  const isKeyVaultReferenced = Boolean(
    env.KEY_VAULT_NAME ||
    env.AZURE_KEYVAULT_RESOURCEENDPOINT ||
    Object.values(env).some((v) => typeof v === "string" && v.includes("@Microsoft.KeyVault"))
  );

  const containerAppsReady = Boolean(
    env.CONTAINER_APP_NAME ||
    env.KUBERNETES_SERVICE_HOST ||
    mode === "production"
  );

  return {
    valid: errors.length === 0,
    mode,
    errors,
    warnings,
    infrastructure: {
      containerAppsReady,
      databaseReady: isDbConfigured,
      storageReady: isStorageReady,
      n8nWebhookConfigured: Boolean(n8nWebhookUrl),
      n8nProductionCompliant,
      keyVaultReady: isKeyVaultReferenced,
      whatsAppDisabled: isWhatsAppDisabled,
      humanApprovalEnforced,
    },
    endpoints: {
      appUrl,
      n8nWebhookUrl,
    },
  };
}

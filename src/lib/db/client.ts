// src/lib/db/client.ts

import { getDatabaseConfig, type DatabaseConfig, type DatabaseProvider } from "./config";
import { dbHealthCheck } from "./queries";

export interface DatabaseHealthStatus {
  provider: DatabaseProvider;
  status: "healthy" | "degraded" | "unreachable";
  message: string;
  latencyMs?: number;
  isAzureReady: boolean;
}

/**
 * Validates connectivity to Azure PostgreSQL.
 *
 * ARCHITECTURAL DECISION:
 * All application data is hosted on Azure Database for PostgreSQL Flexible Server.
 * Supabase DB is completely decommissioned.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const config = getDatabaseConfig();

  if (!config.isAzureConfigured) {
    return {
      provider: "azure",
      status: "unreachable",
      message: "Azure PostgreSQL credentials (AZURE_DB_USER / AZURE_DB_PASSWORD or DATABASE_URL) are not configured.",
      isAzureReady: false,
    };
  }

  try {
    const result = await dbHealthCheck();
    return {
      provider: "azure",
      status: result.healthy ? "healthy" : "degraded",
      message: result.message,
      latencyMs: result.latencyMs,
      isAzureReady: result.healthy,
    };
  } catch (err) {
    return {
      provider: "azure",
      status: "unreachable",
      message: err instanceof Error ? err.message : String(err),
      isAzureReady: false,
    };
  }
}

export { getDatabaseConfig, type DatabaseConfig, type DatabaseProvider };

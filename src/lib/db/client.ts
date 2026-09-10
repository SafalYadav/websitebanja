// src/lib/db/client.ts

import { getDatabaseConfig, type DatabaseConfig, type DatabaseProvider } from "./config";
import { supabase } from "@/lib/supabase";

export interface DatabaseHealthStatus {
  provider: DatabaseProvider;
  status: "healthy" | "degraded" | "unreachable";
  message: string;
  latencyMs?: number;
  isAzureReady: boolean;
}

/**
 * Validates connectivity to the active database provider.
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  const config = getDatabaseConfig();
  const startTime = Date.now();

  if (config.provider === "supabase") {
    try {
      // Lightweight probe against published projects or public table
      const { error } = await supabase.from("projects").select("id").limit(1);
      const latencyMs = Date.now() - startTime;

      if (error && error.code !== "PGRST116") {
        return {
          provider: "supabase",
          status: "degraded",
          message: error.message,
          latencyMs,
          isAzureReady: config.isAzureConfigured,
        };
      }

      return {
        provider: "supabase",
        status: "healthy",
        message: "Supabase connection active and responsive.",
        latencyMs,
        isAzureReady: config.isAzureConfigured,
      };
    } catch (err) {
      return {
        provider: "supabase",
        status: "unreachable",
        message: err instanceof Error ? err.message : String(err),
        isAzureReady: config.isAzureConfigured,
      };
    }
  }

  // Azure PostgreSQL provider health check
  if (!config.databaseUrl) {
    return {
      provider: "azure",
      status: "unreachable",
      message: "DATABASE_URL is not configured for Azure PostgreSQL.",
      isAzureReady: false,
    };
  }

  try {
    // Dynamic import to allow graceful execution even before pg driver is bundled
    const pg = await import("pg").catch(() => null);
    if (!pg) {
      return {
        provider: "azure",
        status: "degraded",
        message: "Native pg driver not yet installed. Install pg and @types/pg to execute direct Azure queries.",
        isAzureReady: false,
      };
    }

    const { Pool } = pg.default || pg;
    const poolConfig = config.connectionParams
      ? {
          host: config.connectionParams.host,
          port: config.connectionParams.port,
          user: config.connectionParams.user,
          password: config.connectionParams.password,
          database: config.connectionParams.database,
          ssl: config.ssl,
          connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
        }
      : {
          connectionString: config.databaseUrl,
          ssl: config.ssl,
          connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
        };

    const pool = new Pool(poolConfig);

    const client = await pool.connect();
    try {
      await client.query("SELECT 1 AS health_check");
      const latencyMs = Date.now() - startTime;
      return {
        provider: "azure",
        status: "healthy",
        message: "Azure PostgreSQL connection verified.",
        latencyMs,
        isAzureReady: true,
      };
    } finally {
      client.release();
      await pool.end();
    }
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

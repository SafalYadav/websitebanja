// src/lib/db/config.ts

/**
 * Database Configuration & Connection Settings
 *
 * ARCHITECTURAL DECISION:
 * WebsiteBanja AI uses Azure PostgreSQL as its canonical application database.
 * Supabase Auth remains active for user authentication only.
 * The database provider is locked to "azure".
 */

export type DatabaseProvider = "azure";

export interface DatabaseConfig {
  provider: DatabaseProvider;
  databaseUrl: string | null;
  directDatabaseUrl: string | null;
  connectionParams?: {
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
  };
  ssl: {
    rejectUnauthorized: boolean;
    ca?: string;
  };
  pool: {
    max: number;
    min: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
  isAzureConfigured: boolean;
}

/**
 * Resolves database configuration from environment variables for Azure PostgreSQL.
 */
export function getDatabaseConfig(): DatabaseConfig {
  const provider: DatabaseProvider = "azure";
  
  let databaseUrl = process.env.DATABASE_URL || process.env.AZURE_POSTGRESQL_CONNECTION_STRING || null;
  let directDatabaseUrl = process.env.DIRECT_DATABASE_URL || process.env.AZURE_POSTGRESQL_DIRECT_URL || databaseUrl;

  const host = process.env.AZURE_DB_HOST || process.env.PGHOST || "websitebanja-db.postgres.database.azure.com";
  const user = process.env.AZURE_DB_USER || process.env.PGUSER;
  const password = process.env.AZURE_DB_PASSWORD || process.env.PGPASSWORD;
  const database = process.env.AZURE_DB_NAME || process.env.PGDATABASE || "postgres";
  const port = parseInt(process.env.AZURE_DB_PORT || process.env.PGPORT || "5432", 10);

  const connectionParams = user && password ? { host, port, user, password, database } : undefined;

  // If connectionParams exist but no databaseUrl, construct a safe fallback URL
  if (connectionParams && !databaseUrl) {
    const encodedUser = encodeURIComponent(connectionParams.user!);
    const encodedPass = encodeURIComponent(connectionParams.password!);
    databaseUrl = `postgresql://${encodedUser}:${encodedPass}@${connectionParams.host}:${connectionParams.port}/${connectionParams.database}?sslmode=require`;
    directDatabaseUrl = databaseUrl;
  }

  const isProduction = process.env.NODE_ENV === "production";
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false";

  return {
    provider,
    databaseUrl,
    directDatabaseUrl,
    connectionParams,
    ssl: {
      rejectUnauthorized: isProduction ? rejectUnauthorized : false,
      ca: process.env.DATABASE_SSL_CA || undefined,
    },
    pool: {
      max: parseInt(process.env.DATABASE_MAX_CONNECTIONS || "20", 10),
      min: parseInt(process.env.DATABASE_MIN_CONNECTIONS || "2", 10),
      idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT_MS || "30000", 10),
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONN_TIMEOUT_MS || "10000", 10),
    },
    isAzureConfigured: Boolean((databaseUrl && databaseUrl.includes("postgres")) || (user && password)),
  };
}

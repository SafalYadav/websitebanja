// scripts/migrationRunnerCore.mjs
/**
 * WebsiteBanja Authoritative Migration Runner Core
 *
 * Guarantees:
 * 1. Dependency-ordered application according to migrations/manifest.json.
 * 2. Manifest and disk sha256 checksum verification before execution.
 * 3. Distributed advisory lock (pg_advisory_lock: 748392019) to prevent concurrent execution races.
 * 4. Single-transaction ownership: migration DDL and schema_migrations tracking commit atomically.
 * 5. Strict immutability: fatal error on checksum mismatch between database record and disk.
 * 6. Non-mutating --dry-run: zero DDL/DML executed, checks information_schema without creating tracking table.
 * 7. Verified per-migration baseline adoption: inspects required tables, columns, and functions
 *    relevant to each migration before marking applied. Stops on partial/incompatible schemas.
 * 8. Production-grade TLS certificate verification matching application database config.
 * 9. Credential safety: no secrets logged.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const { Client } = pg;
export const ADVISORY_LOCK_ID = 748392019;

export function computeChecksum(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

export function sanitizeSqlForRunner(sql) {
  return sql
    .replace(/^\s*BEGIN\s*;\s*$/gim, "-- [runner managed] BEGIN;")
    .replace(/^\s*COMMIT\s*;\s*$/gim, "-- [runner managed] COMMIT;");
}

export function resolveDbConfig(env = process.env) {
  const databaseUrl =
    env.DATABASE_URL ||
    env.AZURE_POSTGRESQL_CONNECTION_STRING ||
    env.DIRECT_DATABASE_URL ||
    null;

  const isProduction = env.NODE_ENV === "production" || env.WEBSITEBANJA_RUNTIME_MODE === "production";
  const rejectUnauthorized = env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false";
  const sslConfig = {
    rejectUnauthorized: isProduction ? rejectUnauthorized : false,
    ...(env.DATABASE_SSL_CA ? { ca: env.DATABASE_SSL_CA } : {}),
  };

  if (databaseUrl) {
    return {
      connectionString: databaseUrl,
      ssl: sslConfig,
    };
  }

  const host = env.AZURE_DB_HOST || env.PGHOST || "websitebanja-db.postgres.database.azure.com";
  const user = env.AZURE_DB_USER || env.PGUSER;
  const password = env.AZURE_DB_PASSWORD || env.PGPASSWORD;
  const database = env.AZURE_DB_NAME || env.PGDATABASE || "postgres";
  const port = parseInt(env.AZURE_DB_PORT || env.PGPORT || "5432", 10);

  if (user && password) {
    return {
      host,
      port,
      user,
      password,
      database,
      ssl: sslConfig,
    };
  }

  return null;
}

/**
 * Expected schema artifacts for baseline migrations to enable verified per-migration adoption.
 */
export const BASELINE_SCHEMA_REQUIREMENTS = {
  "01_azure_schema_baseline": {
    tables: [
      "projects",
      "subscriptions",
      "website_members",
      "catalog_items",
      "published_versions",
      "preview_links",
      "analytics_events",
      "project_knowledge",
      "project_knowledge_revisions",
    ],
    columns: [],
    indexes: ["idx_projects_user_id", "idx_published_versions_slug"],
    functions: [
      "publish_project_atomic",
      "get_published_project_by_slug",
      "get_preview_project",
      "append_lead_to_project",
    ],
  },
  "02_leads_schema": {
    tables: ["business_leads"],
    columns: [],
    indexes: ["idx_leads_place_id", "idx_leads_status"],
    functions: [],
  },
  "03_lead_audits_schema": {
    tables: ["lead_audits"],
    columns: [],
    indexes: ["idx_lead_audits_lead_id"],
    functions: [],
  },
  "04_growth_retention_maintenance": {
    tables: [],
    columns: [],
    indexes: [],
    functions: [
      "purge_expired_preview_links",
      "prune_project_knowledge_revisions",
      "prune_old_published_versions",
      "run_database_maintenance",
    ],
  },
  "05_agent_telemetry_baseline": {
    tables: [
      "agent_runs",
      "agent_decisions",
      "agent_errors",
      "agent_recommendations",
    ],
    columns: [],
    indexes: ["idx_agent_runs_created_at"],
    functions: [],
  },
  "06_uniqueness_verification": {
    tables: [],
    columns: [{ table: "projects", column: "design_fingerprint" }],
    indexes: [],
    functions: [],
  },
  "07_admin_access_control_audit": {
    tables: ["admin_audit_logs"],
    columns: [],
    indexes: ["idx_admin_audit_logs_created_at"],
    functions: [],
  },
  "08_agent_memory_learning_baseline": {
    tables: [
      "agent_events",
      "agent_feedback",
      "agent_failures",
      "agent_evaluations",
      "agent_lessons",
      "agent_strategies",
      "agent_experiments",
    ],
    columns: [
      { table: "agent_runs", column: "parent_run_id" },
      { table: "agent_runs", column: "objective" },
      { table: "agent_runs", column: "domain" },
    ],
    indexes: ["idx_agent_lessons_strategy", "idx_agent_events_tenant_id"],
    functions: [],
  },
  "09_crm_outreach_pipeline_schema": {
    tables: [
      "crm_leads_state",
      "crm_conversations",
      "crm_messages",
      "outreach_records",
      "autonomous_pipeline_runs",
      "approval_records",
    ],
    columns: [],
    indexes: ["idx_crm_leads_tenant_status", "idx_outreach_records_lead_id"],
    functions: [],
  },
};

/**
 * Inspects whether a specific migration's required database artifacts already exist in the database.
 * Returns: { status: "full" | "none" | "partial", details: string[] }
 */
export async function inspectMigrationArtifacts(client, migrationId) {
  const reqs = BASELINE_SCHEMA_REQUIREMENTS[migrationId];
  if (!reqs) {
    return { status: "none", details: [] };
  }

  const missing = [];
  const found = [];

  // 1. Check Tables
  if (reqs.tables && reqs.tables.length > 0) {
    const tableRes = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [reqs.tables]
    );
    const existingTables = new Set(tableRes.rows.map((r) => r.table_name));
    for (const t of reqs.tables) {
      if (existingTables.has(t)) {
        found.push(`table:${t}`);
      } else {
        missing.push(`table:${t}`);
      }
    }
  }

  // 2. Check Columns
  if (reqs.columns && reqs.columns.length > 0) {
    for (const c of reqs.columns) {
      const colRes = await client.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
        [c.table, c.column]
      );
      if (colRes.rows.length > 0) {
        found.push(`column:${c.table}.${c.column}`);
      } else {
        missing.push(`column:${c.table}.${c.column}`);
      }
    }
  }

  // 3. Check Indexes
  if (reqs.indexes && reqs.indexes.length > 0) {
    const indexRes = await client.query(
      `SELECT indexname FROM pg_indexes 
       WHERE schemaname = 'public' AND indexname = ANY($1)`,
      [reqs.indexes]
    );
    const existingIndexes = new Set(indexRes.rows.map((r) => r.indexname));
    for (const idx of reqs.indexes) {
      if (existingIndexes.has(idx)) {
        found.push(`index:${idx}`);
      } else {
        missing.push(`index:${idx}`);
      }
    }
  }

  // 4. Check Functions
  if (reqs.functions && reqs.functions.length > 0) {
    const fnRes = await client.query(
      `SELECT routine_name FROM information_schema.routines 
       WHERE routine_schema = 'public' AND routine_type = 'FUNCTION' AND routine_name = ANY($1)`,
      [reqs.functions]
    );
    const existingFns = new Set(fnRes.rows.map((r) => r.routine_name));
    for (const fn of reqs.functions) {
      if (existingFns.has(fn)) {
        found.push(`function:${fn}`);
      } else {
        missing.push(`function:${fn}`);
      }
    }
  }

  if (found.length > 0 && missing.length === 0) {
    return { status: "full", details: found };
  } else if (found.length === 0) {
    return { status: "none", details: missing };
  } else {
    return { status: "partial", details: { found, missing } };
  }
}

/**
 * Loads and verifies the manifest against migration files on disk.
 */
export function loadAndVerifyManifest(manifestPath = path.resolve(process.cwd(), "migrations", "manifest.json")) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Migration manifest not found at ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const verifiedMigrations = [];

  for (const m of manifest.migrations) {
    const fullPath = path.resolve(process.cwd(), m.path);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Migration file missing: ${m.path} (${m.id})`);
    }
    const content = fs.readFileSync(fullPath, "utf8");
    const checksum = computeChecksum(content);

    if (m.sha256 && m.sha256 !== checksum) {
      throw new Error(
        `Checksum drift for migration '${m.id}'! Manifest sha256: ${m.sha256}, disk sha256: ${checksum}`
      );
    }

    verifiedMigrations.push({
      ...m,
      fullPath,
      content: sanitizeSqlForRunner(content),
      checksum,
    });
  }

  return { manifest, verifiedMigrations };
}

/**
 * Executes the authoritative migration sequence against a PostgreSQL client.
 */
export async function executeMigrations({
  client,
  verifiedMigrations,
  isDryRun = false,
  logger = console,
}) {
  let lockAcquired = false;
  let appliedCount = 0;
  let adoptedCount = 0;
  let skippedCount = 0;

  try {
    // 1. Acquire exclusive distributed advisory lock
    logger.log(`[MigrationRunner] Acquiring exclusive advisory lock (${ADVISORY_LOCK_ID})...`);
    await client.query("SELECT pg_advisory_lock($1)", [ADVISORY_LOCK_ID]);
    lockAcquired = true;
    logger.log("[MigrationRunner] Advisory lock acquired.");

    // 2. Check if schema_migrations table exists (non-mutating for dry-run)
    const tableExistsRes = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'schema_migrations'
      ) as exists;
    `);
    const historyTableExists = Boolean(tableExistsRes.rows[0]?.exists);

    const appliedMap = new Map();

    if (historyTableExists) {
      const res = await client.query("SELECT id, checksum, applied_at FROM public.schema_migrations");
      for (const row of res.rows) {
        appliedMap.set(row.id, row);
      }
      logger.log(`[MigrationRunner] Found ${appliedMap.size} previously recorded migrations in schema_migrations.`);
    } else {
      logger.log("[MigrationRunner] schema_migrations table does not exist yet.");
      if (!isDryRun) {
        logger.log("[MigrationRunner] Creating public.schema_migrations tracking table...");
        await client.query(`
          CREATE TABLE public.schema_migrations (
            id VARCHAR(255) PRIMARY KEY,
            checksum VARCHAR(64) NOT NULL,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            duration_ms INT NOT NULL
          );
        `);
      }
    }

    // 3. Process migrations sequentially
    for (const m of verifiedMigrations) {
      if (appliedMap.has(m.id)) {
        const applied = appliedMap.get(m.id);
        if (applied.checksum !== m.checksum) {
          throw new Error(
            `FATAL CHECKSUM MISMATCH on already applied migration '${m.id}'! Database: ${applied.checksum}, File: ${m.checksum}. Manual reconciliation required.`
          );
        }
        skippedCount++;
        continue;
      }

      // Check for pre-existing baseline adoption (strictly verified per-migration)
      if (m.path.startsWith("azure-migration/") && BASELINE_SCHEMA_REQUIREMENTS[m.id]) {
        const inspection = await inspectMigrationArtifacts(client, m.id);

        if (inspection.status === "full") {
          // All required artifacts for this specific migration exist in database
          if (isDryRun) {
            logger.log(`  [DRY-RUN] Would adopt verified baseline migration: ${m.id}`);
            adoptedCount++;
            continue;
          } else {
            logger.log(`  [BASELINE ADOPTION] Adopting verified pre-existing baseline migration: ${m.id}`);
            await client.query(
              "INSERT INTO public.schema_migrations (id, checksum, applied_at, duration_ms) VALUES ($1, $2, NOW(), 0) ON CONFLICT (id) DO NOTHING",
              [m.id, m.checksum]
            );
            appliedMap.set(m.id, { id: m.id, checksum: m.checksum, applied_at: new Date() });
            adoptedCount++;
            continue;
          }
        } else if (inspection.status === "partial") {
          // Incompatible / partially initialized schema: stop immediately with actionable diagnostics
          const missingItems = JSON.stringify(inspection.details.missing);
          const foundItems = JSON.stringify(inspection.details.found);
          throw new Error(
            `INCOMPATIBLE SCHEMA DETECTED for baseline migration '${m.id}'. Database is partially initialized! Missing required objects: ${missingItems}, Found objects: ${foundItems}. Stop to prevent destructive replay.`
          );
        }
        // inspection.status === "none" -> Proceed to run migration DDL
      }

      // Fresh migration execution
      logger.log(`[MigrationRunner] Migration pending: ${m.id} (${m.path})...`);
      if (isDryRun) {
        logger.log(`  [DRY-RUN] Would execute ${m.path} (${m.checksum.slice(0, 12)}...)`);
        appliedCount++;
        continue;
      }

      // Single-owner transaction execution
      const startTime = Date.now();
      await client.query("BEGIN");
      try {
        await client.query(m.content);
        const duration = Date.now() - startTime;
        await client.query(
          "INSERT INTO public.schema_migrations (id, checksum, applied_at, duration_ms) VALUES ($1, $2, NOW(), $3)",
          [m.id, m.checksum, duration]
        );
        await client.query("COMMIT");
        logger.log(`  ✓ Successfully applied ${m.id} in ${duration}ms`);
        appliedCount++;
      } catch (err) {
        await client.query("ROLLBACK");
        logger.error(`[MigrationRunner] FAILED to apply ${m.id} — rolled back transaction:`, err.message);
        throw err;
      }
    }

    return {
      success: true,
      appliedCount,
      adoptedCount,
      skippedCount,
      totalCount: verifiedMigrations.length,
      isDryRun,
    };
  } finally {
    if (lockAcquired) {
      try {
        await client.query("SELECT pg_advisory_unlock($1)", [ADVISORY_LOCK_ID]);
        logger.log("[MigrationRunner] Advisory lock released.");
      } catch (unlockErr) {
        logger.warn("[MigrationRunner] Failed to release advisory lock:", unlockErr.message);
      }
    }
  }
}

#!/usr/bin/env node
// scripts/run_migrations.mjs
/**
 * WebsiteBanja Authoritative Database Migration CLI Entrypoint
 */

import path from "node:path";
import pg from "pg";
import {
  loadAndVerifyManifest,
  resolveDbConfig,
  executeMigrations,
} from "./migrationRunnerCore.mjs";

const { Client } = pg;

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run") || process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  const isValidateOnly = args.includes("--validate") || args.includes("--check");

  const manifestPath = path.resolve(process.cwd(), "migrations", "manifest.json");
  const { manifest, verifiedMigrations } = loadAndVerifyManifest(manifestPath);

  console.log(`[MigrationRunner] Loaded manifest version ${manifest.version} with ${manifest.migrations.length} migrations.`);
  console.log(`[MigrationRunner] All ${verifiedMigrations.length} migration files verified against manifest checksums.`);

  if (isValidateOnly) {
    console.log("[MigrationRunner] Validation-only mode completed successfully.");
    for (const vm of verifiedMigrations) {
      console.log(`  ✓ ${vm.id} (${vm.checksum.slice(0, 12)}...) -> ${vm.path}`);
    }
    return;
  }

  const dbConfig = resolveDbConfig();
  if (!dbConfig) {
    if (isDryRun) {
      console.log("[MigrationRunner] DRY-RUN (Offline): No database credentials configured. File validation passed.");
      for (const vm of verifiedMigrations) {
        console.log(`  [DRY-RUN Offline] Would apply ${vm.id} (${vm.checksum.slice(0, 12)}...)`);
      }
      return;
    }
    console.error("[MigrationRunner] FATAL: No database credentials configured. Set DATABASE_URL or AZURE_DB_USER + AZURE_DB_PASSWORD.");
    process.exit(1);
  }

  const client = new Client(dbConfig);

  try {
    const sanitizedHost = dbConfig.host || (dbConfig.connectionString ? new URL(dbConfig.connectionString).host : "configured-host");
    console.log(`[MigrationRunner] Connecting to database (${sanitizedHost})...`);
    await client.connect();
    console.log("[MigrationRunner] Connected successfully.");

    const result = await executeMigrations({
      client,
      verifiedMigrations,
      isDryRun,
      logger: console,
    });

    console.log(
      `[MigrationRunner] Migration process finished. ${result.isDryRun ? "DRY-RUN" : "APPLIED"}: ${result.appliedCount}, Adopted: ${result.adoptedCount}, Skipped: ${result.skippedCount}, Total: ${result.totalCount}`
    );
  } catch (err) {
    console.error("[MigrationRunner] Execution error:", err.message);
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

main().catch((err) => {
  console.error("[MigrationRunner] Fatal unhandled error:", err.message);
  process.exit(1);
});

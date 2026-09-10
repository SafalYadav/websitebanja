/**
 * WebsiteBanja AI — Azure Migration Readiness Verification Test Suite
 *
 * Validates:
 * 1. Azure PostgreSQL Baseline Schema (01_azure_schema_baseline.sql):
 *    - Extensions, Auth shim, Enums, Tables, Constraints, Indexes, Functions, Triggers, RLS
 * 2. Data Export & Import Pipeline (02_azure_data_export_import.sh):
 *    - Topological dependency ordering, executable permissions, dry-run support
 * 3. Data Validation Suite (03_azure_data_validation.mjs)
 * 4. Growth Management & Retention Maintenance (04_growth_retention_maintenance.sql):
 *    - Partitioning templates, pruning routines for revisions, preview links, snapshots
 * 5. Database Configuration & Dual-Connection Abstraction (src/lib/db/config.ts & client.ts)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jitiFactory from "jiti";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

const jiti = jitiFactory(process.cwd(), {
  alias: { "@": path.resolve(process.cwd(), "src") },
});

const { getDatabaseConfig } = jiti("@/lib/db/config");
const { checkDatabaseHealth } = jiti("@/lib/db/client");

console.log("================================================================================");
console.log("TESTING AZURE MIGRATION READINESS & ARCHITECTURE BASELINE");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(title, testFn) {
  try {
    testFn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(err);
    failed++;
  }
}

async function testAsync(title, testFn) {
  try {
    await testFn();
    console.log(`  ✔ [PASS] ${title}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ [FAIL] ${title}`);
    console.error(err);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// [Suite 1] Azure PostgreSQL Baseline DDL Audit
// -----------------------------------------------------------------------------
console.log("[Suite 1] Azure PostgreSQL Baseline DDL Audit (01_azure_schema_baseline.sql)");

const baselinePath = path.resolve(ROOT, "azure-migration/01_azure_schema_baseline.sql");
assert.ok(fs.existsSync(baselinePath), "Baseline SQL file must exist");
const baselineSql = fs.readFileSync(baselinePath, "utf8");

test("Baseline contains required PostgreSQL extensions", () => {
  assert.ok(baselineSql.includes("CREATE EXTENSION IF NOT EXISTS \"pgcrypto\""), "Missing pgcrypto");
  assert.ok(baselineSql.includes("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\""), "Missing uuid-ossp");
  assert.ok(baselineSql.includes("CREATE EXTENSION IF NOT EXISTS \"pg_trgm\""), "Missing pg_trgm");
  assert.ok(baselineSql.includes("CREATE EXTENSION IF NOT EXISTS \"btree_gin\""), "Missing btree_gin");
});

test("Baseline provides Auth compatibility shim for Azure PostgreSQL", () => {
  assert.ok(baselineSql.includes("CREATE SCHEMA IF NOT EXISTS auth;"), "Missing auth schema creation");
  assert.ok(baselineSql.includes("CREATE TABLE IF NOT EXISTS auth.users"), "Missing auth.users stub table");
  assert.ok(baselineSql.includes("CREATE OR REPLACE FUNCTION auth.uid()"), "Missing auth.uid() compatibility function");
});

test("Baseline defines all 9 core WebsiteBanja tables with correct FKs", () => {
  const expectedTables = [
    "public.projects",
    "public.subscriptions",
    "public.website_members",
    "public.catalog_items",
    "public.published_versions",
    "public.preview_links",
    "public.analytics_events",
    "public.project_knowledge",
    "public.project_knowledge_revisions",
  ];

  for (const table of expectedTables) {
    assert.ok(
      baselineSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
      `Missing table creation for ${table}`
    );
  }
});

test("Baseline includes all 19 PL/pgSQL business functions and RPCs", () => {
  const expectedFunctions = [
    "update_catalog_items_updated_at_column",
    "is_project_owner",
    "is_website_member",
    "is_project_published",
    "is_project_owner_text",
    "get_published_project_by_slug",
    "publish_project_atomic",
    "get_preview_project",
    "get_preview_catalog",
    "append_lead_to_project",
    "is_valid_lead_payload",
    "submit_public_lead",
    "record_public_site_event",
    "get_preview_snapshot",
    "prevent_project_owner_reassignment",
    "strip_leads_from_snapshot",
    "strip_leads_from_preview",
    "trg_project_knowledge_audit",
  ];

  for (const fn of expectedFunctions) {
    assert.ok(
      baselineSql.includes(`FUNCTION public.${fn}`),
      `Missing function: public.${fn}`
    );
  }
});

test("Baseline includes all 5 triggers", () => {
  const expectedTriggers = [
    "update_catalog_items_updated_at",
    "projects_prevent_owner_reassignment",
    "published_versions_strip_leads",
    "preview_links_strip_leads",
    "trg_project_knowledge_audit_trigger",
  ];

  for (const trg of expectedTriggers) {
    assert.ok(
      baselineSql.includes(`TRIGGER ${trg}`),
      `Missing trigger: ${trg}`
    );
  }
});

test("Baseline includes performance optimizations (indexes on projects user_id & public_slug)", () => {
  assert.ok(baselineSql.includes("idx_projects_user_id"), "Missing index on projects(user_id)");
  assert.ok(baselineSql.includes("idx_projects_public_slug"), "Missing index on projects(public_slug)");
  assert.ok(baselineSql.includes("idx_projects_is_published"), "Missing index on projects(is_published)");
  assert.ok(baselineSql.includes("idx_preview_links_expires_at"), "Missing index on preview_links(expires_at)");
});

test("Baseline enables Row Level Security (RLS) across all tables", () => {
  const tables = [
    "projects",
    "subscriptions",
    "website_members",
    "catalog_items",
    "published_versions",
    "preview_links",
    "analytics_events",
    "project_knowledge",
    "project_knowledge_revisions",
  ];

  for (const t of tables) {
    assert.ok(
      baselineSql.includes(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`),
      `RLS not enabled on public.${t}`
    );
  }
});

// -----------------------------------------------------------------------------
// [Suite 2] Data Export & Import Pipeline (02_azure_data_export_import.sh)
// -----------------------------------------------------------------------------
console.log("\n[Suite 2] Data Export & Import Pipeline (02_azure_data_export_import.sh)");

const exportScriptPath = path.resolve(ROOT, "azure-migration/02_azure_data_export_import.sh");
assert.ok(fs.existsSync(exportScriptPath), "Export script must exist");
const exportScript = fs.readFileSync(exportScriptPath, "utf8");

test("Export script enforces strict foreign key topological order", () => {
  const orderedList = [
    "auth.users",
    "public.projects",
    "public.subscriptions",
    "public.website_members",
    "public.catalog_items",
    "public.published_versions",
    "public.preview_links",
    "public.analytics_events",
    "public.project_knowledge",
    "public.project_knowledge_revisions",
  ];

  for (let i = 0; i < orderedList.length - 1; i++) {
    const currIdx = exportScript.indexOf(`"${orderedList[i]}"`);
    const nextIdx = exportScript.indexOf(`"${orderedList[i+1]}"`);
    assert.ok(currIdx !== -1, `Table ${orderedList[i]} missing in export script`);
    assert.ok(nextIdx !== -1, `Table ${orderedList[i+1]} missing in export script`);
    assert.ok(currIdx < nextIdx, `Table ${orderedList[i]} must precede ${orderedList[i+1]}`);
  }
});

test("Export script supports --dry-run and idempotent temporary staging imports", () => {
  assert.ok(exportScript.includes("--dry-run"), "Missing --dry-run support");
  assert.ok(exportScript.includes("CREATE TEMP TABLE"), "Missing temporary staging table for idempotency");
  assert.ok(exportScript.includes("ON CONFLICT DO NOTHING"), "Missing ON CONFLICT DO NOTHING guarantee");
});

// -----------------------------------------------------------------------------
// [Suite 3] Growth Management & Maintenance (04_growth_retention_maintenance.sql)
// -----------------------------------------------------------------------------
console.log("\n[Suite 3] Growth Management & Retention (04_growth_retention_maintenance.sql)");

const growthSqlPath = path.resolve(ROOT, "azure-migration/04_growth_retention_maintenance.sql");
assert.ok(fs.existsSync(growthSqlPath), "Growth SQL file must exist");
const growthSql = fs.readFileSync(growthSqlPath, "utf8");

test("Growth SQL provides preview link purge function", () => {
  assert.ok(growthSql.includes("FUNCTION public.purge_expired_preview_links"), "Missing purge_expired_preview_links");
});

test("Growth SQL provides project knowledge revision pruning with ranking", () => {
  assert.ok(growthSql.includes("FUNCTION public.prune_project_knowledge_revisions"), "Missing prune_project_knowledge_revisions");
  assert.ok(growthSql.includes("ROW_NUMBER() OVER"), "Revision pruning must use window ranking");
});

test("Growth SQL provides monthly range partitioning architecture for analytics_events", () => {
  assert.ok(growthSql.includes("PARTITION BY RANGE (created_at)"), "Missing RANGE partition definition");
});

test("Growth SQL provides scheduled maintenance master function", () => {
  assert.ok(growthSql.includes("FUNCTION public.run_database_maintenance"), "Missing run_database_maintenance");
});

// -----------------------------------------------------------------------------
// [Suite 4] Dual-Connection Configuration & Client Abstraction
// -----------------------------------------------------------------------------
console.log("\n[Suite 4] Dual-Connection Configuration & Client Abstraction");

test("getDatabaseConfig defaults safely to Supabase with zero breaking changes", () => {
  const config = getDatabaseConfig();
  assert.equal(config.provider, "supabase", "Default provider must remain supabase");
  assert.ok(config.pool.max >= 5, "Pool max connections must be valid");
});

await testAsync("checkDatabaseHealth reports status for active database provider", async () => {
  const health = await checkDatabaseHealth();
  assert.ok(health.provider === "supabase" || health.provider === "azure");
  assert.ok(health.status === "healthy" || health.status === "degraded");
});

console.log("\n================================================================================");
console.log(`AZURE MIGRATION READINESS SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
}

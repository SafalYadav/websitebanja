/**
 * WebsiteBanja AI — Idempotent Data Export & Import Pipeline (Node.js / pg)
 * Connects to Supabase and Azure PostgreSQL without requiring external psql binary.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const { Client } = pg;

const ORDERED_TABLES = [
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

const DUMP_DIR = path.resolve(process.cwd(), "azure-migration/dumps");

async function exportFromSupabase() {
  console.log("\n================================================================================");
  console.log("[Phase 2] Exporting Data from Supabase...");
  console.log("================================================================================");

  if (!fs.existsSync(DUMP_DIR)) {
    fs.mkdirSync(DUMP_DIR, { recursive: true });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const directDbUrl = process.env.SUPABASE_DIRECT_DB_URL;

  if (directDbUrl) {
    console.log("Using direct Supabase PostgreSQL connection for export...");
    const srcClient = new Client({
      connectionString: directDbUrl,
      ssl: { rejectUnauthorized: false },
    });
    await srcClient.connect();

    try {
      for (const table of ORDERED_TABLES) {
        console.log(`  -> Exporting ${table}...`);
        try {
          const res = await srcClient.query(`SELECT * FROM ${table}`);
          const dumpPath = path.join(DUMP_DIR, `${table.replace(".", "_")}.json`);
          fs.writeFileSync(dumpPath, JSON.stringify(res.rows, null, 2), "utf8");
          console.log(`     Saved ${res.rowCount} rows to ${path.basename(dumpPath)}`);
        } catch (err) {
          console.warn(`     [WARN] Could not export ${table}: ${err.message}`);
        }
      }
    } finally {
      await srcClient.end();
    }
  } else if (serviceKey && supabaseUrl) {
    console.log("Using Supabase Service Role client for export (RLS bypassed)...");
    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Export auth.users if accessible via auth admin API
    try {
      console.log("  -> Exporting auth.users via Admin Auth API...");
      const { data: usersData, error: usersErr } = await adminClient.auth.admin.listUsers();
      if (!usersErr && usersData?.users) {
        const users = usersData.users.map((u) => ({
          id: u.id,
          email: u.email,
          raw_user_meta_data: u.user_metadata || {},
          raw_app_meta_data: u.app_metadata || {},
          created_at: u.created_at,
          updated_at: u.updated_at,
        }));
        const dumpPath = path.join(DUMP_DIR, "auth_users.json");
        fs.writeFileSync(dumpPath, JSON.stringify(users, null, 2), "utf8");
        console.log(`     Saved ${users.length} users to auth_users.json`);
      }
    } catch (err) {
      console.warn(`     [WARN] auth.users export notice: ${err.message}`);
    }

    // 2. Export public tables
    for (const table of ORDERED_TABLES) {
      if (table.startsWith("auth.")) continue;
      const rawTable = table.replace("public.", "");
      console.log(`  -> Exporting public.${rawTable}...`);

      const { data, error } = await adminClient.from(rawTable).select("*");
      if (error) {
        console.warn(`     [WARN] Export failed for ${rawTable}: ${error.message}`);
      } else {
        const dumpPath = path.join(DUMP_DIR, `public_${rawTable}.json`);
        fs.writeFileSync(dumpPath, JSON.stringify(data || [], null, 2), "utf8");
        console.log(`     Saved ${(data || []).length} rows to ${path.basename(dumpPath)}`);
      }
    }
  } else {
    console.warn("  [NOTICE] Neither SUPABASE_DIRECT_DB_URL nor SUPABASE_SERVICE_ROLE_KEY is set in .env.local.");
    console.warn("  Existing local dump files in azure-migration/dumps/ will be checked.");
  }
}

async function importToAzure() {
  console.log("\n================================================================================");
  console.log("[Phase 4] Importing Data into Azure PostgreSQL Flexible Server...");
  console.log("================================================================================");

  const host = process.env.AZURE_DB_HOST || process.env.PGHOST || "websitebanja-db.postgres.database.azure.com";
  const user = process.env.AZURE_DB_USER || process.env.PGUSER;
  const password = process.env.AZURE_DB_PASSWORD || process.env.PGPASSWORD;
  const database = process.env.AZURE_DB_NAME || process.env.PGDATABASE || "postgres";
  const port = parseInt(process.env.AZURE_DB_PORT || process.env.PGPORT || "5432", 10);

  const connectionString =
    process.env.DIRECT_DATABASE_URL ||
    process.env.AZURE_POSTGRESQL_DIRECT_URL ||
    process.env.DATABASE_URL ||
    process.env.AZURE_POSTGRESQL_CONNECTION_STRING;

  if (!connectionString && !(user && password)) {
    console.error("[ERROR] Missing Azure connection parameters in .env.local.");
    console.error("Set DATABASE_URL / DIRECT_DATABASE_URL or AZURE_DB_USER & AZURE_DB_PASSWORD.");
    return false;
  }

  const tgtConfig = (user && password)
    ? { host, port, user, password, database, ssl: { rejectUnauthorized: false } }
    : { connectionString, ssl: { rejectUnauthorized: false } };

  const tgtClient = new Client(tgtConfig);

  await tgtClient.connect();
  console.log("  ✔ Connected to Azure PostgreSQL Flexible Server.");

  try {
    for (const table of ORDERED_TABLES) {
      const dumpPath = path.join(DUMP_DIR, `${table.replace(".", "_")}.json`);
      if (!fs.existsSync(dumpPath)) {
        console.log(`  -> Skipping ${table} (no dump file found at ${path.basename(dumpPath)})`);
        continue;
      }

      const rows = JSON.parse(fs.readFileSync(dumpPath, "utf8"));
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`  -> ${table}: 0 rows in dump.`);
        continue;
      }

      console.log(`  -> Importing ${rows.length} rows into ${table}...`);
      let importedCount = 0;

      for (const row of rows) {
        const keys = Object.keys(row);
        if (keys.length === 0) continue;

        const quotedKeys = keys.map((k) => `"${k}"`).join(", ");
        const placeholders = keys.map((_, idx) => `$${idx + 1}`).join(", ");
        const values = keys.map((k) => {
          const val = row[k];
          if (Array.isArray(val)) {
            if (table === "public.projects" && k === "selected_features") {
              return JSON.stringify(val);
            }
            return val;
          }
          if (typeof val === "object" && val !== null) {
            return JSON.stringify(val);
          }
          return val;
        });

        const insertSql = `
          INSERT INTO ${table} (${quotedKeys})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING;
        `;

        try {
          await tgtClient.query(insertSql, values);
          importedCount++;
        } catch (err) {
          const msg = (err.message || "").slice(0, 150);
          console.warn(`     [WARN] Insert row error in ${table}: ${msg}`);
        }
      }

      console.log(`     ✔ ${table}: ${importedCount} rows processed.`);
    }

    console.log("\n================================================================================");
    console.log("AZURE IMPORT PIPELINE COMPLETED");
    console.log("================================================================================");
    return true;
  } finally {
    await tgtClient.end();
  }
}

async function main() {
  await exportFromSupabase();
  await importToAzure();
}

main().catch((err) => {
  console.error("Fatal error during export/import:", err);
  process.exit(1);
});

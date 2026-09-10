/**
 * WebsiteBanja AI — Azure PostgreSQL Schema Provisioner (Node.js / pg)
 * Executes 01_azure_schema_baseline.sql against Azure Database for PostgreSQL Flexible Server.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const { Client } = pg;

async function run() {
  console.log("================================================================================");
  console.log("WEBSITEBANJA AI — AZURE POSTGRESQL SCHEMA BASELINE APPLY");
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
    console.error("\n[ERROR] Missing Azure PostgreSQL connection parameters.");
    console.error("Please configure DATABASE_URL / DIRECT_DATABASE_URL or AZURE_DB_USER & AZURE_DB_PASSWORD in .env.local.");
    process.exit(1);
  }

  const schemaFile = path.resolve(process.cwd(), "azure-migration/01_azure_schema_baseline.sql");
  if (!fs.existsSync(schemaFile)) {
    console.error(`\n[ERROR] Schema baseline file not found: ${schemaFile}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(schemaFile, "utf8");
  console.log(`\nLoaded baseline schema: ${sqlContent.length} bytes from ${path.basename(schemaFile)}`);

  console.log("\nConnecting to Azure PostgreSQL Flexible Server...");
  const clientConfig = (user && password)
    ? {
        host,
        port,
        user,
        password,
        database,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      }
    : {
        connectionString,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      };

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log("  ✔ Successfully connected to Azure PostgreSQL Flexible Server.");

    const versionRes = await client.query("SELECT version();");
    console.log(`  Server version: ${versionRes.rows[0].version}`);

    console.log("\nApplying baseline schema (extensions, auth shim, tables, functions, triggers, RLS)...");
    const startTime = Date.now();
    await client.query(sqlContent);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`  ✔ Schema baseline applied successfully in ${duration}s.`);

    // Verify created objects
    const tablesRes = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('public', 'auth') 
      ORDER BY table_schema, table_name;
    `);

    console.log("\nCreated / Verified Tables:");
    for (const row of tablesRes.rows) {
      console.log(`  - ${row.table_schema}.${row.table_name}`);
    }

    const functionsRes = await client.query(`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
      ORDER BY routine_name;
    `);

    console.log(`\nVerified ${functionsRes.rowCount} business functions in public schema.`);
    console.log("\n================================================================================");
    console.log("SCHEMA BASELINE EXECUTION COMPLETED WITH 0 ERRORS");
    console.log("================================================================================");
  } catch (err) {
    console.error("\n[EXECUTION ERROR]:", err.message);
    if (err.detail) console.error("Detail:", err.detail);
    if (err.hint) console.error("Hint:", err.hint);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

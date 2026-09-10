// src/lib/auth/identityMap.ts

import { getDatabaseConfig } from "@/lib/db/config";

/**
 * Immutable canonical UUID mapping for the 7 historical users migrated from Supabase.
 * Ensures foreign keys in projects, catalog_items, and published_versions remain 100% intact.
 */
export const HISTORICAL_USER_MAP: Record<string, string> = {
  "safalyadav0001@gmail.com": "cceafe47-a710-49e9-a894-16f592dc8e64",
  "safalyadav07@gmail.com": "d1df43b9-cdec-4e9a-916a-4c1f8009d238",
  "safalyadavvv@gmail.com": "badf862a-79c0-463d-95ff-55a02e6aa88b",
  "websitebanja@gmail.com": "a0d29ad3-4c93-4bcd-a4d0-b45804017cf2",
  "papu.lite1234@gmail.com": "8a37f5ba-33e0-45ae-9d14-f4572c81d19c",
  "kushchaudhari48@gnail.com": "1f99ae97-6312-49ff-bf33-b4fe1a7851bc",
  "websitebanja.test.1788794630123@gmail.com": "965c23ea-081c-404a-a99e-6256bd3a0a59",
};

/**
 * Resolves a user's persistent PostgreSQL UUID from their verified email.
 * 1. Checks fast in-memory historical mapping.
 * 2. If not found, looks up Azure PostgreSQL auth.users.
 * 3. If absent (newly registered user), idempotently provisions a new record in auth.users.
 */
export async function resolveUserUuid(
  email: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const normalized = email.toLowerCase().trim();

  // 1. Fast in-memory resolution for the 7 historical users
  if (HISTORICAL_USER_MAP[normalized]) {
    return HISTORICAL_USER_MAP[normalized];
  }

  // 2. Query Azure PostgreSQL auth.users
  const dbConfig = getDatabaseConfig();
  if (!dbConfig.databaseUrl && !dbConfig.connectionParams) {
    throw new Error("Cannot resolve user UUID: Database not configured.");
  }

  const { Pool } = await import("pg");
  const pool = new Pool(
    dbConfig.connectionParams
      ? { ...dbConfig.connectionParams, ssl: dbConfig.ssl }
      : { connectionString: dbConfig.databaseUrl!, ssl: dbConfig.ssl }
  );

  try {
    const existing = await pool.query(
      "SELECT id FROM auth.users WHERE lower(email) = $1 LIMIT 1;",
      [normalized]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0].id;
    }

    // 3. Provision new user record in auth.users
    const insertRes = await pool.query(
      `INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
       VALUES (gen_random_uuid(), $1, $2, $3)
       ON CONFLICT (email) DO UPDATE SET updated_at = now()
       RETURNING id;`,
      [
        normalized,
        JSON.stringify(metadata || {}),
        JSON.stringify({ provider: "azure_entra", providers: ["azure_entra"] }),
      ]
    );

    return insertRes.rows[0].id;
  } finally {
    await pool.end();
  }
}

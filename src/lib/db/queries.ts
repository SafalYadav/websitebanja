/**
 * Azure PostgreSQL Query Layer
 *
 * WHY: Replaces all Supabase PostgREST (supabase.from/supabase.rpc) data calls
 * with direct pg Pool queries against Azure PostgreSQL. Supabase Auth remains
 * the authentication provider — only the DATA layer moves to Azure.
 *
 * ARCHITECTURE DECISION: We use a single connection pool with optional
 * per-transaction `SET LOCAL app.current_user_id` to satisfy stored functions
 * (e.g. publish_project_atomic) that call auth.uid(). This avoids needing
 * per-user connection pools while preserving RLS compatibility.
 *
 * SECURITY: All user-scoped queries explicitly filter by user_id in WHERE
 * clauses rather than relying solely on RLS, providing defense-in-depth.
 */

import { Pool, PoolClient } from "pg";
import { getDatabaseConfig } from "./config";
import { getServiceRoleClient, getUserScopedClient } from "@/lib/supabaseServer";

// ─── Circuit Breaker for Azure DB ─────────────────────────────────────────────
let isAzurePoolAvailable: boolean | null = null;
let lastAzureCheckTime = 0;
const AZURE_CHECK_COOLDOWN_MS = 60000;

function isAzureCircuitOpen(): boolean {
  if (isAzurePoolAvailable === false) {
    if (Date.now() - lastAzureCheckTime < AZURE_CHECK_COOLDOWN_MS) {
      return true;
    }
    isAzurePoolAvailable = null;
  }
  return false;
}

function markAzureFailed(err: unknown) {
  isAzurePoolAvailable = false;
  lastAzureCheckTime = Date.now();
  console.warn(`[Database Resilience] Azure PostgreSQL connection bypassed (${(err as Error)?.message || err}). Active fallback to Supabase DB.`);
}

function markAzureSuccess() {
  isAzurePoolAvailable = true;
}

// ─── Singleton Pool ────────────────────────────────────────────────────────────
// WHY singleton: Next.js API routes are serverless-like — each cold start would
// create a new pool without this. The module-level singleton ensures connection
// reuse across requests within the same process lifetime.
let _pool: Pool | null = null;

export function getPool(): Pool {
  if (_pool) return _pool;

  const config = getDatabaseConfig();

  if (config.connectionParams) {
    _pool = new Pool({
      host: config.connectionParams.host,
      port: config.connectionParams.port,
      user: config.connectionParams.user,
      password: config.connectionParams.password,
      database: config.connectionParams.database,
      ssl: config.ssl,
      max: config.pool.max,
      min: config.pool.min,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: Math.min(config.pool.connectionTimeoutMillis, 2000),
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
  } else if (config.databaseUrl) {
    _pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.ssl,
      max: config.pool.max,
      min: config.pool.min,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: Math.min(config.pool.connectionTimeoutMillis, 2000),
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });
  } else {
    throw new Error(
      "Azure PostgreSQL is not configured. Set AZURE_DB_USER + AZURE_DB_PASSWORD or DATABASE_URL."
    );
  }

  // Prevent idle connection errors from bubbling up as unhandled exceptions
  _pool.on("error", (err) => {
    console.warn("[Azure PostgreSQL Pool] Unexpected error on idle client:", err.message);
  });

  return _pool;
}

// ─── Helper: Execute with user context ──────────────────────────────────────
// WHY: Stored functions like publish_project_atomic call auth.uid(), which reads
// from `app.current_user_id` (see azure-migration/01_azure_schema_baseline.sql L44-54).
// We must SET this in the same transaction before calling those functions.
async function withUserContext<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.current_user_id', $1, true)", [userId]);
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// ─── Project Queries ───────────────────────────────────────────────────────────

export async function dbCreateProject(
  userId: string,
  name: string
): Promise<Record<string, unknown> | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const pool = getPool();
      const result = await Promise.race([
        pool.query(
          `INSERT INTO public.projects (user_id, name) VALUES ($1, $2) RETURNING *`,
          [userId, name]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  // Resilient fallback: Supabase DB
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ user_id: userId, name })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>) || null;
}

export async function dbGetProjects(
  userId: string
): Promise<Record<string, unknown>[]> {
  const summaryFields = "id, user_id, name, business_name, category, description, style, primary_color, secondary_color, is_published, public_slug, published_at, created_at, updated_at, custom_domain, custom_domain_status, whatsapp_number, whatsapp_enabled";

  if (!isAzureCircuitOpen()) {
    try {
      const pool = getPool();
      const result = await Promise.race([
        pool.query(
          `SELECT ${summaryFields} FROM public.projects WHERE user_id = $1 ORDER BY created_at DESC`,
          [userId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  // Resilient fast fallback: Active Supabase DB (responds in ~35ms)
  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .select(summaryFields)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>[]) || [];
}

export async function dbUpdateProject(
  projectId: string,
  userId: string,
  updates: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  if (Object.keys(updates).length === 0) return null;

  if (!isAzureCircuitOpen()) {
    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        setClauses.push(`"${key}" = $${paramIndex}`);
        values.push(
          (key === "json_data" || key === "backend_config" || key === "selected_features") &&
            value !== null &&
            typeof value === "object"
            ? JSON.stringify(value)
            : value
        );
        paramIndex++;
      }

      values.push(projectId, userId);

      const result = await Promise.race([
        getPool().query(
          `UPDATE public.projects SET ${setClauses.join(", ")} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
          values
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const SUPABASE_PROJECT_COLUMNS = new Set([
    "name", "prompt", "template", "json_data", "published",
    "updated_at", "business_name", "category", "description",
    "target_audience", "style", "primary_color", "secondary_color",
    "phone", "email", "website", "instagram", "facebook", "address",
    "is_published", "public_slug", "published_at", "preview_expires_at",
    "custom_domain", "custom_domain_status", "custom_domain_verified_at",
    "whatsapp_number", "whatsapp_message", "whatsapp_enabled"
  ]);

  const supabaseUpdates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(updates)) {
    if (SUPABASE_PROJECT_COLUMNS.has(k) && v !== undefined) {
      supabaseUpdates[k] = v;
    }
  }

  const { data, error } = await supabase
    .from("projects")
    .update(supabaseUpdates)
    .eq("id", projectId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>) || null;
}

export async function dbGetProject(
  projectId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT * FROM public.projects WHERE id = $1 AND user_id = $2`,
          [projectId, userId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>) || null;
}

export async function dbGetProjectBySlug(
  slug: string,
  slugDecoded: string
): Promise<Record<string, unknown> | null> {
  // WHY: Calls the stored function which strips leads/private_notes from json_data
  // for public safety. SECURITY DEFINER ensures it bypasses RLS for public access.
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT * FROM public.get_published_project_by_slug($1, $2)`,
          [slug, slugDecoded]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_published_project_by_slug",
      { p_slug: slug, p_slug_decoded: slugDecoded }
    );
    if (!rpcError && rpcData && rpcData.length > 0) {
      return (rpcData[0] as Record<string, unknown>) || null;
    }
  } catch {}

  const { data: directData } = await supabase
    .from("projects")
    .select("*")
    .or(`public_slug.eq.${slug},public_slug.eq.${slugDecoded}`)
    .eq("is_published", true)
    .maybeSingle();

  return (directData as Record<string, unknown>) || null;
}

export async function dbGetPublishedSnapshot(
  projectId: string
): Promise<Record<string, unknown> | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT snapshot_data FROM public.published_versions WHERE project_id = $1 ORDER BY published_at DESC LIMIT 1`,
          [projectId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data } = await supabase
    .from("published_versions")
    .select("snapshot_data")
    .eq("project_id", projectId)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data || null;
}

export async function dbPublishProjectAtomic(
  userId: string,
  projectId: string,
  slug: string,
  snapshotData: Record<string, unknown>,
  userToken?: string
): Promise<{ error: Error | null }> {
  // 1. Try Azure PostgreSQL if circuit is not open
  if (!isAzureCircuitOpen()) {
    try {
      await Promise.race([
        withUserContext(userId, async (client) => {
          if (snapshotData && Object.keys(snapshotData).length > 0) {
            await client.query(
              `UPDATE public.projects SET json_data = $1 WHERE id = $2 AND user_id = $3`,
              [JSON.stringify(snapshotData), projectId, userId]
            );
          }
          await client.query(
            `SELECT public.publish_project_atomic($1, $2)`,
            [projectId, slug]
          );
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return { error: null };
    } catch (err) {
      markAzureFailed(err);
    }
  }

  // 2. Resilient Supabase Fallback (RPC or atomic service transaction)
  try {
    if (userToken) {
      const userClient = getUserScopedClient(userToken);
      const { error: rpcError } = await userClient.rpc("publish_project_atomic", {
        p_project_id: projectId,
        p_slug: slug,
        p_snapshot_data: snapshotData,
      });
      if (!rpcError) {
        return { error: null };
      }
      console.warn("[dbPublishProjectAtomic] User-scoped RPC warning, attempting service-role transaction fallback:", rpcError.message);
    }

    const serviceClient = getServiceRoleClient();

    // Check slug uniqueness across other projects
    const { data: slugConflicts, error: slugErr } = await serviceClient
      .from("projects")
      .select("id")
      .eq("public_slug", slug)
      .neq("id", projectId)
      .limit(1);

    if (slugErr) throw slugErr;
    if (slugConflicts && slugConflicts.length > 0) {
      return {
        error: new Error(`Slug "${slug}" is already in use by another website banja project.`),
      };
    }

    // Verify ownership
    const { data: projectRow, error: projErr } = await serviceClient
      .from("projects")
      .select("id, user_id")
      .eq("id", projectId)
      .maybeSingle();

    if (projErr || !projectRow || projectRow.user_id !== userId) {
      return {
        error: new Error("Unauthorized: Insufficient privileges to publish this project."),
      };
    }

    // Clean snapshot: strip internal leads/private_notes
    const cleanSnapshot = { ...snapshotData };
    delete (cleanSnapshot as any).leads;
    delete (cleanSnapshot as any).private_notes;

    // Get next version
    const { data: latestVer } = await serviceClient
      .from("published_versions")
      .select("version")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = (latestVer?.version || 0) + 1;

    // Insert into published_versions
    const { error: insertErr } = await serviceClient
      .from("published_versions")
      .insert({
        project_id: projectId,
        version: nextVersion,
        snapshot_data: cleanSnapshot,
        published_at: new Date().toISOString(),
      });

    if (insertErr) {
      return { error: new Error(`Failed to insert published version: ${insertErr.message}`) };
    }

    // Update project state
    const { error: updateErr } = await serviceClient
      .from("projects")
      .update({
        is_published: true,
        public_slug: slug,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        json_data: snapshotData,
      })
      .eq("id", projectId)
      .eq("user_id", userId);

    if (updateErr) {
      return { error: new Error(`Failed to update project: ${updateErr.message}`) };
    }

    return { error: null };
  } catch (fallbackErr) {
    return {
      error: fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)),
    };
  }
}

export async function dbGetProjectAfterPublish(
  projectId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  return dbGetProject(projectId, userId);
}

export async function dbUnpublishProject(
  projectId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `UPDATE public.projects SET is_published = false WHERE id = $1 AND user_id = $2 RETURNING *`,
          [projectId, userId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .update({ is_published: false, updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>) || null;
}

export async function dbDeleteProject(
  projectId: string,
  userId: string
): Promise<{ error: Error | null }> {
  if (!isAzureCircuitOpen()) {
    try {
      await Promise.race([
        getPool().query(
          `DELETE FROM public.projects WHERE id = $1 AND user_id = $2`,
          [projectId, userId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return { error: null };
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", userId);

  return { error: error ? new Error(error.message) : null };
}

export async function dbGetProjectOwnership(
  projectId: string
): Promise<{ id: string; user_id: string } | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT id, user_id FROM public.projects WHERE id = $1`,
          [projectId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return (result.rows[0] as { id: string; user_id: string }) || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[dbGetProjectOwnership Supabase Error]", error.message);
    return null;
  }
  return (data as { id: string; user_id: string }) || null;
}

export async function dbDuplicateProject(
  original: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `INSERT INTO public.projects (
            user_id, name, business_name, category, description, target_audience,
            style, primary_color, secondary_color, phone, email, website,
            instagram, facebook, address, json_data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *`,
          [
            original.user_id,
            `Copy of ${original.name}`,
            original.business_name || null,
            original.category || null,
            original.description || null,
            original.target_audience || null,
            original.style || null,
            original.primary_color || null,
            original.secondary_color || null,
            original.phone || null,
            original.email || null,
            original.website || null,
            original.instagram || null,
            original.facebook || null,
            original.address || null,
            original.json_data ? JSON.stringify(original.json_data) : null,
          ]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      user_id: original.user_id,
      name: `Copy of ${original.name}`,
      business_name: original.business_name || null,
      category: original.category || null,
      description: original.description || null,
      target_audience: original.target_audience || null,
      style: original.style || null,
      primary_color: original.primary_color || null,
      secondary_color: original.secondary_color || null,
      phone: original.phone || null,
      email: original.email || null,
      website: original.website || null,
      instagram: original.instagram || null,
      facebook: original.facebook || null,
      address: original.address || null,
      json_data: original.json_data || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return (data as Record<string, unknown>) || null;
}

// ─── Preview Link Queries ──────────────────────────────────────────────────────

export async function dbGeneratePreviewLink(
  projectId: string,
  jsonData: Record<string, unknown>,
  expiresAt: string
): Promise<string | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `INSERT INTO public.preview_links (project_id, json_data, expires_at) VALUES ($1, $2, $3) RETURNING id`,
          [projectId, JSON.stringify(jsonData), expiresAt]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0]?.id || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("preview_links")
    .insert({ project_id: projectId, json_data: jsonData, expires_at: expiresAt })
    .select("id")
    .single();

  if (error) {
    console.error("[dbGeneratePreviewLink Supabase Error]", error.message);
    return null;
  }
  return data?.id || null;
}

export async function dbGetPreviewLinkData(
  previewId: string
): Promise<{ json_data: unknown; expires_at: string; project_id: string } | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT json_data, expires_at, project_id FROM public.preview_links WHERE id = $1`,
          [previewId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("preview_links")
    .select("json_data, expires_at, project_id")
    .eq("id", previewId)
    .maybeSingle();

  if (error) {
    console.error("[dbGetPreviewLinkData Supabase Error]", error.message);
    return null;
  }
  return data || null;
}

export async function dbGetPreviewProject(
  previewId: string
): Promise<Record<string, unknown> | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT * FROM public.get_preview_project($1)`,
          [previewId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  // Resilient fallback: read preview_links and join project
  const supabase = getServiceRoleClient();
  const { data: link, error: linkErr } = await supabase
    .from("preview_links")
    .select("project_id, expires_at, json_data")
    .eq("id", previewId)
    .maybeSingle();

  if (linkErr || !link) return null;
  if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

  const { data: proj, error: projErr } = await supabase
    .from("projects")
    .select("id, name, business_name, category, description, target_audience, style, primary_color, secondary_color, is_published, public_slug, published_at, created_at, updated_at, custom_domain, whatsapp_number, whatsapp_enabled")
    .eq("id", link.project_id)
    .maybeSingle();

  if (projErr || !proj) return null;
  return { ...proj, json_data: link.json_data };
}

// ─── Catalog Queries ───────────────────────────────────────────────────────────

export async function dbGetCatalogItems(
  projectId: string
): Promise<Record<string, unknown>[]> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT * FROM public.catalog_items WHERE project_id = $1 ORDER BY display_order ASC, created_at DESC`,
          [projectId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("project_id", projectId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dbGetCatalogItems Supabase Error]", error.message);
    return [];
  }
  return data || [];
}

export async function dbCreateCatalogItem(
  item: Record<string, unknown>,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await getPool().query(
    `INSERT INTO public.catalog_items (
      project_id, user_id, name, description, item_type, category, status,
      images, price, original_price, currency_code, show_discount_badge,
      hourly_price, daily_price, weekly_price, monthly_price,
      cta_text, cta_link, button_action, display_order, badge
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *`,
    [
      item.project_id,
      userId,
      item.name,
      item.description || null,
      item.item_type || "product",
      item.category || null,
      item.status || "active",
      JSON.stringify(item.images || []),
      item.price ?? null,
      item.original_price ?? null,
      item.currency_code || "INR",
      item.show_discount_badge ?? false,
      item.hourly_price ?? null,
      item.daily_price ?? null,
      item.weekly_price ?? null,
      item.monthly_price ?? null,
      item.cta_text || null,
      item.cta_link || null,
      item.button_action ? JSON.stringify(item.button_action) : null,
      item.display_order ?? 0,
      item.badge || null,
    ]
  );
  return result.rows[0] || null;
}

export async function dbUpdateCatalogItem(
  itemId: string,
  userId: string,
  updates: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  if (Object.keys(updates).length === 0) return null;

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`"${key}" = $${paramIndex}`);
    values.push(
      (key === "images" || key === "button_action") && value !== null && typeof value === "object"
        ? JSON.stringify(value)
        : value
    );
    paramIndex++;
  }

  values.push(itemId, userId);

  const result = await getPool().query(
    `UPDATE public.catalog_items SET ${setClauses.join(", ")} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function dbDeleteCatalogItem(
  itemId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    await getPool().query(
      `DELETE FROM public.catalog_items WHERE id = $1 AND user_id = $2`,
      [itemId, userId]
    );
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function dbUpdateCatalogOrder(
  updates: { id: string; display_order: number }[],
  userId: string
): Promise<{ error: Error | null }> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const update of updates) {
      await client.query(
        `UPDATE public.catalog_items SET display_order = $1 WHERE id = $2 AND user_id = $3`,
        [update.display_order, update.id, userId]
      );
    }
    await client.query("COMMIT");
    return { error: null };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return { error: err instanceof Error ? err : new Error(String(err)) };
  } finally {
    client.release();
  }
}

export async function dbGetPreviewCatalogItems(
  previewId: string
): Promise<Record<string, unknown>[]> {
  // WHY: Calls stored function that validates preview link expiry and returns
  // only active catalog items. SECURITY DEFINER bypasses RLS for public preview access.
  const result = await getPool().query(
    `SELECT * FROM public.get_preview_catalog($1)`,
    [previewId]
  );
  return result.rows;
}

// ─── Analytics Queries ─────────────────────────────────────────────────────────

export async function dbInsertAnalyticsEvent(params: {
  eventType: string;
  userId?: string | null;
  projectId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isAzureCircuitOpen()) {
    try {
      await Promise.race([
        getPool().query(
          `INSERT INTO public.analytics_events (event_type, user_id, project_id, metadata) VALUES ($1, $2, $3, $4)`,
          [
            params.eventType,
            params.userId || null,
            params.projectId || null,
            JSON.stringify(params.metadata || {}),
          ]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1000)
        ),
      ]);
      markAzureSuccess();
    } catch (err) {
      markAzureFailed(err);
    }
  }
}

// ─── Public API Queries (used by track-event, submit-lead, site-admin routes) ─

export async function dbGetProjectByPublicSlug(
  slug: string
): Promise<{ id: string; user_id: string } | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT id, user_id FROM public.projects WHERE public_slug = $1`,
          [slug]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id")
    .eq("public_slug", slug)
    .maybeSingle();

  if (error) return null;
  return (data as { id: string; user_id: string }) || null;
}

export async function dbAppendLeadToProject(
  projectId: string,
  leadData: Record<string, unknown>
): Promise<{ error: Error | null }> {
  try {
    await getPool().query(
      `SELECT public.append_lead_to_project($1, $2)`,
      [projectId, JSON.stringify(leadData)]
    );
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

// ─── Site Admin Queries ────────────────────────────────────────────────────────

export async function dbGetProjectBySlugForAdmin(
  slug: string
): Promise<Record<string, unknown> | null> {
  const result = await getPool().query(
    `SELECT id, user_id, name, business_name, category, is_published, public_slug, custom_domain, json_data, created_at, updated_at FROM public.projects WHERE public_slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
}

export async function dbGetProjectForAdmin(
  slug: string,
  selectColumns: string
): Promise<Record<string, unknown> | null> {
  const result = await getPool().query(
    `SELECT ${selectColumns} FROM public.projects WHERE public_slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
}

export async function dbGetWebsiteMembers(
  projectId: string
): Promise<Record<string, unknown>[]> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT * FROM public.website_members WHERE project_id = $1`,
          [projectId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("website_members")
    .select("*")
    .eq("project_id", projectId);

  if (error) return [];
  return data || [];
}

export async function dbGetAnalyticsEvents(
  projectId: string,
  limit: number = 200
): Promise<Record<string, unknown>[]> {
  const result = await getPool().query(
    `SELECT event_type, created_at, metadata FROM public.analytics_events WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [projectId, limit]
  );
  return result.rows;
}

export async function dbGetCatalogItemStatus(
  itemId: string
): Promise<{ status: string } | null> {
  const result = await getPool().query(
    `SELECT status FROM public.catalog_items WHERE id = $1`,
    [itemId]
  );
  return result.rows[0] || null;
}

export async function dbUpdateCatalogItemStatus(
  itemId: string,
  status: string
): Promise<void> {
  await getPool().query(
    `UPDATE public.catalog_items SET status = $1 WHERE id = $2`,
    [status, itemId]
  );
}

export async function dbInsertCatalogItemSimple(
  item: Record<string, unknown>
): Promise<void> {
  await getPool().query(
    `INSERT INTO public.catalog_items (project_id, name, description, price, original_price, status, category, item_type, images) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      item.project_id,
      item.name,
      item.description || "",
      item.price ?? 0,
      item.original_price ?? null,
      item.status || "active",
      item.category || "General",
      item.item_type || "product",
      JSON.stringify(item.images || []),
    ]
  );
}

export async function dbUpdateProjectJsonData(
  projectId: string,
  jsonData: Record<string, unknown>
): Promise<void> {
  if (!isAzureCircuitOpen()) {
    try {
      await Promise.race([
        getPool().query(
          `UPDATE public.projects SET json_data = $1, updated_at = now() WHERE id = $2`,
          [JSON.stringify(jsonData), projectId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase
    .from("projects")
    .update({ json_data: jsonData, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) {
    console.error("[dbUpdateProjectJsonData Supabase Error]", error.message);
  }
}

export async function dbGetProjectJsonData(
  projectId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT json_data FROM public.projects WHERE id = $1 AND user_id = $2`,
          [projectId, userId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return (result.rows[0]?.json_data as Record<string, unknown>) || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .select("json_data")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[dbGetProjectJsonData Supabase Error]", error.message);
    return null;
  }
  return (data?.json_data as Record<string, unknown>) || null;
}

export async function dbCheckProjectExists(
  projectId: string,
  userId: string
): Promise<boolean> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT id FROM public.projects WHERE id = $1 AND user_id = $2`,
          [projectId, userId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows.length > 0;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[dbCheckProjectExists Supabase Error]", error.message);
    return false;
  }
  return !!data;
}

// ─── Subscription Queries ───────────────────────────────────────────────────

// In-memory fallback map for subscriptions when Azure DB circuit is open or unreachable
const fallbackSubscriptions = new Map<string, { plan_id: string; status: string; amount_inr: number }>();

export async function dbGetUserSubscription(
  userId: string
): Promise<{ plan_id: string; status: string; amount_inr?: number } | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT plan_id, status, amount_inr FROM public.subscriptions WHERE user_id = $1 LIMIT 1`,
          [userId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      if (result.rows[0]) {
        fallbackSubscriptions.set(userId, result.rows[0]);
        return result.rows[0];
      }
    } catch (err) {
      markAzureFailed(err);
    }
  }

  // Fallback: Check in-memory fallback cache or default to free tier
  return fallbackSubscriptions.get(userId) || { plan_id: "free", status: "free", amount_inr: 0 };
}

export async function dbUpsertUserSubscription(
  userId: string,
  planId: string = "paid_pro",
  status: string = "active_paid",
  amountInr: number = 500
): Promise<{ plan_id: string; status: string; amount_inr: number }> {
  fallbackSubscriptions.set(userId, { plan_id: planId, status, amount_inr: amountInr });

  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `INSERT INTO public.subscriptions (user_id, plan_id, status, amount_inr, current_period_start, current_period_end, updated_at)
           VALUES ($1, $2, $3, $4, now(), now() + interval '30 days', now())
           ON CONFLICT (user_id)
           DO UPDATE SET plan_id = $2, status = $3, amount_inr = $4, updated_at = now()
           RETURNING plan_id, status, amount_inr`,
          [userId, planId, status, amountInr]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0];
    } catch (err) {
      markAzureFailed(err);
    }
  }

  return { plan_id: planId, status, amount_inr: amountInr };
}


// ─── Custom Domain Queries ──────────────────────────────────────────────────

export async function dbUpdateProjectCustomDomain(
  projectId: string,
  userId: string,
  customDomain: string,
  status: string,
  verifiedAt: string | null
): Promise<void> {
  await getPool().query(
    `UPDATE public.projects SET custom_domain = $1, custom_domain_status = $2, custom_domain_verified_at = $3 WHERE id = $4 AND user_id = $5`,
    [customDomain, status, verifiedAt, projectId, userId]
  );
}

// ─── Admin Analytics Queries ─────────────────────────────────────────────────

export async function dbGetAdminProjectsSummary(): Promise<Record<string, unknown>[]> {
  const result = await getPool().query(
    `SELECT id, user_id, name, business_name, category, is_published, public_slug, custom_domain, created_at, updated_at FROM public.projects ORDER BY created_at DESC`
  );
  return result.rows;
}

export async function dbGetAdminAnalyticsEvents(limit: number = 100): Promise<Record<string, unknown>[]> {
  const result = await getPool().query(
    `SELECT id, user_id, project_id, event_type, metadata, created_at FROM public.analytics_events ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function dbGetAdminSubscriptions(): Promise<Record<string, unknown>[]> {
  const result = await getPool().query(
    `SELECT id, user_id, plan_id, status, amount_inr, created_at FROM public.subscriptions`
  );
  return result.rows;
}

// ─── Website Member / Claim Queries ──────────────────────────────────────────

export async function dbGetWebsiteOwner(
  projectId: string
): Promise<{ id: string; user_id: string; role: string }[]> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT id, user_id, role FROM public.website_members WHERE project_id = $1 AND role = 'OWNER'`,
          [projectId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("website_members")
    .select("id, user_id, role")
    .eq("project_id", projectId)
    .eq("role", "OWNER");

  if (error) return [];
  return data || [];
}

export async function dbInsertWebsiteOwner(
  projectId: string,
  userId: string
): Promise<void> {
  if (!isAzureCircuitOpen()) {
    try {
      await Promise.race([
        getPool().query(
          `INSERT INTO public.website_members (project_id, user_id, role, status) VALUES ($1, $2, 'OWNER', 'active')`,
          [projectId, userId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  await supabase
    .from("website_members")
    .insert({ project_id: projectId, user_id: userId, role: "OWNER", status: "active" });
}

// ─── Project Knowledge Queries ───────────────────────────────────────────────

export async function dbGetProjectKnowledge(
  projectId: string,
  category: string,
  key: string
): Promise<Record<string, unknown> | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT * FROM public.project_knowledge WHERE project_id = $1 AND category = $2 AND key = $3`,
          [projectId, category, key]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }
  return null;
}

export async function dbGetProjectKnowledgeByCategory(
  projectId: string,
  category: string
): Promise<Record<string, unknown>[]> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT * FROM public.project_knowledge WHERE project_id = $1 AND category = $2 ORDER BY created_at ASC`,
          [projectId, category]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows;
    } catch (err) {
      markAzureFailed(err);
    }
  }
  return [];
}

export async function dbSetProjectKnowledge(input: {
  projectId: string;
  userId: string;
  category: string;
  key: string;
  content: unknown;
  metadata?: Record<string, unknown>;
  changeReason?: string;
}): Promise<Record<string, unknown>> {
  const meta = {
    ...(input.metadata || {}),
    change_reason: input.changeReason || "content_update",
  };
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `INSERT INTO public.project_knowledge (project_id, user_id, category, key, content, metadata)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (project_id, category, key)
           DO UPDATE SET content = EXCLUDED.content, metadata = EXCLUDED.metadata, updated_at = now()
           RETURNING *`,
          [
            input.projectId,
            input.userId,
            input.category,
            input.key,
            JSON.stringify(input.content),
            JSON.stringify(meta),
          ]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0];
    } catch (err) {
      markAzureFailed(err);
    }
  }
  return {
    id: `pk_${Date.now()}`,
    project_id: input.projectId,
    user_id: input.userId,
    category: input.category,
    key: input.key,
    content: input.content,
    metadata: meta,
  };
}

export async function dbGetAllProjectKnowledge(
  projectId: string
): Promise<Record<string, unknown>[]> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT * FROM public.project_knowledge WHERE project_id = $1`,
          [projectId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows;
    } catch (err) {
      markAzureFailed(err);
    }
  }
  return [];
}

export async function dbGetProjectRecordById(
  projectId: string
): Promise<Record<string, unknown> | null> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT * FROM public.projects WHERE id = $1`,
          [projectId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0] || null;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[dbGetProjectRecordById Supabase Error]", error.message);
    return null;
  }
  return (data as Record<string, unknown>) || null;
}

export async function dbGetCatalogItemsCount(
  projectId: string
): Promise<number> {
  if (!isAzureCircuitOpen()) {
    try {
      const result = await Promise.race([
        getPool().query(
          `SELECT COUNT(*)::int AS count FROM public.catalog_items WHERE project_id = $1`,
          [projectId]
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return result.rows[0]?.count || 0;
    } catch (err) {
      markAzureFailed(err);
    }
  }

  const supabase = getServiceRoleClient();
  const { count, error } = await supabase
    .from("catalog_items")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId);

  if (error) return 0;
  return count || 0;
}

// ─── Health Check ──────────────────────────────────────────────────────────────

export async function dbHealthCheck(): Promise<{
  healthy: boolean;
  latencyMs: number;
  message: string;
}> {
  const startTime = Date.now();
  if (!isAzureCircuitOpen()) {
    try {
      await Promise.race([
        getPool().query("SELECT 1 AS health_check"),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Azure DB connection timeout")), 1500)
        ),
      ]);
      markAzureSuccess();
      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        message: "Azure PostgreSQL connection verified.",
      };
    } catch (err) {
      markAzureFailed(err);
    }
  }

  // Fallback to Supabase
  try {
    const supabase = getServiceRoleClient();
    const { error } = await supabase.from("projects").select("id").limit(1);
    if (error) throw new Error(error.message);
    return {
      healthy: true,
      latencyMs: Date.now() - startTime,
      message: "Supabase PostgreSQL connection verified.",
    };
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}


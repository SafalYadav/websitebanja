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
      connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
    });
  } else if (config.databaseUrl) {
    _pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.ssl,
      max: config.pool.max,
      min: config.pool.min,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      connectionTimeoutMillis: config.pool.connectionTimeoutMillis,
    });
  } else {
    throw new Error(
      "Azure PostgreSQL is not configured. Set AZURE_DB_USER + AZURE_DB_PASSWORD or DATABASE_URL."
    );
  }

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
    await client.query("SET LOCAL app.current_user_id = $1", [userId]);
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
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO public.projects (user_id, name) VALUES ($1, $2) RETURNING *`,
    [userId, name]
  );
  return result.rows[0] || null;
}

export async function dbGetProjects(
  userId: string
): Promise<Record<string, unknown>[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT * FROM public.projects WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function dbUpdateProject(
  projectId: string,
  userId: string,
  updates: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  if (Object.keys(updates).length === 0) return null;

  // Build dynamic SET clause from valid columns
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(updates)) {
    setClauses.push(`"${key}" = $${paramIndex}`);
    // WHY: json_data and other JSONB columns need explicit JSON serialization
    // to prevent pg from treating JS objects as string '[object Object]'
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

  const result = await getPool().query(
    `UPDATE public.projects SET ${setClauses.join(", ")} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

export async function dbGetProject(
  projectId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await getPool().query(
    `SELECT * FROM public.projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return result.rows[0] || null;
}

export async function dbGetProjectBySlug(
  slug: string,
  slugDecoded: string
): Promise<Record<string, unknown> | null> {
  // WHY: Calls the stored function which strips leads/private_notes from json_data
  // for public safety. SECURITY DEFINER ensures it bypasses RLS for public access.
  const result = await getPool().query(
    `SELECT * FROM public.get_published_project_by_slug($1, $2)`,
    [slug, slugDecoded]
  );
  return result.rows[0] || null;
}

export async function dbGetPublishedSnapshot(
  projectId: string
): Promise<Record<string, unknown> | null> {
  const result = await getPool().query(
    `SELECT snapshot_data FROM public.published_versions WHERE project_id = $1 ORDER BY published_at DESC LIMIT 1`,
    [projectId]
  );
  return result.rows[0] || null;
}

export async function dbPublishProjectAtomic(
  userId: string,
  projectId: string,
  slug: string,
  snapshotData: Record<string, unknown>
): Promise<{ error: Error | null }> {
  // WHY withUserContext: publish_project_atomic calls auth.uid() internally
  // to verify ownership. We set app.current_user_id so auth.uid() resolves.
  try {
    await withUserContext(userId, async (client) => {
      // The stored function in Azure accepts (p_project_id, p_slug) and reads json_data
      // from the project itself. But the caller may pass latestJsonData, so we update
      // json_data first if provided, then call the atomic publish.
      if (snapshotData && Object.keys(snapshotData).length > 0) {
        // Store the snapshot data in the project first so the atomic function picks it up
        await client.query(
          `UPDATE public.projects SET json_data = $1 WHERE id = $2 AND user_id = $3`,
          [JSON.stringify(snapshotData), projectId, userId]
        );
      }
      await client.query(
        `SELECT public.publish_project_atomic($1, $2)`,
        [projectId, slug]
      );
    });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
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
  const result = await getPool().query(
    `UPDATE public.projects SET is_published = false WHERE id = $1 AND user_id = $2 RETURNING *`,
    [projectId, userId]
  );
  return result.rows[0] || null;
}

export async function dbDeleteProject(
  projectId: string,
  userId: string
): Promise<{ error: Error | null }> {
  try {
    await getPool().query(
      `DELETE FROM public.projects WHERE id = $1 AND user_id = $2`,
      [projectId, userId]
    );
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function dbGetProjectOwnership(
  projectId: string
): Promise<{ id: string; user_id: string } | null> {
  const result = await getPool().query(
    `SELECT id, user_id FROM public.projects WHERE id = $1`,
    [projectId]
  );
  return result.rows[0] || null;
}

export async function dbDuplicateProject(
  original: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const result = await getPool().query(
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
  );
  return result.rows[0] || null;
}

// ─── Preview Link Queries ──────────────────────────────────────────────────────

export async function dbGeneratePreviewLink(
  projectId: string,
  jsonData: Record<string, unknown>,
  expiresAt: string
): Promise<string | null> {
  const result = await getPool().query(
    `INSERT INTO public.preview_links (project_id, json_data, expires_at) VALUES ($1, $2, $3) RETURNING id`,
    [projectId, JSON.stringify(jsonData), expiresAt]
  );
  return result.rows[0]?.id || null;
}

export async function dbGetPreviewLinkData(
  previewId: string
): Promise<{ json_data: unknown; expires_at: string; project_id: string } | null> {
  const result = await getPool().query(
    `SELECT json_data, expires_at, project_id FROM public.preview_links WHERE id = $1`,
    [previewId]
  );
  return result.rows[0] || null;
}

export async function dbGetPreviewProject(
  previewId: string
): Promise<Record<string, unknown> | null> {
  // WHY: Calls the stored function which strips leads/private_notes and checks expiry
  const result = await getPool().query(
    `SELECT * FROM public.get_preview_project($1)`,
    [previewId]
  );
  return result.rows[0] || null;
}

// ─── Catalog Queries ───────────────────────────────────────────────────────────

export async function dbGetCatalogItems(
  projectId: string
): Promise<Record<string, unknown>[]> {
  const result = await getPool().query(
    `SELECT * FROM public.catalog_items WHERE project_id = $1 ORDER BY display_order ASC, created_at DESC`,
    [projectId]
  );
  return result.rows;
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
  try {
    await getPool().query(
      `INSERT INTO public.analytics_events (event_type, user_id, project_id, metadata) VALUES ($1, $2, $3, $4)`,
      [
        params.eventType,
        params.userId || null,
        params.projectId || null,
        JSON.stringify(params.metadata || {}),
      ]
    );
  } catch (err) {
    // WHY non-blocking: Analytics should never crash application requests.
    // Same pattern as the original Supabase implementation.
    console.error("[Analytics Track ERROR]", err);
  }
}

// ─── Public API Queries (used by track-event, submit-lead, site-admin routes) ─

export async function dbGetProjectByPublicSlug(
  slug: string
): Promise<{ id: string; user_id: string } | null> {
  const result = await getPool().query(
    `SELECT id, user_id FROM public.projects WHERE public_slug = $1`,
    [slug]
  );
  return result.rows[0] || null;
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
  const result = await getPool().query(
    `SELECT * FROM public.website_members WHERE project_id = $1`,
    [projectId]
  );
  return result.rows;
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
  await getPool().query(
    `UPDATE public.projects SET json_data = $1, updated_at = now() WHERE id = $2`,
    [JSON.stringify(jsonData), projectId]
  );
}

export async function dbGetProjectJsonData(
  projectId: string,
  userId: string
): Promise<Record<string, unknown> | null> {
  const result = await getPool().query(
    `SELECT json_data FROM public.projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return result.rows[0]?.json_data || null;
}

export async function dbCheckProjectExists(
  projectId: string,
  userId: string
): Promise<boolean> {
  const result = await getPool().query(
    `SELECT id FROM public.projects WHERE id = $1 AND user_id = $2`,
    [projectId, userId]
  );
  return result.rows.length > 0;
}

// ─── Subscription Queries ───────────────────────────────────────────────────

export async function dbGetUserSubscription(
  userId: string
): Promise<{ plan_id: string; status: string; amount_inr?: number } | null> {
  const result = await getPool().query(
    `SELECT plan_id, status, amount_inr FROM public.subscriptions WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function dbUpsertUserSubscription(
  userId: string,
  planId: string = "paid_pro",
  status: string = "active_paid",
  amountInr: number = 500
): Promise<{ plan_id: string; status: string; amount_inr: number }> {
  const result = await getPool().query(
    `INSERT INTO public.subscriptions (user_id, plan_id, status, amount_inr, current_period_start, current_period_end, updated_at)
     VALUES ($1, $2, $3, $4, now(), now() + interval '30 days', now())
     ON CONFLICT (user_id)
     DO UPDATE SET plan_id = $2, status = $3, amount_inr = $4, updated_at = now()
     RETURNING plan_id, status, amount_inr`,
    [userId, planId, status, amountInr]
  );
  return result.rows[0];
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
  const result = await getPool().query(
    `SELECT id, user_id, role FROM public.website_members WHERE project_id = $1 AND role = 'OWNER'`,
    [projectId]
  );
  return result.rows;
}

export async function dbInsertWebsiteOwner(
  projectId: string,
  userId: string
): Promise<void> {
  await getPool().query(
    `INSERT INTO public.website_members (project_id, user_id, role, status) VALUES ($1, $2, 'OWNER', 'active')`,
    [projectId, userId]
  );
}

// ─── Project Knowledge Queries ───────────────────────────────────────────────

export async function dbGetProjectKnowledge(
  projectId: string,
  category: string,
  key: string
): Promise<Record<string, unknown> | null> {
  const result = await getPool().query(
    `SELECT * FROM public.project_knowledge WHERE project_id = $1 AND category = $2 AND key = $3`,
    [projectId, category, key]
  );
  return result.rows[0] || null;
}

export async function dbGetProjectKnowledgeByCategory(
  projectId: string,
  category: string
): Promise<Record<string, unknown>[]> {
  const result = await getPool().query(
    `SELECT * FROM public.project_knowledge WHERE project_id = $1 AND category = $2 ORDER BY created_at ASC`,
    [projectId, category]
  );
  return result.rows;
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
  const result = await getPool().query(
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
  );
  return result.rows[0];
}

export async function dbGetAllProjectKnowledge(
  projectId: string
): Promise<Record<string, unknown>[]> {
  const result = await getPool().query(
    `SELECT * FROM public.project_knowledge WHERE project_id = $1`,
    [projectId]
  );
  return result.rows;
}

export async function dbGetProjectRecordById(
  projectId: string
): Promise<Record<string, unknown> | null> {
  const result = await getPool().query(
    `SELECT * FROM public.projects WHERE id = $1`,
    [projectId]
  );
  return result.rows[0] || null;
}

export async function dbGetCatalogItemsCount(
  projectId: string
): Promise<number> {
  const result = await getPool().query(
    `SELECT COUNT(*)::int AS count FROM public.catalog_items WHERE project_id = $1`,
    [projectId]
  );
  return result.rows[0]?.count || 0;
}

// ─── Health Check ──────────────────────────────────────────────────────────────

export async function dbHealthCheck(): Promise<{
  healthy: boolean;
  latencyMs: number;
  message: string;
}> {
  const startTime = Date.now();
  try {
    await getPool().query("SELECT 1 AS health_check");
    return {
      healthy: true,
      latencyMs: Date.now() - startTime,
      message: "Azure PostgreSQL connection verified.",
    };
  } catch (err) {
    return {
      healthy: false,
      latencyMs: Date.now() - startTime,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}


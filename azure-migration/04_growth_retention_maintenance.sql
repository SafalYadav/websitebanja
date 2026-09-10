-- =====================================================================================
-- WebsiteBanja AI — Azure PostgreSQL Growth Management & Retention Maintenance
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. ANALYTICS_EVENTS PARTITIONING ARCHITECTURE
--    Problem: analytics_events grows unbounded with every click, view, and submission.
--    Solution: Range-partitioning by created_at (monthly).
-- -------------------------------------------------------------------------------------

-- Partitioned table definition template:
/*
CREATE TABLE public.analytics_events_partitioned (
  id UUID DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partition creation examples:
CREATE TABLE IF NOT EXISTS public.analytics_events_y2026m08
  PARTITION OF public.analytics_events_partitioned
  FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.analytics_events_y2026m09
  PARTITION OF public.analytics_events_partitioned
  FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.analytics_events_y2026m10
  PARTITION OF public.analytics_events_partitioned
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
*/

-- -------------------------------------------------------------------------------------
-- 2. AUTOMATED PREVIEW LINKS RETENTION PURGE
--    Problem: Temporary preview links with full JSONB website AST accumulate forever.
--    Solution: Purge expired preview links older than 7 days.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_preview_links(p_retention_days integer DEFAULT 7)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM public.preview_links
  WHERE expires_at < (now() - (p_retention_days || ' days')::interval);
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 3. PROJECT KNOWLEDGE REVISIONS PRUNING
--    Problem: Every studio action or edit adds a new JSONB revision.
--    Solution: Retain the latest N revisions per project knowledge entry (default 20).
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prune_project_knowledge_revisions(p_keep_latest_n integer DEFAULT 20)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  WITH ranked_revisions AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY project_knowledge_id 
        ORDER BY version DESC, created_at DESC
      ) AS rank
    FROM public.project_knowledge_revisions
  ),
  stale_revisions AS (
    SELECT id FROM ranked_revisions WHERE rank > p_keep_latest_n
  )
  DELETE FROM public.project_knowledge_revisions
  WHERE id IN (SELECT id FROM stale_revisions);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 4. PUBLISHED VERSIONS PRUNING (OPTIONAL / HISTORICAL RETENTION)
--    Retains the most recent N published snapshots per project (default 10).
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prune_old_published_versions(p_keep_latest_n integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  WITH ranked_versions AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY project_id 
        ORDER BY version DESC, published_at DESC
      ) AS rank
    FROM public.published_versions
  ),
  stale_versions AS (
    SELECT id FROM ranked_versions WHERE rank > p_keep_latest_n
  )
  DELETE FROM public.published_versions
  WHERE id IN (SELECT id FROM stale_versions);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 5. SCHEDULED MAINTENANCE WRAPPER
--    Can be invoked via pg_cron on Azure PostgreSQL or an Azure Logic App.
-- -------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_database_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previews_purged integer;
  v_revisions_pruned integer;
  v_snapshots_pruned integer;
BEGIN
  v_previews_purged := public.purge_expired_preview_links(7);
  v_revisions_pruned := public.prune_project_knowledge_revisions(20);
  v_snapshots_pruned := public.prune_old_published_versions(10);

  RETURN jsonb_build_object(
    'timestamp', now(),
    'previews_purged', v_previews_purged,
    'revisions_pruned', v_revisions_pruned,
    'snapshots_pruned', v_snapshots_pruned
  );
END;
$$;

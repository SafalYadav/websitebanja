-- =====================================================================================
-- Security hardening migration (2026-08-30)
--
-- Closes the database-side findings from the security audit:
--   1. append_lead_to_project was an unauthenticated write primitive against ANY
--      project row: SECURITY DEFINER, no authz check, no search_path pin, and no
--      REVOKE of the implicit EXECUTE grant to PUBLIC.
--   2. preview_links had a `FOR SELECT USING (true)` policy with no `TO` clause, so
--      anon could dump every tenant's unpublished draft with one PostgREST call.
--   3. analytics_events accepted anonymous inserts for arbitrary project_ids and had
--      no SELECT policy at all (so owners' own dashboards always read zero).
--   4. website_members had no OWNER row for any project, which made the "already
--      claimed?" check in the claim API vacuously false for every site.
--   5. The projects UPDATE policy allowed a non-owner member to reassign user_id,
--      escalating a membership grant into permanent ownership.
--   6. published_versions.snapshot_data embeds the whole json_data blob, including
--      customer lead PII, and is readable by anon for any published site.
--
-- Ordering note: this migration is idempotent where practical so it can be re-run.
-- =====================================================================================

-- =====================================================================================
-- 1. Lead capture: replace the unguarded primitive with slug-scoped, validated RPCs
-- =====================================================================================

-- Shared validation: a lead payload must be a small object with only known keys.
CREATE OR REPLACE FUNCTION public.is_valid_lead_payload(p_lead jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_lead IS NOT NULL
     AND jsonb_typeof(p_lead) = 'object'
     AND length(p_lead::text) <= 4000
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_object_keys(p_lead) AS k
       WHERE k NOT IN ('id','name','email','phone','message','sourcePage','createdAt','read')
     );
$$;

-- Hardened in place: pins search_path, refuses to touch unpublished projects,
-- validates the payload, and caps how many leads a single project can accumulate.
CREATE OR REPLACE FUNCTION public.append_lead_to_project(p_project_id UUID, p_lead_data JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing jsonb;
BEGIN
  IF NOT public.is_valid_lead_payload(p_lead_data) THEN
    RAISE EXCEPTION 'Invalid lead payload';
  END IF;

  SELECT COALESCE(json_data->'leads', '[]'::jsonb) INTO v_existing
  FROM public.projects
  WHERE id = p_project_id AND is_published = true;

  IF v_existing IS NULL THEN
    RAISE EXCEPTION 'Project not found or not published';
  END IF;

  -- Cap retained leads so an abusive client cannot grow a single jsonb column without bound.
  IF jsonb_array_length(v_existing) >= 5000 THEN
    v_existing := (
      SELECT jsonb_agg(elem)
      FROM (
        SELECT elem FROM jsonb_array_elements(v_existing) AS elem LIMIT 4999
      ) trimmed
    );
  END IF;

  UPDATE public.projects
  SET json_data = jsonb_set(
        COALESCE(json_data, '{}'::jsonb),
        '{leads}',
        jsonb_build_array(p_lead_data) || COALESCE(v_existing, '[]'::jsonb)
      ),
      updated_at = NOW()
  WHERE id = p_project_id AND is_published = true;
END;
$$;

-- SECURITY: CREATE FUNCTION grants EXECUTE to PUBLIC by default. Revoke, then grant
-- narrowly. anon deliberately does NOT get this one — public callers must go through
-- submit_public_lead, which resolves the project by slug instead of by id.
REVOKE ALL ON FUNCTION public.append_lead_to_project(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_lead_to_project(uuid, jsonb) TO service_role;

-- The only lead-capture entry point available to anonymous site visitors. The project
-- is resolved from the public slug inside the function, so the caller can never point
-- a submission at an arbitrary project id or at an unpublished draft.
CREATE OR REPLACE FUNCTION public.submit_public_lead(p_slug text, p_lead jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_owner_id uuid;
BEGIN
  IF NOT public.is_valid_lead_payload(p_lead) THEN
    RAISE EXCEPTION 'Invalid lead payload';
  END IF;

  SELECT id, user_id INTO v_project_id, v_owner_id
  FROM public.projects
  WHERE public_slug = p_slug AND is_published = true
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RAISE EXCEPTION 'Website not found';
  END IF;

  PERFORM public.append_lead_to_project(v_project_id, p_lead);

  INSERT INTO public.analytics_events (project_id, user_id, event_type, metadata)
  VALUES (
    v_project_id,
    v_owner_id,
    'lead_submit',
    jsonb_build_object(
      'leadId', p_lead->>'id',
      'sourcePage', left(COALESCE(p_lead->>'sourcePage', 'Home'), 200)
    )
  );

  RETURN v_project_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_lead(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_lead(text, jsonb) TO anon, authenticated, service_role;

-- =====================================================================================
-- 2. Public analytics: slug-scoped, published-only, size-capped event recording
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.record_public_site_event(
  p_slug text,
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project_id uuid;
  v_owner_id uuid;
  v_metadata jsonb;
BEGIN
  -- Allowlist the event types a public visitor may generate, so attacker-chosen
  -- strings cannot pollute the owner's and platform admin's derived counters.
  IF p_event_type NOT IN ('page_view', 'whatsapp_click', 'cta_click', 'catalog_view', 'lead_submit') THEN
    RAISE EXCEPTION 'Unsupported event type';
  END IF;

  v_metadata := COALESCE(p_metadata, '{}'::jsonb);
  IF jsonb_typeof(v_metadata) <> 'object' OR length(v_metadata::text) > 2000 THEN
    v_metadata := '{}'::jsonb;
  END IF;

  SELECT id, user_id INTO v_project_id, v_owner_id
  FROM public.projects
  WHERE public_slug = p_slug AND is_published = true
  LIMIT 1;

  IF v_project_id IS NULL THEN
    RETURN; -- telemetry is best-effort; never leak whether a slug exists
  END IF;

  INSERT INTO public.analytics_events (project_id, user_id, event_type, metadata)
  VALUES (v_project_id, v_owner_id, p_event_type, v_metadata);
END;
$$;

REVOKE ALL ON FUNCTION public.record_public_site_event(text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_public_site_event(text, text, jsonb) TO anon, authenticated, service_role;

-- =====================================================================================
-- 3. analytics_events: stop anonymous direct inserts, and let owners read their own
-- =====================================================================================

-- The old policy had no TO clause (so it defaulted to PUBLIC, including anon) and its
-- `user_id IS NULL` branch let anon insert rows for any project_id with any metadata.
DROP POLICY IF EXISTS "Users can insert their own analytics events" ON public.analytics_events;

CREATE POLICY "Analytics events insert policy"
  ON public.analytics_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Previously absent entirely, which silently zeroed every site owner's dashboard.
CREATE POLICY "Analytics events select policy"
  ON public.analytics_events
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_project_owner(project_id)
    OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
  );

CREATE INDEX IF NOT EXISTS idx_analytics_events_project_time
  ON public.analytics_events(project_id, created_at DESC);

-- =====================================================================================
-- 4. preview_links: remove the world-readable policy, add an expiry-checked RPC
-- =====================================================================================

-- This `USING (true)` policy survived the fix_rls_recursion migration (which dropped
-- only the INSERT policy) and let anon enumerate every unpublished draft in the system.
DROP POLICY IF EXISTS "Allow public read access to preview links" ON public.preview_links;

CREATE POLICY "Preview links select policy"
  ON public.preview_links
  FOR SELECT
  TO authenticated
  USING (
    public.is_project_owner(project_id)
    OR public.is_website_member(project_id)
  );

-- Anonymous holders of a share link read through this instead: it requires the exact
-- preview id, enforces expiry in SQL rather than in application code, and strips lead
-- PII out of the draft snapshot before returning it.
CREATE OR REPLACE FUNCTION public.get_preview_snapshot(p_preview_id uuid)
RETURNS TABLE (project_id uuid, json_data jsonb)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT pl.project_id, (pl.json_data - 'leads')
  FROM public.preview_links pl
  WHERE pl.id = p_preview_id
    AND pl.expires_at > now()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_preview_snapshot(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_preview_snapshot(uuid) TO anon, authenticated, service_role;

-- =====================================================================================
-- 5. website_members: give every project a real OWNER row
-- =====================================================================================

-- Nothing in the app ever inserted the first member row, so the site-admin claim flow's
-- "has this site already been claimed?" test was vacuously false for every project.
-- Backfilling from projects.user_id makes that check meaningful; combined with the
-- owner-only authorization now enforced in the claim route, it closes the takeover path.
INSERT INTO public.website_members (project_id, user_id, role, status)
SELECT p.id, p.user_id, 'OWNER'::public.admin_role, 'active'
FROM public.projects p
WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.website_members m
    WHERE m.project_id = p.id AND m.role = 'OWNER'
  )
ON CONFLICT (project_id, user_id) DO UPDATE
  SET role = 'OWNER'::public.admin_role,
      status = 'active';

-- Demote (never delete) any surplus OWNER rows so the unique index below can be created
-- without dropping anybody's access. Preference order: the row matching projects.user_id,
-- then the oldest row.
UPDATE public.website_members m
SET role = 'ADMIN'::public.admin_role
FROM (
  SELECT m2.id,
         row_number() OVER (
           PARTITION BY m2.project_id
           ORDER BY (p.user_id = m2.user_id) DESC, m2.created_at ASC, m2.id ASC
         ) AS rn
  FROM public.website_members m2
  JOIN public.projects p ON p.id = m2.project_id
  WHERE m2.role = 'OWNER'
) dup
WHERE m.id = dup.id AND dup.rn > 1;

-- Defence in depth: even if a future code path forgets the "already claimed?" check,
-- the database itself will only ever accept one OWNER per project.
CREATE UNIQUE INDEX IF NOT EXISTS website_members_one_owner_per_project
  ON public.website_members(project_id)
  WHERE role = 'OWNER';

-- =====================================================================================
-- 6. projects: make ownership non-transferable through the public API
-- =====================================================================================

-- "Projects update policy" (20260817000005_fix_rls_recursion.sql) lets an EDITOR/ADMIN
-- member satisfy USING, and its WITH CHECK is satisfied by `user_id = auth.uid()`, so the
-- same member could set user_id to themselves and permanently steal the project. RLS
-- cannot compare OLD to NEW, so the invariant is enforced with a trigger instead. The
-- policy is intentionally left as-is: `user_id = auth.uid()` is the correct check for the
-- legitimate owner, and this trigger removes the escalation it would otherwise permit.
CREATE OR REPLACE FUNCTION public.prevent_project_owner_reassignment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- auth.uid() is NULL for service_role / migration contexts, so deliberate backend
  -- ownership transfers remain possible; only end-user requests are blocked.
  IF NEW.user_id IS DISTINCT FROM OLD.user_id AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Project ownership cannot be reassigned';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_prevent_owner_reassignment ON public.projects;
CREATE TRIGGER projects_prevent_owner_reassignment
  BEFORE UPDATE OF user_id ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_project_owner_reassignment();

-- =====================================================================================
-- 7. Purge customer lead PII from world-readable snapshot tables
-- =====================================================================================

-- publishProject() copied the whole json_data blob -- including json_data->'leads' --
-- into snapshot_data, and "Published versions are viewable by everyone" makes those rows
-- readable by anon. Any lead captured before this migration must be treated as already
-- disclosed; purging here only stops further exposure.
UPDATE public.published_versions
SET snapshot_data = snapshot_data - 'leads'
WHERE snapshot_data ? 'leads';

-- Same leak shape in the draft share-link table.
UPDATE public.preview_links
SET json_data = json_data - 'leads'
WHERE json_data ? 'leads';

-- Structural guarantee so this cannot regress if a future write path forgets to strip.
CREATE OR REPLACE FUNCTION public.strip_leads_from_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.snapshot_data ? 'leads' THEN
    NEW.snapshot_data := NEW.snapshot_data - 'leads';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS published_versions_strip_leads ON public.published_versions;
CREATE TRIGGER published_versions_strip_leads
  BEFORE INSERT OR UPDATE ON public.published_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_leads_from_snapshot();

CREATE OR REPLACE FUNCTION public.strip_leads_from_preview()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.json_data ? 'leads' THEN
    NEW.json_data := NEW.json_data - 'leads';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS preview_links_strip_leads ON public.preview_links;
CREATE TRIGGER preview_links_strip_leads
  BEFORE INSERT OR UPDATE ON public.preview_links
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_leads_from_preview();




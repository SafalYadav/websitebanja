-- Migration: 20260905000000_create_project_knowledge.sql
-- Description: Project-scoped Knowledge Base and revision tracking with strict non-recursive RLS.
-- References: docs/knowledge-base-architecture.md (Section 4), docs/knowledge-base-data-ownership.md

-- =====================================================================================
-- 1. CREATE PROJECT KNOWLEDGE TABLE
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.project_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_knowledge_project_cat_key_uniq UNIQUE (project_id, category, key)
);

-- Indexes for lightning-fast lookups and JSON filtering
CREATE INDEX IF NOT EXISTS idx_project_knowledge_project_id 
  ON public.project_knowledge (project_id);

CREATE INDEX IF NOT EXISTS idx_project_knowledge_user_id 
  ON public.project_knowledge (user_id);

CREATE INDEX IF NOT EXISTS idx_project_knowledge_cat_key 
  ON public.project_knowledge (project_id, category, key);

CREATE INDEX IF NOT EXISTS idx_project_knowledge_content_gin 
  ON public.project_knowledge USING gin (content);

COMMENT ON TABLE public.project_knowledge IS 
  'Tenant-scoped project requirements, business facts, catalog selections, and decisions. Isolated by project_id and user_id under RLS.';

-- =====================================================================================
-- 2. CREATE PROJECT KNOWLEDGE REVISIONS TABLE (Audit & Change History)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.project_knowledge_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_knowledge_id UUID NOT NULL REFERENCES public.project_knowledge(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  previous_content JSONB,
  new_content JSONB NOT NULL,
  change_reason TEXT DEFAULT 'update',
  version INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_knowledge_rev_pk 
  ON public.project_knowledge_revisions (project_knowledge_id);

CREATE INDEX IF NOT EXISTS idx_project_knowledge_rev_project 
  ON public.project_knowledge_revisions (project_id, created_at DESC);

COMMENT ON TABLE public.project_knowledge_revisions IS 
  'Immutable change history tracking revisions for project knowledge entries.';

-- =====================================================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================================================

ALTER TABLE public.project_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_knowledge_revisions ENABLE ROW LEVEL SECURITY;

-- Revoke default public access (defense-in-depth)
REVOKE ALL ON public.project_knowledge FROM anon;
REVOKE ALL ON public.project_knowledge_revisions FROM anon;

-- =====================================================================================
-- 4. NON-RECURSIVE RLS POLICIES FOR PROJECT KNOWLEDGE
-- =====================================================================================

-- SELECT: Project owners and members (owner, admin, editor, viewer)
CREATE POLICY "project_knowledge_select_policy"
  ON public.project_knowledge
  FOR SELECT
  TO authenticated
  USING (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['owner'::public.admin_role, 'admin'::public.admin_role, 'editor'::public.admin_role, 'viewer'::public.admin_role])
  );

-- INSERT: Project owners and editors/admins; user_id must equal caller auth.uid()
CREATE POLICY "project_knowledge_insert_policy"
  ON public.project_knowledge
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.is_project_owner(project_id) OR
      public.is_website_member(project_id, ARRAY['owner'::public.admin_role, 'admin'::public.admin_role, 'editor'::public.admin_role])
    )
    AND user_id = auth.uid()
  );

-- UPDATE: Project owners and editors/admins
CREATE POLICY "project_knowledge_update_policy"
  ON public.project_knowledge
  FOR UPDATE
  TO authenticated
  USING (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['owner'::public.admin_role, 'admin'::public.admin_role, 'editor'::public.admin_role])
  )
  WITH CHECK (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['owner'::public.admin_role, 'admin'::public.admin_role, 'editor'::public.admin_role])
  );

-- DELETE: Only project owners and admins can delete knowledge records
CREATE POLICY "project_knowledge_delete_policy"
  ON public.project_knowledge
  FOR DELETE
  TO authenticated
  USING (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['owner'::public.admin_role, 'admin'::public.admin_role])
  );

-- =====================================================================================
-- 5. NON-RECURSIVE RLS POLICIES FOR PROJECT KNOWLEDGE REVISIONS
-- =====================================================================================

-- SELECT: Authorized project members can view revision history
CREATE POLICY "project_knowledge_revisions_select_policy"
  ON public.project_knowledge_revisions
  FOR SELECT
  TO authenticated
  USING (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['owner'::public.admin_role, 'admin'::public.admin_role, 'editor'::public.admin_role, 'viewer'::public.admin_role])
  );

-- INSERT: Authorized project members can record revision history
CREATE POLICY "project_knowledge_revisions_insert_policy"
  ON public.project_knowledge_revisions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      public.is_project_owner(project_id) OR
      public.is_website_member(project_id, ARRAY['owner'::public.admin_role, 'admin'::public.admin_role, 'editor'::public.admin_role])
    )
    AND user_id = auth.uid()
  );

-- Revisions are strictly append-only: NO UPDATE or DELETE policies are granted to authenticated users.

-- =====================================================================================
-- 6. AUTOMATED REVISION & TIMESTAMP TRIGGER
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.trg_project_knowledge_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-update updated_at timestamp
  NEW.updated_at = now();

  -- If content changed, bump version and log revision
  IF (TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content) THEN
    NEW.version = OLD.version + 1;
    INSERT INTO public.project_knowledge_revisions (
      project_knowledge_id,
      project_id,
      user_id,
      category,
      key,
      previous_content,
      new_content,
      change_reason,
      version,
      created_at
    ) VALUES (
      OLD.id,
      OLD.project_id,
      coalesce(auth.uid(), NEW.user_id),
      OLD.category,
      OLD.key,
      OLD.content,
      NEW.content,
      coalesce(NEW.metadata->>'change_reason', 'content_update'),
      NEW.version,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_project_knowledge_audit_trigger ON public.project_knowledge;
CREATE TRIGGER trg_project_knowledge_audit_trigger
  BEFORE UPDATE ON public.project_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_project_knowledge_audit();

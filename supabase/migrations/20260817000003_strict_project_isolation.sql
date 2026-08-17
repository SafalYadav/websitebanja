-- Migration: 20260817000003_strict_project_isolation.sql
-- Description: Enforce strict multi-tenant project scoping and RLS isolation across projects, catalogs, snapshots, and storage.

-- 1. Tighten RLS on projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published projects are viewable by everyone." ON public.projects;
DROP POLICY IF EXISTS "Users can view own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can insert own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON public.projects;

-- Projects SELECT: Owner, site member, or public if published
CREATE POLICY "Projects select policy"
ON public.projects FOR SELECT
TO authenticated, anon
USING (
  user_id = auth.uid()
  OR is_published = true
  OR EXISTS (
    SELECT 1 FROM public.website_members
    WHERE website_members.project_id = projects.id
      AND website_members.user_id = auth.uid()
  )
);

-- Projects INSERT: Only authenticated users for themselves
CREATE POLICY "Projects insert policy"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Projects UPDATE: Owner or authorized site members (OWNER, ADMIN, EDITOR)
CREATE POLICY "Projects update policy"
ON public.projects FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.website_members
    WHERE website_members.project_id = projects.id
      AND website_members.user_id = auth.uid()
      AND website_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.website_members
    WHERE website_members.project_id = projects.id
      AND website_members.user_id = auth.uid()
      AND website_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
  )
);

-- Projects DELETE: Only project creator / owner
CREATE POLICY "Projects delete policy"
ON public.projects FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- 2. Tighten RLS on catalog_items table
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Catalog items are viewable by everyone" ON public.catalog_items;
DROP POLICY IF EXISTS "Users can manage their own catalog items" ON public.catalog_items;
DROP POLICY IF EXISTS "Public can view catalog items for published projects" ON public.catalog_items;
DROP POLICY IF EXISTS "Project owners and website members can manage catalog_items" ON public.catalog_items;

-- Catalog items SELECT:
-- 1) Project owner
-- 2) Website members
-- 3) Public (anon/authenticated) ONLY IF parent project is published
CREATE POLICY "Catalog items select policy"
ON public.catalog_items FOR SELECT
TO authenticated, anon
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = catalog_items.project_id
      AND (projects.is_published = true OR projects.user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.website_members
    WHERE website_members.project_id = catalog_items.project_id
      AND website_members.user_id = auth.uid()
  )
);

-- Catalog items INSERT: User must own the parent project or be an authorized member
CREATE POLICY "Catalog items insert policy"
ON public.catalog_items FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = catalog_items.project_id
        AND projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.website_members
      WHERE website_members.project_id = catalog_items.project_id
        AND website_members.user_id = auth.uid()
        AND website_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  )
);

-- Catalog items UPDATE: User must own the parent project or be an authorized member
CREATE POLICY "Catalog items update policy"
ON public.catalog_items FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = catalog_items.project_id
        AND projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.website_members
      WHERE website_members.project_id = catalog_items.project_id
        AND website_members.user_id = auth.uid()
        AND website_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = catalog_items.project_id
        AND projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.website_members
      WHERE website_members.project_id = catalog_items.project_id
        AND website_members.user_id = auth.uid()
        AND website_members.role IN ('OWNER', 'ADMIN', 'EDITOR')
    )
  )
);

-- Catalog items DELETE: User must own the parent project or be OWNER/ADMIN member
CREATE POLICY "Catalog items delete policy"
ON public.catalog_items FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = catalog_items.project_id
        AND projects.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.website_members
      WHERE website_members.project_id = catalog_items.project_id
        AND website_members.user_id = auth.uid()
        AND website_members.role IN ('OWNER', 'ADMIN')
    )
  )
);


-- 3. Tighten RLS on published_versions table
ALTER TABLE public.published_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Published versions are viewable by everyone" ON public.published_versions;
DROP POLICY IF EXISTS "Project owners can insert published versions" ON public.published_versions;
DROP POLICY IF EXISTS "Project owners can manage published versions" ON public.published_versions;

-- Published versions SELECT: Viewable if parent project is published or user owns project
CREATE POLICY "Published versions select policy"
ON public.published_versions FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = published_versions.project_id
      AND (projects.is_published = true OR projects.user_id = auth.uid())
  )
);

-- Published versions INSERT: Only project owner
CREATE POLICY "Published versions insert policy"
ON public.published_versions FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = published_versions.project_id
      AND projects.user_id = auth.uid()
  )
);

-- Published versions DELETE: Only project owner
CREATE POLICY "Published versions delete policy"
ON public.published_versions FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = published_versions.project_id
      AND projects.user_id = auth.uid()
  )
);


-- 4. Storage Bucket Configuration for project-assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-assets', 'project-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Project assets select" ON storage.objects;
DROP POLICY IF EXISTS "Project assets insert" ON storage.objects;
DROP POLICY IF EXISTS "Project assets delete" ON storage.objects;

-- Assets SELECT: Public read
CREATE POLICY "Project assets select"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-assets');

-- Assets INSERT: Authenticated users can upload to project folder they own
CREATE POLICY "Project assets insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-assets'
  AND (
    -- Project-scoped path: {project_id}/uploads/{filename}
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id::text = (storage.foldername(storage.objects.name))[1]
        AND projects.user_id = auth.uid()
    )
    OR (storage.foldername(storage.objects.name))[1] = 'general'
  )
);

-- Assets DELETE: Authenticated project owners
CREATE POLICY "Project assets delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id::text = (storage.foldername(storage.objects.name))[1]
      AND projects.user_id = auth.uid()
  )
);

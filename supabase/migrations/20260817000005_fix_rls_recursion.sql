-- Migration: 20260817000005_fix_rls_recursion.sql
-- Description: Completely resolve RLS infinite recursion by replacing circular dependencies with SECURITY DEFINER helpers. Introduces atomic publish RPC.

-- =====================================================================================
-- 0. ENSURE ALL REQUIRED COLUMNS EXIST ON PROJECTS TABLE
-- =====================================================================================
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_message TEXT DEFAULT 'Hi, I found your website and would like to know more about your services.',
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT true;

-- =====================================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS (Strict non-recursive lookup)
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.is_project_owner(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_website_member(project_uuid uuid, required_roles public.admin_role[] DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.website_members
    WHERE project_id = project_uuid 
      AND user_id = auth.uid()
      AND (required_roles IS NULL OR role = ANY(required_roles))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_published(project_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = project_uuid AND is_published = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_owner_text(project_id_text text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id::text = project_id_text AND user_id = auth.uid()
  );
EXCEPTION
  WHEN invalid_text_representation THEN
    RETURN false;
END;
$$;

-- =====================================================================================
-- 2. PUBLIC PROJECT LOOKUP RPC (Prevents exposing json_data via RLS)
-- =====================================================================================

CREATE OR REPLACE FUNCTION public.get_published_project_by_slug(p_slug text, p_slug_decoded text)
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  user_id uuid,
  name text,
  business_name text,
  category text,
  description text,
  target_audience text,
  style text,
  primary_color text,
  secondary_color text,
  phone text,
  email text,
  website text,
  instagram text,
  facebook text,
  address text,
  is_published boolean,
  public_slug text,
  published_at timestamptz,
  custom_domain text,
  whatsapp_number text,
  whatsapp_message text,
  whatsapp_enabled boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT 
    id, created_at, user_id, name, business_name, category, description, target_audience,
    style, primary_color, secondary_color, phone, email, website, instagram, facebook,
    address, is_published, public_slug, published_at, custom_domain, whatsapp_number,
    whatsapp_message, whatsapp_enabled
  FROM public.projects
  WHERE is_published = true 
    AND (public_slug = p_slug OR public_slug = p_slug_decoded)
  LIMIT 1;
$$;

-- Revoke default public execute to be safe, then grant explicitly to API roles
REVOKE EXECUTE ON FUNCTION public.get_published_project_by_slug(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_project_by_slug(text, text) TO anon, authenticated;

-- =====================================================================================
-- 3. DROP ALL EXISTING RECURSIVE POLICIES
-- =====================================================================================

-- projects
DROP POLICY IF EXISTS "Projects select policy" ON public.projects;
DROP POLICY IF EXISTS "Projects insert policy" ON public.projects;
DROP POLICY IF EXISTS "Projects update policy" ON public.projects;
DROP POLICY IF EXISTS "Projects delete policy" ON public.projects;

-- website_members
DROP POLICY IF EXISTS "Website members are viewable by project owner and members" ON public.website_members;
DROP POLICY IF EXISTS "Project owners and OWNER/ADMIN members can manage members" ON public.website_members;

-- catalog_items
DROP POLICY IF EXISTS "Catalog items select policy" ON public.catalog_items;
DROP POLICY IF EXISTS "Catalog items insert policy" ON public.catalog_items;
DROP POLICY IF EXISTS "Catalog items update policy" ON public.catalog_items;
DROP POLICY IF EXISTS "Catalog items delete policy" ON public.catalog_items;
DROP POLICY IF EXISTS "Catalog items are viewable by everyone" ON public.catalog_items;
DROP POLICY IF EXISTS "Project owners and website members can manage catalog_items" ON public.catalog_items;
DROP POLICY IF EXISTS "Users can manage their own catalog items" ON public.catalog_items;
DROP POLICY IF EXISTS "Public can view catalog items for published projects" ON public.catalog_items;

-- preview_links
DROP POLICY IF EXISTS "Allow authenticated users to create preview links for their projects" ON public.preview_links;

-- published_versions
DROP POLICY IF EXISTS "Published versions select policy" ON public.published_versions;
DROP POLICY IF EXISTS "Published versions insert policy" ON public.published_versions;
DROP POLICY IF EXISTS "Published versions delete policy" ON public.published_versions;
DROP POLICY IF EXISTS "Published versions are viewable by everyone" ON public.published_versions;
DROP POLICY IF EXISTS "Project owners can insert published versions" ON public.published_versions;
DROP POLICY IF EXISTS "Project owners can manage published versions" ON public.published_versions;

-- storage.objects (project-assets)
DROP POLICY IF EXISTS "Project assets select" ON storage.objects;
DROP POLICY IF EXISTS "Project assets insert" ON storage.objects;
DROP POLICY IF EXISTS "Project assets delete" ON storage.objects;


-- =====================================================================================
-- 4. RECREATE POLICIES USING NON-RECURSIVE HELPERS
-- =====================================================================================

-- PROJECTS ----------------------------------------------------------------------------
CREATE POLICY "Projects select policy"
ON public.projects FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_website_member(id)
);

CREATE POLICY "Projects insert policy"
ON public.projects FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Projects update policy"
ON public.projects FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_website_member(id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
)
WITH CHECK (
  user_id = auth.uid()
  OR public.is_website_member(id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
);

CREATE POLICY "Projects delete policy"
ON public.projects FOR DELETE
TO authenticated
USING (user_id = auth.uid());


-- WEBSITE MEMBERS ---------------------------------------------------------------------
CREATE POLICY "Website members select policy"
ON public.website_members FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_project_owner(project_id)
  OR public.is_website_member(project_id)
);

CREATE POLICY "Website members manage policy"
ON public.website_members FOR ALL
TO authenticated
USING (
  public.is_project_owner(project_id)
  OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
)
WITH CHECK (
  public.is_project_owner(project_id)
  OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
);


-- CATALOG ITEMS -----------------------------------------------------------------------
CREATE POLICY "Catalog items select policy"
ON public.catalog_items FOR SELECT
TO authenticated, anon
USING (
  user_id = auth.uid()
  OR public.is_project_published(project_id)
  OR public.is_project_owner(project_id)
  OR public.is_website_member(project_id)
);

CREATE POLICY "Catalog items insert policy"
ON public.catalog_items FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
  )
);

CREATE POLICY "Catalog items update policy"
ON public.catalog_items FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
  )
);

CREATE POLICY "Catalog items delete policy"
ON public.catalog_items FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND (
    public.is_project_owner(project_id)
    OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
  )
);


-- PREVIEW LINKS -----------------------------------------------------------------------
CREATE POLICY "Allow authenticated users to create preview links for their projects"
ON public.preview_links FOR INSERT
TO authenticated
WITH CHECK (
  public.is_project_owner(project_id)
  OR public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
);


-- PUBLISHED VERSIONS ------------------------------------------------------------------
CREATE POLICY "Published versions select policy"
ON public.published_versions FOR SELECT
TO authenticated, anon
USING (
  public.is_project_published(project_id)
  OR public.is_project_owner(project_id)
);

CREATE POLICY "Published versions manage policy"
ON public.published_versions FOR ALL
TO authenticated
USING (
  public.is_project_owner(project_id)
)
WITH CHECK (
  public.is_project_owner(project_id)
);


-- STORAGE BUCKETS (project-assets) ----------------------------------------------------
CREATE POLICY "Project assets select"
ON storage.objects FOR SELECT
USING (bucket_id = 'project-assets');

CREATE POLICY "Project assets insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-assets'
  AND (
    public.is_project_owner_text((storage.foldername(name))[1])
    OR (storage.foldername(name))[1] = 'general'
  )
);

CREATE POLICY "Project assets delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-assets'
  AND public.is_project_owner_text((storage.foldername(name))[1])
);


-- =====================================================================================
-- 5. ATOMIC PUBLISH RPC FUNCTION
-- =====================================================================================
CREATE OR REPLACE FUNCTION public.publish_project_atomic(
  p_project_id uuid,
  p_slug text,
  p_snapshot_data jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Authorization: Ensure caller owns the project
  IF NOT EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: Only the project owner can publish this project.';
  END IF;

  -- 2. Insert new immutable snapshot (Fails transaction if constraints violated)
  INSERT INTO public.published_versions (project_id, snapshot_data)
  VALUES (p_project_id, p_snapshot_data);

  -- 3. Update project record to point to the new live state
  UPDATE public.projects
  SET is_published = true,
      public_slug = p_slug,
      published_at = NOW(),
      preview_expires_at = NULL,
      json_data = p_snapshot_data
  WHERE id = p_project_id;
END;
$$;

-- Reload schema cache to instantly reflect RPC and policy changes
NOTIFY pgrst, 'reload schema';

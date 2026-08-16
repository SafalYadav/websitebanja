-- Create admin role enum
DO $$ BEGIN
    CREATE TYPE public.admin_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'STAFF');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Published Versions Table
CREATE TABLE IF NOT EXISTS public.published_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    snapshot_data JSONB NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.published_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published versions are viewable by everyone"
ON public.published_versions FOR SELECT
USING (true);

CREATE POLICY "Project owners can insert published versions"
ON public.published_versions FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = project_id AND user_id = auth.uid()
    )
);

CREATE POLICY "Project owners can manage published versions"
ON public.published_versions FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = project_id AND user_id = auth.uid()
    )
);


-- 2. Website Members Table
CREATE TABLE IF NOT EXISTS public.website_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.admin_role NOT NULL DEFAULT 'STAFF',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

ALTER TABLE public.website_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Website members are viewable by project owner and members"
ON public.website_members FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = project_id AND user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.website_members AS wm
        WHERE wm.project_id = website_members.project_id AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Project owners and OWNER/ADMIN members can manage members"
ON public.website_members FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = project_id AND user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.website_members AS wm
        WHERE wm.project_id = website_members.project_id AND wm.user_id = auth.uid() AND wm.role IN ('OWNER', 'ADMIN')
    )
);

-- Update RLS for catalog_items to include website_members
DROP POLICY IF EXISTS "Catalog items are viewable by everyone" ON public.catalog_items;
DROP POLICY IF EXISTS "Project owners can manage catalog_items" ON public.catalog_items;

CREATE POLICY "Catalog items are viewable by everyone"
ON public.catalog_items FOR SELECT
USING (true);

CREATE POLICY "Project owners and website members can manage catalog_items"
ON public.catalog_items FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.projects
        WHERE id = project_id AND user_id = auth.uid()
    ) OR
    EXISTS (
        SELECT 1 FROM public.website_members AS wm
        WHERE wm.project_id = catalog_items.project_id AND wm.user_id = auth.uid()
    )
);

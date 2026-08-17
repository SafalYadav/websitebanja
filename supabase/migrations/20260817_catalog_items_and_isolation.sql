-- ====================================================================
-- WebsiteBanja Consolidated Database Migration: Catalog & Strict Isolation
-- Target Supabase Project: pllcuqjbaulowcnpwske
-- ====================================================================

-- 1. Create catalog_items Table
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Core Fields
  name text NOT NULL,
  description text,
  item_type text DEFAULT 'product', -- 'product', 'rental', 'service', 'showcase'
  category text DEFAULT 'General',
  status text DEFAULT 'active', -- 'active', 'draft', 'out_of_stock'
  
  -- Images (Array of URLs)
  images text[] DEFAULT '{}',
  
  -- Pricing (Standard & Services)
  price numeric,
  original_price numeric,
  currency_code text DEFAULT 'INR',
  show_discount_badge boolean DEFAULT true,
  
  -- Pricing (Rentals)
  hourly_price numeric,
  daily_price numeric,
  weekly_price numeric,
  monthly_price numeric,

  -- Call to Action & Actions
  cta_text text DEFAULT 'Order on WhatsApp',
  cta_link text,
  button_action jsonb, -- e.g. {"type": "whatsapp", "target": "+91..."}
  
  -- Display properties
  display_order integer DEFAULT 0,
  badge text,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_catalog_items_project ON public.catalog_items(project_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_order ON public.catalog_items(display_order);
CREATE INDEX IF NOT EXISTS idx_catalog_items_user ON public.catalog_items(user_id);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any previous policies
DROP POLICY IF EXISTS "Catalog items are viewable by everyone" ON public.catalog_items;
DROP POLICY IF EXISTS "Users can manage their own catalog items" ON public.catalog_items;
DROP POLICY IF EXISTS "Public can view catalog items for published projects" ON public.catalog_items;
DROP POLICY IF EXISTS "Project owners and website members can manage catalog_items" ON public.catalog_items;
DROP POLICY IF EXISTS "Catalog items select policy" ON public.catalog_items;
DROP POLICY IF EXISTS "Catalog items insert policy" ON public.catalog_items;
DROP POLICY IF EXISTS "Catalog items update policy" ON public.catalog_items;
DROP POLICY IF EXISTS "Catalog items delete policy" ON public.catalog_items;

-- 5. Strict SELECT policy: Project owner or public (if project is published)
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
);

-- 6. Strict INSERT policy: User must own the parent project
CREATE POLICY "Catalog items insert policy"
ON public.catalog_items FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = catalog_items.project_id
      AND projects.user_id = auth.uid()
  )
);

-- 7. Strict UPDATE policy: User must own the parent project
CREATE POLICY "Catalog items update policy"
ON public.catalog_items FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = catalog_items.project_id
      AND projects.user_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = catalog_items.project_id
      AND projects.user_id = auth.uid()
  )
);

-- 8. Strict DELETE policy: User must own the parent project
CREATE POLICY "Catalog items delete policy"
ON public.catalog_items FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = catalog_items.project_id
      AND projects.user_id = auth.uid()
  )
);

-- 9. Trigger for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_catalog_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_catalog_items_updated_at ON public.catalog_items;
CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_catalog_items_updated_at_column();

-- 10. Reload PostgREST Schema Cache
NOTIFY pgrst, 'reload schema';

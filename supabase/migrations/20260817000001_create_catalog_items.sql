CREATE TABLE IF NOT EXISTS public.catalog_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Core Fields
  name text NOT NULL,
  description text,
  item_type text DEFAULT 'product', -- 'product', 'rental', 'service', 'showcase'
  category text,
  status text DEFAULT 'active', -- 'active', 'draft', 'out_of_stock'
  
  -- Images (Array of URLs)
  images text[] DEFAULT '{}',
  
  -- Pricing (Standard & Services)
  price numeric,
  original_price numeric,
  currency_code text DEFAULT 'USD',
  show_discount_badge boolean DEFAULT true,
  
  -- Pricing (Rentals)
  hourly_price numeric,
  daily_price numeric,
  weekly_price numeric,
  monthly_price numeric,

  -- Call to Action Overrides
  cta_text text,
  cta_link text,
  button_action jsonb, -- e.g. {"type": "scroll", "target": "contact"}
  
  -- Display properties
  display_order integer DEFAULT 0,
  badge text,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index for fast retrieval by project
CREATE INDEX IF NOT EXISTS idx_catalog_items_project ON public.catalog_items(project_id);
-- Index for display ordering
CREATE INDEX IF NOT EXISTS idx_catalog_items_order ON public.catalog_items(display_order);

-- Enable RLS
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can read, insert, update, delete their OWN catalog items
CREATE POLICY "Users can manage their own catalog items"
ON public.catalog_items FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 2: Public can read catalog items ONLY IF the parent project is published
CREATE POLICY "Public can view catalog items for published projects"
ON public.catalog_items FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = catalog_items.project_id
    AND projects.is_published = true
  )
);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_catalog_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_catalog_items_updated_at_column();

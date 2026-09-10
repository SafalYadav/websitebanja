-- =====================================================================================
-- WebsiteBanja AI — Azure Database for PostgreSQL Flexible Server Baseline Schema
-- Target: PostgreSQL 15+ (Azure Database for PostgreSQL Flexible Server)
-- Generated: 2026-09-07
-- Description: Complete standalone schema definition including extensions, auth shims,
--              enums, tables, constraints, indexes, PL/pgSQL functions, triggers, and RLS.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. EXTENSIONS (PostgreSQL 17 core natively provides gen_random_uuid())
-- -------------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pgcrypto extension skipped (core gen_random_uuid is used).'; END $$;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'uuid-ossp extension skipped.'; END $$;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'pg_trgm extension skipped.'; END $$;

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "btree_gin";
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'btree_gin extension skipped.'; END $$;

-- -------------------------------------------------------------------------------------
-- 2. AUTHENTICATION COMPATIBILITY SHIM (Schema auth & stub users table)
--    Enables 100% referential integrity and RLS compatibility on Azure PostgreSQL
--    before the dedicated Auth migration phase.
-- -------------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  raw_app_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Returns the active user ID from JWT claim (or app connection context in Azure)
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    NULLIF(current_setting('app.current_user_id', true), '')
  )::uuid;
$$;

-- -------------------------------------------------------------------------------------
-- 3. ENUMS
-- -------------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.admin_role AS ENUM ('OWNER', 'ADMIN', 'EDITOR', 'STAFF');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- -------------------------------------------------------------------------------------
-- 4. CORE TABLES (Dependency Order)
-- -------------------------------------------------------------------------------------

-- Table 1: projects
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT,
  template TEXT,
  published BOOLEAN DEFAULT false,
  business_name TEXT,
  category TEXT,
  description TEXT,
  target_audience TEXT,
  style TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  instagram TEXT,
  facebook TEXT,
  address TEXT,
  json_data JSONB DEFAULT '{}'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  public_slug TEXT,
  published_at TIMESTAMPTZ,
  preview_expires_at TIMESTAMPTZ,
  custom_domain TEXT,
  custom_domain_status TEXT DEFAULT 'none',
  custom_domain_verified_at TIMESTAMPTZ,
  whatsapp_number TEXT,
  whatsapp_message TEXT DEFAULT 'Hi, I found your website and would like to know more about your services.',
  whatsapp_enabled BOOLEAN DEFAULT true,
  backend_requirement TEXT DEFAULT 'static',
  backend_config JSONB DEFAULT '{}'::jsonb,
  onboarding_mode TEXT DEFAULT 'fast',
  user_prompt TEXT,
  selected_features JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 2: subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'free', -- 'free', 'active_paid', 'cancelled', 'expired'
  amount_inr NUMERIC DEFAULT 0,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- Table 3: website_members
CREATE TABLE IF NOT EXISTS public.website_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.admin_role NOT NULL DEFAULT 'STAFF',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- Table 4: catalog_items
CREATE TABLE IF NOT EXISTS public.catalog_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT DEFAULT 'product', -- 'product', 'rental', 'service', 'showcase'
  category TEXT DEFAULT 'General',
  status TEXT DEFAULT 'active', -- 'active', 'draft', 'out_of_stock'
  images TEXT[] DEFAULT '{}',
  price NUMERIC,
  original_price NUMERIC,
  currency_code TEXT DEFAULT 'INR',
  show_discount_badge BOOLEAN DEFAULT true,
  hourly_price NUMERIC,
  daily_price NUMERIC,
  weekly_price NUMERIC,
  monthly_price NUMERIC,
  cta_text TEXT DEFAULT 'Order on WhatsApp',
  cta_link TEXT,
  button_action JSONB,
  display_order INTEGER DEFAULT 0,
  badge TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Table 5: published_versions
CREATE TABLE IF NOT EXISTS public.published_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  snapshot_data JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 6: preview_links
CREATE TABLE IF NOT EXISTS public.preview_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  json_data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 7: analytics_events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table 8: project_knowledge
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

-- Table 9: project_knowledge_revisions
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

-- -------------------------------------------------------------------------------------
-- 5. INDEXES (Existing + Critical Performance Additions)
-- -------------------------------------------------------------------------------------
-- Projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_custom_domain ON public.projects(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_public_slug ON public.projects(public_slug) WHERE public_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_is_published ON public.projects(is_published);

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- Catalog items indexes
CREATE INDEX IF NOT EXISTS idx_catalog_items_project ON public.catalog_items(project_id);
CREATE INDEX IF NOT EXISTS idx_catalog_items_order ON public.catalog_items(display_order);
CREATE INDEX IF NOT EXISTS idx_catalog_items_user ON public.catalog_items(user_id);

-- Analytics events indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_project_time ON public.analytics_events(project_id, created_at DESC);

-- Preview links indexes
CREATE INDEX IF NOT EXISTS idx_preview_links_expires_at ON public.preview_links(expires_at);

-- Project knowledge indexes
CREATE INDEX IF NOT EXISTS idx_project_knowledge_project_id ON public.project_knowledge(project_id);
CREATE INDEX IF NOT EXISTS idx_project_knowledge_user_id ON public.project_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_project_knowledge_cat_key ON public.project_knowledge(category, key);
CREATE INDEX IF NOT EXISTS idx_project_knowledge_content_gin ON public.project_knowledge USING gin (content);
CREATE INDEX IF NOT EXISTS idx_project_knowledge_rev_pk ON public.project_knowledge_revisions(project_knowledge_id);
CREATE INDEX IF NOT EXISTS idx_project_knowledge_rev_project ON public.project_knowledge_revisions(project_id, category, key);

-- -------------------------------------------------------------------------------------
-- 6. SECURITY & PL/pgSQL FUNCTIONS
-- -------------------------------------------------------------------------------------

-- Function 1: update_catalog_items_updated_at_column
CREATE OR REPLACE FUNCTION public.update_catalog_items_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function 2: is_project_owner
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

-- Function 3: is_website_member
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

-- Function 4: is_project_published
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

-- Function 5: is_project_owner_text
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

-- Function 6: get_published_project_by_slug
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
  json_data jsonb,
  is_published boolean,
  public_slug text,
  published_at timestamptz,
  preview_expires_at timestamptz,
  custom_domain text,
  custom_domain_status text,
  custom_domain_verified_at timestamptz,
  whatsapp_number text,
  whatsapp_message text,
  whatsapp_enabled boolean,
  backend_requirement text,
  backend_config jsonb,
  onboarding_mode text,
  user_prompt text,
  selected_features jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.created_at,
    p.user_id,
    p.name,
    p.business_name,
    p.category,
    p.description,
    p.target_audience,
    p.style,
    p.primary_color,
    p.secondary_color,
    p.phone,
    p.email,
    p.website,
    p.instagram,
    p.facebook,
    p.address,
    (p.json_data - 'leads' - 'private_notes') AS json_data,
    p.is_published,
    p.public_slug,
    p.published_at,
    p.preview_expires_at,
    p.custom_domain,
    p.custom_domain_status,
    p.custom_domain_verified_at,
    p.whatsapp_number,
    p.whatsapp_message,
    p.whatsapp_enabled,
    p.backend_requirement,
    p.backend_config,
    p.onboarding_mode,
    p.user_prompt,
    p.selected_features
  FROM public.projects p
  WHERE (p.public_slug = p_slug OR p.public_slug = p_slug_decoded)
    AND p.is_published = true
  LIMIT 1;
END;
$$;

-- Function 7: publish_project_atomic
CREATE OR REPLACE FUNCTION public.publish_project_atomic(
  p_project_id uuid,
  p_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_next_version integer;
  v_project_data jsonb;
  v_clean_snapshot jsonb;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required.';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.projects WHERE id = p_project_id AND user_id = v_user_id) OR
    EXISTS (SELECT 1 FROM public.website_members WHERE project_id = p_project_id AND user_id = v_user_id AND role IN ('OWNER', 'ADMIN'))
  ) THEN
    RAISE EXCEPTION 'Forbidden: Insufficient privileges to publish this project.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects 
    WHERE public_slug = p_slug 
      AND id != p_project_id
  ) THEN
    RAISE EXCEPTION 'Slug "%" is already in use by another website banja project.', p_slug;
  END IF;

  SELECT json_data INTO v_project_data
  FROM public.projects
  WHERE id = p_project_id;

  v_clean_snapshot := v_project_data - 'leads' - 'private_notes';

  UPDATE public.projects
  SET 
    is_published = true,
    published_at = now(),
    public_slug = p_slug,
    updated_at = now()
  WHERE id = p_project_id;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next_version
  FROM public.published_versions
  WHERE project_id = p_project_id;

  INSERT INTO public.published_versions (
    project_id,
    version,
    snapshot_data,
    published_at
  ) VALUES (
    p_project_id,
    v_next_version,
    v_clean_snapshot,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'version', v_next_version,
    'public_slug', p_slug
  );
END;
$$;

-- Function 8: get_preview_project
CREATE OR REPLACE FUNCTION public.get_preview_project(p_preview_id uuid)
RETURNS TABLE (
  id uuid,
  project_id uuid,
  json_data jsonb,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.id,
    pl.project_id,
    (pl.json_data - 'leads' - 'private_notes') AS json_data,
    pl.expires_at,
    pl.created_at
  FROM public.preview_links pl
  WHERE pl.id = p_preview_id
    AND pl.expires_at > now()
  LIMIT 1;
END;
$$;

-- Function 9: get_preview_catalog
CREATE OR REPLACE FUNCTION public.get_preview_catalog(p_preview_id uuid)
RETURNS SETOF public.catalog_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_project_id uuid;
BEGIN
  SELECT pl.project_id INTO v_project_id
  FROM public.preview_links pl
  WHERE pl.id = p_preview_id
    AND pl.expires_at > now();

  IF v_project_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.catalog_items ci
  WHERE ci.project_id = v_project_id
    AND ci.status = 'active'
  ORDER BY ci.display_order ASC, ci.created_at ASC;
END;
$$;

-- Function 10: append_lead_to_project
CREATE OR REPLACE FUNCTION public.append_lead_to_project(
  p_project_id uuid,
  p_lead jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.projects
  SET json_data = jsonb_set(
    COALESCE(json_data, '{}'::jsonb),
    '{leads}',
    COALESCE(json_data->'leads', '[]'::jsonb) || jsonb_build_array(p_lead),
    true
  )
  WHERE id = p_project_id;
END;
$$;

-- Function 11: is_valid_lead_payload
CREATE OR REPLACE FUNCTION public.is_valid_lead_payload(p_lead jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    jsonb_typeof(p_lead) = 'object'
    AND (
      p_lead ? 'name' OR p_lead ? 'phone' OR p_lead ? 'email' OR p_lead ? 'message'
    )
  );
$$;

-- Function 12: submit_public_lead
CREATE OR REPLACE FUNCTION public.submit_public_lead(
  p_project_id uuid,
  p_lead jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_published boolean;
BEGIN
  SELECT is_published INTO v_is_published
  FROM public.projects
  WHERE id = p_project_id;

  IF v_is_published IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: target project is not published.';
  END IF;

  IF NOT public.is_valid_lead_payload(p_lead) THEN
    RAISE EXCEPTION 'Invalid lead payload format.';
  END IF;

  PERFORM public.append_lead_to_project(p_project_id, p_lead);

  INSERT INTO public.analytics_events (
    project_id,
    event_type,
    metadata,
    created_at
  ) VALUES (
    p_project_id,
    'lead_submitted',
    jsonb_build_object('timestamp', now()),
    now()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function 13: record_public_site_event
CREATE OR REPLACE FUNCTION public.record_public_site_event(
  p_project_id uuid,
  p_event_type text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_published boolean;
BEGIN
  SELECT is_published INTO v_is_published
  FROM public.projects
  WHERE id = p_project_id;

  IF v_is_published IS NOT TRUE THEN
    RAISE EXCEPTION 'Target project is not published';
  END IF;

  INSERT INTO public.analytics_events (
    project_id,
    event_type,
    metadata,
    created_at
  ) VALUES (
    p_project_id,
    p_event_type,
    COALESCE(p_metadata, '{}'::jsonb),
    now()
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function 14: get_preview_snapshot
CREATE OR REPLACE FUNCTION public.get_preview_snapshot(p_preview_id uuid)
RETURNS TABLE (
  project_id uuid,
  json_data jsonb,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.project_id,
    (pl.json_data - 'leads' - 'private_notes') AS json_data,
    pl.expires_at
  FROM public.preview_links pl
  WHERE pl.id = p_preview_id
    AND pl.expires_at > now()
  LIMIT 1;
END;
$$;

-- Function 15: prevent_project_owner_reassignment
CREATE OR REPLACE FUNCTION public.prevent_project_owner_reassignment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.user_id IS NOT NULL AND NEW.user_id != OLD.user_id THEN
    RAISE EXCEPTION 'Security Violation: Project owner reassignment is strictly prohibited.';
  END IF;
  RETURN NEW;
END;
$$;

-- Function 16: strip_leads_from_snapshot
CREATE OR REPLACE FUNCTION public.strip_leads_from_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.snapshot_data IS NOT NULL THEN
    NEW.snapshot_data := NEW.snapshot_data - 'leads' - 'private_notes';
  END IF;
  RETURN NEW;
END;
$$;

-- Function 17: strip_leads_from_preview
CREATE OR REPLACE FUNCTION public.strip_leads_from_preview()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.json_data IS NOT NULL THEN
    NEW.json_data := NEW.json_data - 'leads' - 'private_notes';
  END IF;
  RETURN NEW;
END;
$$;

-- Function 18: trg_project_knowledge_audit
CREATE OR REPLACE FUNCTION public.trg_project_knowledge_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF (OLD.content = NEW.content AND OLD.key = NEW.key AND OLD.category = NEW.category) THEN
      RETURN NEW;
    END IF;

    NEW.version := OLD.version + 1;
    NEW.updated_at := now();

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
      NEW.id,
      NEW.project_id,
      NEW.user_id,
      NEW.category,
      NEW.key,
      OLD.content,
      NEW.content,
      COALESCE(NEW.metadata->>'change_reason', 'update'),
      NEW.version,
      now()
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    NEW.version := 1;
    NEW.created_at := now();
    NEW.updated_at := now();

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
      NEW.id,
      NEW.project_id,
      NEW.user_id,
      NEW.category,
      NEW.key,
      NULL,
      NEW.content,
      'initial_creation',
      1,
      now()
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- -------------------------------------------------------------------------------------
-- 7. TRIGGERS
-- -------------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_catalog_items_updated_at ON public.catalog_items;
CREATE TRIGGER update_catalog_items_updated_at
  BEFORE UPDATE ON public.catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_catalog_items_updated_at_column();

DROP TRIGGER IF EXISTS projects_prevent_owner_reassignment ON public.projects;
CREATE TRIGGER projects_prevent_owner_reassignment
  BEFORE UPDATE OF user_id ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_project_owner_reassignment();

DROP TRIGGER IF EXISTS published_versions_strip_leads ON public.published_versions;
CREATE TRIGGER published_versions_strip_leads
  BEFORE INSERT OR UPDATE OF snapshot_data ON public.published_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_leads_from_snapshot();

DROP TRIGGER IF EXISTS preview_links_strip_leads ON public.preview_links;
CREATE TRIGGER preview_links_strip_leads
  BEFORE INSERT OR UPDATE OF json_data ON public.preview_links
  FOR EACH ROW
  EXECUTE FUNCTION public.strip_leads_from_preview();

DROP TRIGGER IF EXISTS trg_project_knowledge_audit_trigger ON public.project_knowledge;
CREATE TRIGGER trg_project_knowledge_audit_trigger
  BEFORE UPDATE ON public.project_knowledge
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_project_knowledge_audit();

-- -------------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.published_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preview_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_knowledge_revisions ENABLE ROW LEVEL SECURITY;

-- Projects policies
DROP POLICY IF EXISTS "Projects select policy" ON public.projects;
CREATE POLICY "Projects select policy" ON public.projects FOR SELECT
USING (
  user_id = auth.uid() OR
  is_published = true OR
  public.is_website_member(id)
);

DROP POLICY IF EXISTS "Projects insert policy" ON public.projects;
CREATE POLICY "Projects insert policy" ON public.projects FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Projects update policy" ON public.projects;
CREATE POLICY "Projects update policy" ON public.projects FOR UPDATE
USING (
  user_id = auth.uid() OR
  public.is_website_member(id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
)
WITH CHECK (
  user_id = auth.uid() OR
  public.is_website_member(id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
);

DROP POLICY IF EXISTS "Projects delete policy" ON public.projects;
CREATE POLICY "Projects delete policy" ON public.projects FOR DELETE
USING (user_id = auth.uid());

-- Subscriptions policies
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription" ON public.subscriptions FOR SELECT
USING (user_id = auth.uid());

-- Website members policies
DROP POLICY IF EXISTS "Website members select policy" ON public.website_members;
CREATE POLICY "Website members select policy" ON public.website_members FOR SELECT
USING (
  user_id = auth.uid() OR
  public.is_project_owner(project_id)
);

DROP POLICY IF EXISTS "Website members manage policy" ON public.website_members;
CREATE POLICY "Website members manage policy" ON public.website_members FOR ALL
USING (
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
);

-- Catalog items policies
DROP POLICY IF EXISTS "Catalog items select policy" ON public.catalog_items;
CREATE POLICY "Catalog items select policy" ON public.catalog_items FOR SELECT
USING (
  user_id = auth.uid() OR
  public.is_project_published(project_id) OR
  public.is_website_member(project_id)
);

DROP POLICY IF EXISTS "Catalog items insert policy" ON public.catalog_items;
CREATE POLICY "Catalog items insert policy" ON public.catalog_items FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
  )
);

DROP POLICY IF EXISTS "Catalog items update policy" ON public.catalog_items;
CREATE POLICY "Catalog items update policy" ON public.catalog_items FOR UPDATE
USING (
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
);

DROP POLICY IF EXISTS "Catalog items delete policy" ON public.catalog_items;
CREATE POLICY "Catalog items delete policy" ON public.catalog_items FOR DELETE
USING (
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
);

-- Published versions policies
DROP POLICY IF EXISTS "Published versions select policy" ON public.published_versions;
CREATE POLICY "Published versions select policy" ON public.published_versions FOR SELECT
USING (
  public.is_project_published(project_id) OR
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id)
);

DROP POLICY IF EXISTS "Published versions manage policy" ON public.published_versions;
CREATE POLICY "Published versions manage policy" ON public.published_versions FOR ALL
USING (
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
);

-- Preview links policies
DROP POLICY IF EXISTS "Preview links select policy" ON public.preview_links;
CREATE POLICY "Preview links select policy" ON public.preview_links FOR SELECT
USING (
  expires_at > now() OR
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id)
);

DROP POLICY IF EXISTS "Allow authenticated users to create preview links for their projects" ON public.preview_links;
CREATE POLICY "Allow authenticated users to create preview links for their projects" ON public.preview_links FOR INSERT
WITH CHECK (
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
);

-- Analytics events policies
DROP POLICY IF EXISTS "Analytics events insert policy" ON public.analytics_events;
CREATE POLICY "Analytics events insert policy" ON public.analytics_events FOR INSERT
WITH CHECK (
  user_id = auth.uid() OR
  user_id IS NULL
);

DROP POLICY IF EXISTS "Analytics events select policy" ON public.analytics_events;
CREATE POLICY "Analytics events select policy" ON public.analytics_events FOR SELECT
USING (
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
);

-- Project knowledge policies
DROP POLICY IF EXISTS "project_knowledge_select_policy" ON public.project_knowledge;
CREATE POLICY "project_knowledge_select_policy" ON public.project_knowledge FOR SELECT
USING (
  user_id = auth.uid() OR
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id)
);

DROP POLICY IF EXISTS "project_knowledge_insert_policy" ON public.project_knowledge;
CREATE POLICY "project_knowledge_insert_policy" ON public.project_knowledge FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
  )
);

DROP POLICY IF EXISTS "project_knowledge_update_policy" ON public.project_knowledge;
CREATE POLICY "project_knowledge_update_policy" ON public.project_knowledge FOR UPDATE
USING (
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
);

DROP POLICY IF EXISTS "project_knowledge_delete_policy" ON public.project_knowledge;
CREATE POLICY "project_knowledge_delete_policy" ON public.project_knowledge FOR DELETE
USING (
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN']::public.admin_role[])
);

-- Project knowledge revisions policies
DROP POLICY IF EXISTS "project_knowledge_revisions_select_policy" ON public.project_knowledge_revisions;
CREATE POLICY "project_knowledge_revisions_select_policy" ON public.project_knowledge_revisions FOR SELECT
USING (
  user_id = auth.uid() OR
  public.is_project_owner(project_id) OR
  public.is_website_member(project_id)
);

DROP POLICY IF EXISTS "project_knowledge_revisions_insert_policy" ON public.project_knowledge_revisions;
CREATE POLICY "project_knowledge_revisions_insert_policy" ON public.project_knowledge_revisions FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND (
    public.is_project_owner(project_id) OR
    public.is_website_member(project_id, ARRAY['OWNER', 'ADMIN', 'EDITOR']::public.admin_role[])
  )
);

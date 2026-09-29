-- azure-migration/02_leads_schema.sql
-- =====================================================================================
-- WebsiteBanja AI — Business Leads & Qualification Schema
-- Target: PostgreSQL 15+ (Azure Database for PostgreSQL Flexible Server)
-- Phase: Phase 8 (Business Discovery + Lead Qualification)
-- Description: Isolated multi-tenant storage for discovered business leads,
--              qualification scoring, opportunity metrics, and deduplication records.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.business_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL,
  business_name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  category TEXT NOT NULL,
  industry TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'India',
  postal_code TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  phone TEXT,
  normalized_phone TEXT,
  email TEXT,
  website TEXT,
  normalized_domain TEXT,
  website_status TEXT NOT NULL DEFAULT 'missing',
  social_links JSONB DEFAULT '{}'::jsonb,
  rating NUMERIC(3, 2),
  review_count INTEGER DEFAULT 0,
  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  qualification_status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW',
  lead_status TEXT NOT NULL DEFAULT 'DISCOVERED',
  qualification_score INTEGER NOT NULL DEFAULT 0,
  opportunity_score INTEGER NOT NULL DEFAULT 0,
  reason_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
  opportunity_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  duplicate_of TEXT,
  notes TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_leads_user_lead_id UNIQUE (user_id, lead_id)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.business_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_normalized_name ON public.business_leads(user_id, normalized_name);
CREATE INDEX IF NOT EXISTS idx_leads_user_phone ON public.business_leads(user_id, normalized_phone);
CREATE INDEX IF NOT EXISTS idx_leads_user_domain ON public.business_leads(user_id, normalized_domain);
CREATE INDEX IF NOT EXISTS idx_leads_user_qual_status ON public.business_leads(user_id, qualification_status);
CREATE INDEX IF NOT EXISTS idx_leads_user_lead_status ON public.business_leads(user_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_leads_source_identity ON public.business_leads(user_id, source, source_id);

-- Row Level Security (RLS) Multi-Tenant Policies
ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own business leads"
  ON public.business_leads
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

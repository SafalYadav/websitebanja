-- azure-migration/03_lead_audits_schema.sql
-- =====================================================================================
-- WebsiteBanja AI — Lead Audits & Research Schema
-- Target: PostgreSQL 15+ (Azure Database for PostgreSQL Flexible Server)
-- Phase: Phase 9 (Business Research + Website Audit Agent)
-- Description: Isolated multi-tenant storage for comprehensive website audits,
--              technical/UX/SEO/conversion metrics, and Phase 10 design handoffs.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS public.lead_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_id TEXT NOT NULL,
  lead_id TEXT NOT NULL,
  website_url TEXT,
  website_status TEXT NOT NULL DEFAULT 'unknown',
  pages_audited INTEGER NOT NULL DEFAULT 0,
  technical_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  mobile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ux_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  seo_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  conversion_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  accessibility_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  performance_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  opportunity_score INTEGER NOT NULL DEFAULT 0,
  opportunity_reasons TEXT[] DEFAULT ARRAY[]::TEXT[],
  recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
  phase10_design_inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  research_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  audited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_audits_user_audit_id UNIQUE (user_id, audit_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON public.lead_audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_lead_id ON public.lead_audits(user_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_audits_opportunity_score ON public.lead_audits(user_id, opportunity_score);

-- Row Level Security (RLS)
ALTER TABLE public.lead_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own lead audits"
  ON public.lead_audits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

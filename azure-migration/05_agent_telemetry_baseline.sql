-- =====================================================================================
-- WebsiteBanja AI — Phase 1: Agent Infrastructure & Telemetry Baseline
-- Target: PostgreSQL 15+ (Azure Database for PostgreSQL Flexible Server)
-- Generated: 2026-09-14
-- Description: Additive schema creating agent_runs, agent_decisions, agent_errors,
--              and agent_recommendations tables with indexes and defense-in-depth RLS.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. TABLE: agent_runs
-- Tracks every invocation of an autonomous agent (Mitra, Skills, Uniqueness, Boss).
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name TEXT NOT NULL, -- 'skills', 'uniqueness', 'boss', 'mitra'
  session_id TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'success', 'failed'
  model_provider TEXT NOT NULL, -- 'gemini', 'groq', 'openrouter'
  model_name TEXT NOT NULL,
  latency_ms INTEGER DEFAULT 0,
  tokens_used JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_agent_name ON public.agent_runs(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id ON public.agent_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_project_id ON public.agent_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON public.agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 2. TABLE: agent_decisions
-- Records structured reasoning outputs and chosen actions from agents.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  input_summary JSONB DEFAULT '{}'::jsonb,
  decision_output JSONB DEFAULT '{}'::jsonb,
  confidence_score NUMERIC DEFAULT 1.0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_decisions_run_id ON public.agent_decisions(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_agent_name ON public.agent_decisions(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_decisions_created_at ON public.agent_decisions(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 3. TABLE: agent_errors
-- Diagnostic error ledger for Boss Agent automated root-cause analysis.
-- Strict rule: NEVER store API keys, auth headers, or raw sensitive credentials.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  error_type TEXT NOT NULL, -- 'TIMEOUT', 'RATE_LIMIT', 'AUTH_ERROR', 'PARSE_ERROR', 'PROVIDER_UNAVAILABLE'
  error_message TEXT NOT NULL,
  fallback_triggered BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_errors_run_id ON public.agent_errors(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_errors_agent_name ON public.agent_errors(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_errors_error_type ON public.agent_errors(error_type);
CREATE INDEX IF NOT EXISTS idx_agent_errors_created_at ON public.agent_errors(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 4. TABLE: agent_recommendations
-- Actionable optimization and diagnostic recommendations surfaced to the admin dashboard.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  recommendation_text TEXT NOT NULL,
  suggested_action TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  status TEXT NOT NULL DEFAULT 'open', -- 'open', 'resolved', 'dismissed'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_recommendations_agent_name ON public.agent_recommendations(agent_name);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_severity ON public.agent_recommendations(severity);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_status ON public.agent_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_agent_recommendations_created_at ON public.agent_recommendations(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------------------
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_recommendations ENABLE ROW LEVEL SECURITY;

-- Service role / app pool full access
DO $$ BEGIN
  CREATE POLICY "agent_runs_app_full" ON public.agent_runs FOR ALL USING (true);
  CREATE POLICY "agent_decisions_app_full" ON public.agent_decisions FOR ALL USING (true);
  CREATE POLICY "agent_errors_app_full" ON public.agent_errors FOR ALL USING (true);
  CREATE POLICY "agent_recommendations_app_full" ON public.agent_recommendations FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

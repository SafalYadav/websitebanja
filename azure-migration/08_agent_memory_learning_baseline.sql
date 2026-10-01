-- =====================================================================================
-- WebsiteBanja AI — Phase 18: Long-Term Memory & Evidence-Based Learning Baseline
-- Target: PostgreSQL 15+ (Azure Database for PostgreSQL Flexible Server)
-- Generated: 2026-10-01
-- Description: Additive schema creating agent_events, agent_feedback, agent_lessons,
--              agent_strategies, agent_failures, agent_evaluations, and agent_experiments
--              with comprehensive indexes and defense-in-depth RLS.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. EXTEND TABLE: agent_runs (Additive columns for Phase 18)
-- -------------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_runs' AND column_name = 'parent_run_id') THEN
    ALTER TABLE public.agent_runs ADD COLUMN parent_run_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_runs' AND column_name = 'objective') THEN
    ALTER TABLE public.agent_runs ADD COLUMN objective TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_runs' AND column_name = 'input_reference') THEN
    ALTER TABLE public.agent_runs ADD COLUMN input_reference JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_runs' AND column_name = 'output_reference') THEN
    ALTER TABLE public.agent_runs ADD COLUMN output_reference JSONB DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_runs' AND column_name = 'failure_reason') THEN
    ALTER TABLE public.agent_runs ADD COLUMN failure_reason TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_runs' AND column_name = 'validation_status') THEN
    ALTER TABLE public.agent_runs ADD COLUMN validation_status TEXT DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_runs' AND column_name = 'domain') THEN
    ALTER TABLE public.agent_runs ADD COLUMN domain TEXT;
  END IF;
END $$;

-- -------------------------------------------------------------------------------------
-- 2. TABLE: agent_events
-- Chronological event ledger traceable to run_id and parent_event_id.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT UNIQUE NOT NULL,
  run_id TEXT NOT NULL,
  parent_event_id TEXT,
  agent_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration_ms INTEGER,
  payload JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_events_run_id ON public.agent_events(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id ON public.agent_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_event_type ON public.agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_timestamp ON public.agent_events(timestamp DESC);

-- -------------------------------------------------------------------------------------
-- 3. TABLE: agent_feedback
-- Records human approvals, rejections, corrections, and explicit/implicit outcomes.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_id TEXT UNIQUE NOT NULL,
  run_id TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_type TEXT NOT NULL, -- 'human_approval', 'human_rejection', 'correction', 'validation_result', 'business_outcome'
  source TEXT NOT NULL, -- 'admin_console', 'client_action', 'automated_validator', 'inbound_reply'
  sentiment TEXT, -- 'positive', 'negative', 'neutral'
  rating INTEGER, -- Optional 1-5 scale
  correction_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_feedback_run_id ON public.agent_feedback(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_feedback_type ON public.agent_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_project_id ON public.agent_feedback(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_feedback_created_at ON public.agent_feedback(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 4. TABLE: agent_failures
-- Structured, sanitized failure ledger with error codes and recovery tracking.
-- Zero secrets, tokens, or passwords.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  failure_id TEXT UNIQUE NOT NULL,
  run_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  failure_type TEXT NOT NULL, -- 'category_mismatch', 'tool_failure', 'timeout', 'validation_failure', 'safety_block'
  error_code TEXT NOT NULL,
  safe_error_message TEXT NOT NULL,
  attempted_action TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  recovery_action TEXT,
  recovered BOOLEAN NOT NULL DEFAULT false,
  domain TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_failures_run_id ON public.agent_failures(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_failures_agent_id ON public.agent_failures(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_failures_failure_type ON public.agent_failures(failure_type);
CREATE INDEX IF NOT EXISTS idx_agent_failures_domain ON public.agent_failures(domain);
CREATE INDEX IF NOT EXISTS idx_agent_failures_created_at ON public.agent_failures(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 5. TABLE: agent_evaluations
-- Objective evidence scoring correctness, safety, validation, and efficiency.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id TEXT UNIQUE NOT NULL,
  run_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  correctness_score NUMERIC NOT NULL DEFAULT 1.0, -- 0.0 - 1.0
  safety_score NUMERIC NOT NULL DEFAULT 1.0,      -- 0.0 - 1.0
  validation_score NUMERIC NOT NULL DEFAULT 1.0,  -- 0.0 - 1.0
  efficiency_score NUMERIC NOT NULL DEFAULT 1.0,  -- 0.0 - 1.0
  overall_score NUMERIC NOT NULL DEFAULT 1.0,     -- 0.0 - 1.0
  passed BOOLEAN NOT NULL DEFAULT true,
  evaluator TEXT NOT NULL DEFAULT 'rule_engine',
  dimension_scores JSONB DEFAULT '{}'::jsonb,
  observations JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_evaluations_run_id ON public.agent_evaluations(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_domain ON public.agent_evaluations(domain);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_overall_score ON public.agent_evaluations(overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_agent_evaluations_created_at ON public.agent_evaluations(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 6. TABLE: agent_lessons
-- Candidate to promoted lessons with supporting and contradicting evidence counts.
-- Strict rule: Raw model output != Truth.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CANDIDATE', -- 'CANDIDATE', 'VALIDATING', 'VERIFIED', 'PROMOTED', 'REJECTED', 'DEPRECATED'
  confidence NUMERIC NOT NULL DEFAULT 0.5, -- 0.0 - 1.0
  source_run_ids JSONB DEFAULT '[]'::jsonb,
  evidence JSONB DEFAULT '[]'::jsonb,
  supporting_outcomes INTEGER NOT NULL DEFAULT 0,
  contradicting_outcomes INTEGER NOT NULL DEFAULT 0,
  validation_count INTEGER NOT NULL DEFAULT 0,
  strategy_version TEXT,
  promoted_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_lessons_domain ON public.agent_lessons(domain);
CREATE INDEX IF NOT EXISTS idx_agent_lessons_status ON public.agent_lessons(status);
CREATE INDEX IF NOT EXISTS idx_agent_lessons_confidence ON public.agent_lessons(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_agent_lessons_created_at ON public.agent_lessons(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 7. TABLE: agent_strategies
-- Versioned strategic memories (strategy_v1, strategy_v2...) with regression benchmarks.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  version TEXT NOT NULL, -- e.g. 'strategy_v1'
  status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'EVALUATION', 'REGRESSION_TEST', 'APPROVED', 'ACTIVE', 'DEPRECATED'
  description TEXT NOT NULL,
  directives JSONB DEFAULT '[]'::jsonb,
  avoid_patterns JSONB DEFAULT '[]'::jsonb,
  benchmark_results JSONB DEFAULT '{}'::jsonb,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  promoted_from_lesson_id TEXT,
  supersedes_version TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ,
  deprecated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_strategies_domain ON public.agent_strategies(domain);
CREATE INDEX IF NOT EXISTS idx_agent_strategies_status ON public.agent_strategies(status);
CREATE INDEX IF NOT EXISTS idx_agent_strategies_version ON public.agent_strategies(version);
CREATE INDEX IF NOT EXISTS idx_agent_strategies_domain_status ON public.agent_strategies(domain, status);

-- -------------------------------------------------------------------------------------
-- 8. TABLE: agent_experiments
-- Foundation for controlled A/B hypothesis testing between strategies.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agent_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id TEXT UNIQUE NOT NULL,
  hypothesis TEXT NOT NULL,
  domain TEXT NOT NULL,
  strategy_a TEXT NOT NULL,
  strategy_b TEXT NOT NULL,
  sample_size INTEGER NOT NULL DEFAULT 10,
  metrics JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ABORTED'
  result JSONB DEFAULT '{}'::jsonb,
  confidence NUMERIC DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_experiments_domain ON public.agent_experiments(domain);
CREATE INDEX IF NOT EXISTS idx_agent_experiments_status ON public.agent_experiments(status);
CREATE INDEX IF NOT EXISTS idx_agent_experiments_created_at ON public.agent_experiments(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------------------
ALTER TABLE public.agent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_experiments ENABLE ROW LEVEL SECURITY;

-- Admins have full access
CREATE POLICY "Admins full access to agent_events" ON public.agent_events
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true));

CREATE POLICY "Admins full access to agent_feedback" ON public.agent_feedback
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true));

CREATE POLICY "Admins full access to agent_failures" ON public.agent_failures
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true));

CREATE POLICY "Admins full access to agent_evaluations" ON public.agent_evaluations
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true));

CREATE POLICY "Admins full access to agent_lessons" ON public.agent_lessons
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true));

CREATE POLICY "Admins full access to agent_strategies" ON public.agent_strategies
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true));

CREATE POLICY "Admins full access to agent_experiments" ON public.agent_experiments
  FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.is_admin = true));

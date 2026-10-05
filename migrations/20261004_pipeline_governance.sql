-- Preserve governed pipeline ownership and complete restart/resume metadata.
-- Apply after the existing autonomous_pipeline_runs table migration.
ALTER TABLE public.autonomous_pipeline_runs ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE public.autonomous_pipeline_runs ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.autonomous_pipeline_runs ADD COLUMN IF NOT EXISTS run_data JSONB;
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_tenant_created
  ON public.autonomous_pipeline_runs(tenant_id, created_at DESC);
REVOKE ALL ON TABLE public.autonomous_pipeline_runs FROM PUBLIC;
-- Legacy rows stay unowned and are excluded from tenant APIs. Never infer or
-- assign their owner automatically. Migrate only with verified ownership evidence.

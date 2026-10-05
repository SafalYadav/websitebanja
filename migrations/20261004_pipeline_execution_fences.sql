-- Distributed execution capability; never expose these columns in public APIs.
ALTER TABLE public.autonomous_pipeline_runs ADD COLUMN IF NOT EXISTS execution_lease_token TEXT;
ALTER TABLE public.autonomous_pipeline_runs ADD COLUMN IF NOT EXISTS execution_lease_until TIMESTAMPTZ;
CREATE TABLE IF NOT EXISTS public.autonomous_pipeline_stage_results (
  pipeline_run_id TEXT NOT NULL REFERENCES public.autonomous_pipeline_runs(pipeline_run_id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,lead_id TEXT NOT NULL,stage TEXT NOT NULL,result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(pipeline_run_id,lead_id,stage)
);
REVOKE ALL ON TABLE public.autonomous_pipeline_stage_results FROM PUBLIC;
REVOKE ALL ON TABLE public.autonomous_pipeline_runs FROM PUBLIC;

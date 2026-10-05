-- Governed autonomous runs table
CREATE TABLE IF NOT EXISTS public.governed_autonomous_runs (
  run_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL CHECK (length(trim(tenant_id)) > 0),
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  run_data JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id,idempotency_key),
  CHECK (jsonb_typeof(run_data) = 'object'),
  CHECK (run_data->>'pipelineRunId' IS NOT NULL AND run_data->>'pipelineRunId' = run_id),
  CHECK (run_data->>'tenantId' IS NOT NULL AND run_data->>'tenantId' = tenant_id)
);
CREATE INDEX IF NOT EXISTS governed_autonomous_runs_tenant_created
  ON public.governed_autonomous_runs (tenant_id,created_at DESC);
ALTER TABLE public.governed_autonomous_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.governed_autonomous_runs FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.governed_autonomous_runs FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.governed_autonomous_runs FROM authenticated;
  END IF;
END $$;
-- Assign server application privileges through the existing DB deployment
-- process. No browser grants, public reads or permissive RLS policy.

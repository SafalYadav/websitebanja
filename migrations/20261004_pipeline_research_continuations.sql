-- Durable parent linkage/outbox. No guessed backfill of legacy research owners.
CREATE TABLE IF NOT EXISTS public.generation_pipeline_continuations (
  research_id TEXT PRIMARY KEY REFERENCES public.generation_research(id),
  pipeline_run_id TEXT NOT NULL,tenant_id TEXT NOT NULL,lead_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'WAITING_RESEARCH',lease_token TEXT,lease_until TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,last_error TEXT,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pipeline_continuations_recovery
  ON public.generation_pipeline_continuations(tenant_id,status,updated_at);
REVOKE ALL ON TABLE public.generation_pipeline_continuations FROM PUBLIC;


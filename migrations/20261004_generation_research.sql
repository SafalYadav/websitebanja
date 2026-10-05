-- Durable CEO research and independent Boss review. Human approval is performed
-- only by the authenticated administrator endpoint; agents cannot activate rows.
CREATE TABLE IF NOT EXISTS public.generation_research (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  request JSONB NOT NULL,
  dossier JSONB,
  agent_trace JSONB NOT NULL DEFAULT '[]',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS generation_research_pending
ON public.generation_research(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.generation_research_resumes (
  research_id TEXT PRIMARY KEY REFERENCES public.generation_research(id),
  status TEXT NOT NULL DEFAULT 'QUEUED',
  lease_until TIMESTAMPTZ,
  lease_token TEXT,
  result JSONB,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.generation_research_resumes ADD COLUMN IF NOT EXISTS lease_token TEXT;

-- Knowledge remains inactive until human approval and regression evaluation.
CREATE TABLE IF NOT EXISTS public.semantic_knowledge_versions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  concept_key TEXT NOT NULL,
  concept JSONB NOT NULL,
  research_id TEXT NOT NULL REFERENCES public.generation_research(id),
  approved_by TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  regression_report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS semantic_knowledge_active
ON public.semantic_knowledge_versions(tenant_id, concept_key) WHERE active;

CREATE TABLE IF NOT EXISTS public.semantic_knowledge_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  concept_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('ACTIVATED','ROLLED_BACK')),
  actor_user_id TEXT NOT NULL,
  version_id BIGINT NOT NULL REFERENCES public.semantic_knowledge_versions(id),
  previous_version_ids JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.generation_execution_traces (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  status TEXT NOT NULL,
  request JSONB NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS generation_trace_preview_id ON public.generation_execution_traces ((result->'preview'->>'id')) WHERE status IN ('READY','REPAIRED');
CREATE INDEX IF NOT EXISTS generation_trace_preview_slug ON public.generation_execution_traces ((result->'preview'->>'slug')) WHERE status IN ('READY','REPAIRED');

-- These are server-owned governance records, not anonymous/public API tables.
REVOKE ALL ON public.generation_research, public.generation_research_resumes,
  public.semantic_knowledge_versions, public.semantic_knowledge_events, public.generation_execution_traces FROM PUBLIC;

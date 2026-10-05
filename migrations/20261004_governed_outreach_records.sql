-- Governed outreach records
CREATE TABLE IF NOT EXISTS public.governed_outreach_records (
  outreach_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL CHECK (length(trim(user_id)) > 0),
  lead_id TEXT NOT NULL,
  preview_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp','instagram','sms')),
  status TEXT NOT NULL CHECK (status IN ('draft','review','approved','queued','sent','simulated_sent','rejected','cancelled','replied','failed')),
  record_data JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (record_data->>'outreachId' IS NOT NULL AND record_data->>'outreachId'=outreach_id),
  CHECK (record_data->>'userId' IS NOT NULL AND record_data->>'userId'=user_id),
  CHECK (record_data->>'leadId' IS NOT NULL AND record_data->>'leadId'=lead_id),
  CHECK (record_data->>'previewId' IS NOT NULL AND record_data->>'previewId'=preview_id),
  CHECK (record_data->>'channel' IS NOT NULL AND record_data->>'channel'=channel),
  CHECK (record_data->>'status' IS NOT NULL AND record_data->>'status'=status)
);
CREATE UNIQUE INDEX IF NOT EXISTS governed_outreach_active_identity
  ON public.governed_outreach_records(user_id,lead_id,channel,preview_id)
  WHERE status NOT IN ('rejected','cancelled');
CREATE INDEX IF NOT EXISTS governed_outreach_owner_created
  ON public.governed_outreach_records(user_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS governed_outreach_owner_approval
  ON public.governed_outreach_records(user_id, (record_data->'approvalRequest'->>'approvalId'))
  WHERE record_data->'approvalRequest'->>'approvalId' IS NOT NULL;
ALTER TABLE public.governed_outreach_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.governed_outreach_records FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON public.governed_outreach_records FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON public.governed_outreach_records FROM authenticated;
  END IF;
END $$;
-- Provision only the existing server application role through deployment.
-- Legacy scratch files are retained; importing them requires verified ownership.

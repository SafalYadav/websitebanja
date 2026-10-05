-- Apply after 20261004_generation_research.sql. Never backfill a human decision.
ALTER TABLE public.generation_research ADD COLUMN IF NOT EXISTS reviewed_payload_hash TEXT;
-- Legacy APPROVED rows have no exact reviewed snapshot. Require a fresh human
-- decision; old knowledge is ignored until the new approval activates a version.
UPDATE public.generation_research
  SET status='WAITING_HUMAN_APPROVAL',updated_at=NOW()
  WHERE status='APPROVED' AND reviewed_payload_hash IS NULL;


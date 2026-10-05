-- Apply after 20261004_governed_autonomous_runs.sql.
ALTER TABLE public.governed_autonomous_runs
  ADD COLUMN IF NOT EXISTS lease_token TEXT,
  ADD COLUMN IF NOT EXISTS lease_until TIMESTAMPTZ;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
    WHERE conrelid='public.governed_autonomous_runs'::regclass AND conname='governed_autonomous_lease_pair') THEN
    ALTER TABLE public.governed_autonomous_runs
      ADD CONSTRAINT governed_autonomous_lease_pair CHECK ((lease_token IS NULL) = (lease_until IS NULL));
  END IF;
END $$;

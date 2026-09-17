-- =====================================================================================
-- WebsiteBanja AI — Phase 7: Admin Access Control & Privilege Audit Ledger
-- Target: PostgreSQL 15+ (Azure Database for PostgreSQL Flexible Server)
-- Generated: 2026-09-15
-- Description: Additive schema creating public.admin_audit_logs table with indexes
--              and non-recursive RLS policy. LOCAL-FIRST: DO NOT RUN AGAINST PROD.
-- =====================================================================================

-- -------------------------------------------------------------------------------------
-- 1. TABLE: admin_audit_logs
-- Immutable ledger recording every grant/revoke of Administrator or Pro privileges.
-- Strict rule: NEVER store passwords, auth tokens, secrets, or raw conversation PII.
-- -------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'ADMIN_GRANTED', 'ADMIN_REVOKED', 'PRO_GRANTED', 'PRO_REVOKED'
  previous_state JSONB DEFAULT '{}'::jsonb,
  new_state JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient bounded filtering
CREATE INDEX IF NOT EXISTS idx_admin_audit_actor ON public.admin_audit_logs(actor_admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON public.admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created_at ON public.admin_audit_logs(created_at DESC);

-- -------------------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- -------------------------------------------------------------------------------------
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Service role / app pool full access
DO $$ BEGIN
  CREATE POLICY "admin_audit_logs_app_full" ON public.admin_audit_logs FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

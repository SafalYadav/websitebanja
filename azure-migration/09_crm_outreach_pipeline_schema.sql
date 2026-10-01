-- =====================================================================================
-- WebsiteBanja AI — Production Schema: CRM, Outreach & Autonomous Pipeline
-- Target: Azure Database for PostgreSQL Flexible Server
-- Phase: Phase 24 (Production Infrastructure)
-- =====================================================================================

-- 1. CRM Lead Status & Lifecycle Table
CREATE TABLE IF NOT EXISTS public.crm_leads_state (
  lead_id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'DISCOVERED',
  qualification_status TEXT DEFAULT 'NEEDS_REVIEW',
  qualification_score NUMERIC(5,2) DEFAULT 0,
  opportunity_score NUMERIC(5,2) DEFAULT 0,
  last_contact_at TIMESTAMPTZ,
  next_action TEXT,
  timeline JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_state_user ON public.crm_leads_state(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_state_status ON public.crm_leads_state(status);

-- 2. CRM Conversations Table
CREATE TABLE IF NOT EXISTS public.crm_conversations (
  conversation_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES public.crm_leads_state(lead_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_conversations_lead ON public.crm_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_conversations_user ON public.crm_conversations(user_id);

-- 3. CRM Messages Table
CREATE TABLE IF NOT EXISTS public.crm_messages (
  message_id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.crm_conversations(conversation_id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT NOT NULL DEFAULT 'email',
  message_text TEXT NOT NULL,
  sender_email TEXT,
  recipient_email TEXT,
  external_message_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_messages_conv ON public.crm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_crm_messages_external ON public.crm_messages(external_message_id);

-- 4. Outreach Records Table
CREATE TABLE IF NOT EXISTS public.outreach_records (
  outreach_id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email',
  status TEXT NOT NULL DEFAULT 'draft_created' CHECK (status IN ('draft_created', 'pending_approval', 'approved', 'ready_to_send', 'sent', 'rejected', 'failed', 'cancelled')),
  subject TEXT,
  message TEXT NOT NULL,
  preview_id TEXT,
  preview_url TEXT,
  requires_human_approval BOOLEAN DEFAULT TRUE,
  external_message_id TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  validation JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outreach_records_lead ON public.outreach_records(lead_id);
CREATE INDEX IF NOT EXISTS idx_outreach_records_status ON public.outreach_records(status);
CREATE INDEX IF NOT EXISTS idx_outreach_records_user ON public.outreach_records(user_id);

-- 5. Autonomous Pipeline Runs Table
CREATE TABLE IF NOT EXISTS public.autonomous_pipeline_runs (
  pipeline_run_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  current_stage TEXT NOT NULL DEFAULT 'DISCOVER',
  criteria JSONB NOT NULL,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pipeline_runs_user ON public.autonomous_pipeline_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_tenant ON public.autonomous_pipeline_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON public.autonomous_pipeline_runs(status);

-- 6. Human Approval Queue Records Table
CREATE TABLE IF NOT EXISTS public.approval_records (
  approval_id TEXT PRIMARY KEY,
  pipeline_run_id TEXT,
  lead_id TEXT NOT NULL,
  outreach_id TEXT NOT NULL REFERENCES public.outreach_records(outreach_id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id TEXT,
  business_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_preview TEXT NOT NULL,
  preview_url TEXT,
  qualification_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'PENDING_HUMAN_APPROVAL',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejected_reason TEXT,
  sent_at TIMESTAMPTZ,
  gmail_message_id TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_approval_records_outreach ON public.approval_records(outreach_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_status ON public.approval_records(status);
CREATE INDEX IF NOT EXISTS idx_approval_records_user ON public.approval_records(user_id);

-- 7. Row Level Security (RLS) Policies
ALTER TABLE public.crm_leads_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autonomous_pipeline_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_records ENABLE ROW LEVEL SECURITY;

-- Service Role Policy (Full Access)
CREATE POLICY "service_role_crm_leads" ON public.crm_leads_state FOR ALL TO authenticated USING (true);
CREATE POLICY "service_role_crm_conversations" ON public.crm_conversations FOR ALL TO authenticated USING (true);
CREATE POLICY "service_role_crm_messages" ON public.crm_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "service_role_outreach" ON public.outreach_records FOR ALL TO authenticated USING (true);
CREATE POLICY "service_role_pipeline_runs" ON public.autonomous_pipeline_runs FOR ALL TO authenticated USING (true);
CREATE POLICY "service_role_approval_records" ON public.approval_records FOR ALL TO authenticated USING (true);

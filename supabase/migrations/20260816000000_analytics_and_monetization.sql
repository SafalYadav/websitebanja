-- Phase 11: Analytics, Monetization & Flexible Publishing Migration

-- 1. Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for analytics querying and time-series aggregation
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_time ON public.analytics_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON public.analytics_events(user_id, created_at DESC);

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'free', -- 'free', 'active_paid', 'cancelled', 'expired'
  amount_inr NUMERIC DEFAULT 0,
  current_period_start TIMESTAMPTZ DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON public.subscriptions(user_id, status);

-- 3. Update Projects Table with Custom Domain & Backend Options
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS custom_domain TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain_status TEXT DEFAULT 'none', -- 'none', 'pending_verification', 'verified', 'failed'
  ADD COLUMN IF NOT EXISTS custom_domain_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS backend_requirement TEXT DEFAULT 'static', -- 'static', 'managed_booking', 'managed_orders', 'custom_api'
  ADD COLUMN IF NOT EXISTS backend_config JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_custom_domain ON public.projects(custom_domain) WHERE custom_domain IS NOT NULL;

-- 4. Enable RLS on newly created tables
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Analytics Events: authenticated users can insert their own events, admin can read all
CREATE POLICY "Users can insert their own analytics events"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Subscriptions: users can read their own subscription
CREATE POLICY "Users can view own subscription"
  ON public.subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

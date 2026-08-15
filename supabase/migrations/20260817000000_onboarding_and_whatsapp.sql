-- Onboarding Mode & WhatsApp Configuration Migration
ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS onboarding_mode TEXT DEFAULT 'prompt',
  ADD COLUMN IF NOT EXISTS user_prompt TEXT,
  ADD COLUMN IF NOT EXISTS selected_features JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_message TEXT DEFAULT 'Hi, I found your website and would like to know more about your services.',
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT true;

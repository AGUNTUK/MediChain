-- ==============================================================================
-- Migration 16: WhatsApp Business Marketing Module (Manual Send Workflow)
-- Description:
--   1. Adds WhatsApp Marketing consent fields to public.pharmacies
--   2. Creates public.whatsapp_campaigns
--   3. Creates public.whatsapp_campaign_recipients
--   4. Creates public.whatsapp_templates
--   5. Adds indices & strict RLS policies (internal admin-only)
--
-- Safety: Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS & CREATE TABLE IF NOT EXISTS.
-- ==============================================================================

-- 1. Consent fields on pharmacies table
ALTER TABLE public.pharmacies
ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_in_source TEXT NULL,
ADD COLUMN IF NOT EXISTS whatsapp_marketing_opt_out_at TIMESTAMPTZ NULL;

-- 2. WhatsApp Campaigns Table
CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  image_url TEXT,
  audience_filter JSONB DEFAULT '{}'::jsonb,
  total_audience INTEGER NOT NULL DEFAULT 0,
  eligible_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  opened_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  invalid_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'in_progress', 'completed', 'archived')),
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. WhatsApp Campaign Recipients Table
CREATE TABLE IF NOT EXISTS public.whatsapp_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  pharmacy_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  raw_phone TEXT NOT NULL,
  formatted_whatsapp_number TEXT,
  personalized_message TEXT NOT NULL,
  wa_me_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'opened', 'sent', 'skipped', 'failed', 'invalid')),
  opened_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  skipped_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_campaign_pharmacy UNIQUE (campaign_id, pharmacy_id)
);

-- 4. Reusable WhatsApp Message Templates
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Promotion' CHECK (category IN ('Promotion', 'Product Discount', 'New Product', 'Announcement', 'Festival Offer', 'Reminder', 'Custom')),
  message TEXT NOT NULL,
  image_url TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Performance Indices
CREATE INDEX IF NOT EXISTS idx_pharmacies_whatsapp_optin ON public.pharmacies (whatsapp_marketing_opt_in);
CREATE INDEX IF NOT EXISTS idx_wa_campaigns_status ON public.whatsapp_campaigns (status, created_at);
CREATE INDEX IF NOT EXISTS idx_wa_recipients_campaign ON public.whatsapp_campaign_recipients (campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_recipients_pharmacy ON public.whatsapp_campaign_recipients (pharmacy_id);

-- 6. Row Level Security (Admin Only Access)
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_campaigns' AND policyname = 'service_role_all_wa_campaigns') THEN
    CREATE POLICY service_role_all_wa_campaigns ON public.whatsapp_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_campaign_recipients' AND policyname = 'service_role_all_wa_recipients') THEN
    CREATE POLICY service_role_all_wa_recipients ON public.whatsapp_campaign_recipients FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'whatsapp_templates' AND policyname = 'service_role_all_wa_templates') THEN
    CREATE POLICY service_role_all_wa_templates ON public.whatsapp_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

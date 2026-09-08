-- ==============================================================================
-- Migration 09: Notification Re-Architecture & Dedicated Operational Tables
-- Description: Disentangles the overloaded 'notifications' table into dedicated,
-- domain-specific tables with proper RLS, constraints, and indexes:
-- 1. carts
-- 2. audit_logs
-- 3. app_settings
-- 4. notification_broadcasts
-- 5. notification_reads
-- 6. price_history
-- 7. import_history
-- 8. export_history
-- 9. stock_alert_subscriptions
--
-- Safety: All writes/reads in server.ts & dbService.ts use service_role key with
-- dual-write and graceful fallback. This migration is purely additive and idempotent.
-- ==============================================================================

-- 1. Shopping Carts Table
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_carts_user_id UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_carts_user_id ON public.carts (user_id);
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Carts accessible by owner" ON public.carts;
CREATE POLICY "Carts accessible by owner"
  ON public.carts FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 2. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  affected_module TEXT NOT NULL,
  record_id TEXT,
  user_email TEXT DEFAULT 'System',
  user_role TEXT DEFAULT 'System',
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON public.audit_logs (affected_module);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 3. App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "App settings readable by all" ON public.app_settings;
CREATE POLICY "App settings readable by all"
  ON public.app_settings FOR SELECT
  USING (true);

-- 4. Notification Broadcasts Table
CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'broadcast',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_broadcasts_created ON public.notification_broadcasts (created_at DESC);
ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Broadcasts readable by all authenticated" ON public.notification_broadcasts;
CREATE POLICY "Broadcasts readable by all authenticated"
  ON public.notification_broadcasts FOR SELECT
  TO authenticated
  USING (true);

-- 5. Notification Read Receipts Table
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_id UUID NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notification_reads_user_notif UNIQUE (user_id, notification_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_reads_user ON public.notification_reads (user_id);
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Notification reads accessible by owner" ON public.notification_reads;
CREATE POLICY "Notification reads accessible by owner"
  ON public.notification_reads FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 6. Price Change History Table
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  product_name TEXT,
  old_mrp NUMERIC(12,2),
  new_mrp NUMERIC(12,2),
  old_price NUMERIC(12,2),
  new_price NUMERIC(12,2),
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.price_history (product_id, created_at DESC);
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- 7. Bulk Import History Table
CREATE TABLE IF NOT EXISTS public.import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  record_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Success',
  imported_by TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_history_created ON public.import_history (created_at DESC);
ALTER TABLE public.import_history ENABLE ROW LEVEL SECURITY;

-- 8. Bulk Export History Table
CREATE TABLE IF NOT EXISTS public.export_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  format TEXT NOT NULL,
  type TEXT,
  record_count INTEGER DEFAULT 0,
  exported_by TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_history_created ON public.export_history (created_at DESC);
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- 9. Stock Alert Subscriptions Table
CREATE TABLE IF NOT EXISTS public.stock_alert_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  pharmacy_id UUID,
  product_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_stock_alert_sub_user_prod UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_alert_product ON public.stock_alert_subscriptions (product_id);
ALTER TABLE public.stock_alert_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Stock alerts accessible by subscriber" ON public.stock_alert_subscriptions;
CREATE POLICY "Stock alerts accessible by subscriber"
  ON public.stock_alert_subscriptions FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- ==============================================================================
-- Backfill Historic Data from overloaded 'notifications' table
-- ==============================================================================

-- A. Backfill Carts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    INSERT INTO public.carts (user_id, items, updated_at)
    SELECT DISTINCT ON (n.user_id)
      n.user_id::uuid,
      CASE 
        WHEN n.message IS NOT NULL AND n.message ~ '^\s*\[.*\]\s*$' THEN n.message::jsonb
        ELSE '[]'::jsonb
      END,
      n.created_at
    FROM public.notifications n
    WHERE n.type = 'cart' 
      AND n.user_id IS NOT NULL 
      AND n.message IS NOT NULL
      AND n.message ~ '^\s*\[.*\]\s*$'
    ORDER BY n.user_id, n.created_at DESC
    ON CONFLICT (user_id) DO UPDATE SET
      items = EXCLUDED.items,
      updated_at = EXCLUDED.updated_at
    WHERE public.carts.updated_at < EXCLUDED.updated_at;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping carts backfill due to format discrepancy: %', SQLERRM;
END $$;

-- B. Backfill System Settings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    INSERT INTO public.app_settings (key, value, updated_at)
    SELECT
      'system_settings',
      n.message::jsonb,
      n.created_at
    FROM public.notifications n
    WHERE n.type = 'system_settings' 
      AND n.message IS NOT NULL 
      AND n.message ~ '^\s*\{.*\}\s*$'
    ORDER BY n.created_at DESC
    LIMIT 1
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = EXCLUDED.updated_at;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping app_settings backfill due to format discrepancy: %', SQLERRM;
END $$;

-- End of Migration 09

-- ==============================================================================
-- Migration 08: Comprehensive Row Level Security (RLS) Hardening
-- Description: Enables RLS across all core database tables with deny-by-default,
-- minimal explicit read policies for anon client paths, and single-evaluation
-- (SELECT auth.uid()) optimization.
--
-- Safety: All DB writes from server.ts and dbService.ts execute via service_role key,
-- which bypasses RLS. Live backend operations remain completely unaffected.
-- ==============================================================================

-- 1. Enable RLS on all public tables
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bulk_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.bulk_campaign_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hero_slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hero_carousel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

-- 2. Drop any legacy/duplicate policies if they exist to ensure clean idempotent run
DROP POLICY IF EXISTS "Allow public read access on products" ON public.products;
DROP POLICY IF EXISTS "Allow public read access on categories" ON public.categories;
DROP POLICY IF EXISTS "Allow public read access on inventory" ON public.inventory;
DROP POLICY IF EXISTS "Allow public read access on bulk campaigns" ON public.bulk_campaigns;
DROP POLICY IF EXISTS "Allow public read access on bulk campaign products" ON public.bulk_campaign_products;
DROP POLICY IF EXISTS "Allow public read access on hero slides" ON public.hero_slides;
DROP POLICY IF EXISTS "Allow public read access on hero carousel settings" ON public.hero_carousel_settings;

DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Pharmacies readable by owner" ON public.pharmacies;
DROP POLICY IF EXISTS "Pharmacies updateable by owner" ON public.pharmacies;
DROP POLICY IF EXISTS "Orders readable by owning pharmacy" ON public.orders;
DROP POLICY IF EXISTS "Order items readable by order owner" ON public.order_items;
DROP POLICY IF EXISTS "Invoices readable by order owner" ON public.invoices;
DROP POLICY IF EXISTS "Notifications readable by user or broadcasts" ON public.notifications;
DROP POLICY IF EXISTS "Notifications updateable by recipient" ON public.notifications;

-- 3. Public Catalog & Display Configuration Policies (Read-Only for frontend anon client)
CREATE POLICY "Allow public read access on products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on inventory"
  ON public.inventory FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on bulk campaigns"
  ON public.bulk_campaigns FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on bulk campaign products"
  ON public.bulk_campaign_products FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on hero slides"
  ON public.hero_slides FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on hero carousel settings"
  ON public.hero_carousel_settings FOR SELECT
  USING (true);

-- 4. User Profile & Pharmacy Isolation (Evaluates (SELECT auth.uid()) once per query)
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Pharmacies readable by owner"
  ON public.pharmacies FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Pharmacies updateable by owner"
  ON public.pharmacies FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 5. Orders, Items & Invoices Isolation
CREATE POLICY "Orders readable by owning pharmacy"
  ON public.orders FOR SELECT
  TO authenticated
  USING (
    pharmacy_id IN (
      SELECT p.id FROM public.pharmacies p WHERE p.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Order items readable by order owner"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.pharmacies p ON p.id = o.pharmacy_id
      WHERE p.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Invoices readable by order owner"
  ON public.invoices FOR SELECT
  TO authenticated
  USING (
    order_id IN (
      SELECT o.id FROM public.orders o
      JOIN public.pharmacies p ON p.id = o.pharmacy_id
      WHERE p.user_id = (SELECT auth.uid())
    )
  );

-- 6. Notifications Isolation & Realtime Subscription Support
CREATE POLICY "Notifications readable by user or broadcasts"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR user_id IS NULL
  );

CREATE POLICY "Notifications updateable by recipient"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- End of Migration 08

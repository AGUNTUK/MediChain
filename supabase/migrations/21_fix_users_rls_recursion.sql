-- ==============================================================================
-- Migration 21: Resolve PostgreSQL RLS 42P17 Infinite Recursion on Users & Pharmacies
-- Description:
-- Drops recursive policies on public.users and public.pharmacies that query public.users
-- within their own USING clause. Re-applies clean, non-recursive policies evaluating
-- (SELECT auth.uid()) once per query.
--
-- Safety: Additive / idempotent. Does not modify or drop any table data.
-- ==============================================================================

-- 1. Drop any legacy or recursive policies on users
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can read all users" ON public.users;
DROP POLICY IF EXISTS "Allow user self read" ON public.users;
DROP POLICY IF EXISTS "Allow user read" ON public.users;

-- 2. Create clean, non-recursive policies on users
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- 3. Drop any legacy or recursive policies on pharmacies
DROP POLICY IF EXISTS "Pharmacies readable by owner" ON public.pharmacies;
DROP POLICY IF EXISTS "Pharmacies updateable by owner" ON public.pharmacies;
DROP POLICY IF EXISTS "Pharmacies readable by all authenticated" ON public.pharmacies;

-- 4. Create clean, non-recursive policies on pharmacies
CREATE POLICY "Pharmacies readable by owner"
  ON public.pharmacies FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Pharmacies updateable by owner"
  ON public.pharmacies FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));


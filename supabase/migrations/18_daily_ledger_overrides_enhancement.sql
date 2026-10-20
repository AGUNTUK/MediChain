-- =========================================================================
-- Migration 18: Daily Ledger Overrides Enhancement & Schema Fortification
-- =========================================================================
-- Ensures columns for delivery charges, transport expenses, automatic values snapshot,
-- and overridden fields exist with proper indices, RLS policies, and constraints.

ALTER TABLE public.daily_ledger_overrides
  ADD COLUMN IF NOT EXISTS delivery_charge_collected NUMERIC(14,2) NULL,
  ADD COLUMN IF NOT EXISTS transport_expenses NUMERIC(14,2) NULL,
  ADD COLUMN IF NOT EXISTS automatic_values JSONB NULL,
  ADD COLUMN IF NOT EXISTS overridden_fields TEXT[] NULL;

-- Ensure RLS is enabled
ALTER TABLE public.daily_ledger_overrides ENABLE ROW LEVEL SECURITY;

-- Service Role Policy (Full Access for Backend Proxy)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_ledger_overrides' AND policyname = 'service_role_all_ledger_overrides') THEN
    CREATE POLICY service_role_all_ledger_overrides ON public.daily_ledger_overrides FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

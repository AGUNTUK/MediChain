-- ==============================================================================
-- Migration 15: Unified Accounts & Business Ledger Architecture
-- Description:
--   1. Purchases table (supplier procurement, payment status, payable tracking)
--   2. Customer Collections table (cash/mfs collections reducing receivables)
--   3. Business Expenses table (categorized operating and delivery expenses)
--   4. Capital Transactions table (partner equity contributions and withdrawals)
--   5. Custom Invoices Ledger (saved institutional custom invoices with profit/COGS)
--   6. Daily Closings table (daily operational accounting lock)
--   6b. Daily Ledger Overrides (manual day adjustments and overrides)
-- ==============================================================================

-- 1. Purchases Table (Procurement)
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT UNIQUE NOT NULL,
  supplier_name TEXT NOT NULL,
  invoice_reference TEXT NULL,
  purchase_date DATE NOT NULL,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  due_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  payment_status TEXT NOT NULL DEFAULT 'Paid', -- 'Paid', 'Partially Paid', 'Unpaid'
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  notes TEXT NULL,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Voided'
  void_reason TEXT NULL,
  created_by TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Collections Table (Customer Inflows)
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_number TEXT UNIQUE NOT NULL,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  collection_date DATE NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference_invoice_id TEXT NULL,
  notes TEXT NULL,
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Voided'
  void_reason TEXT NULL,
  created_by TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Business Expenses Table (Operating Overheads & Delivery)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT UNIQUE NOT NULL,
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  description TEXT NOT NULL,
  reference TEXT NULL,
  attachment_url TEXT NULL,
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Voided'
  void_reason TEXT NULL,
  created_by TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Capital Transactions Table (Partner Contributions / Withdrawals)
CREATE TABLE IF NOT EXISTS public.capital_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT UNIQUE NOT NULL,
  transaction_date DATE NOT NULL,
  type TEXT NOT NULL, -- 'Contribution', 'Withdrawal'
  partner_name TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference TEXT NULL,
  notes TEXT NULL,
  status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Voided'
  void_reason TEXT NULL,
  created_by TEXT NOT NULL DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Saved Custom Invoices Ledger
CREATE TABLE IF NOT EXISTS public.custom_invoices_ledger (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  order_ref TEXT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NULL,
  recipient_type TEXT NOT NULL DEFAULT 'institute',
  recipient_name TEXT NOT NULL,
  contact_person TEXT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  license_or_reg_no TEXT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_mrp NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_savings NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  delivery_charge NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  special_adjustment NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  net_payable NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  due_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_cogs NUMERIC(14,2) NULL,
  gross_profit NUMERIC(14,2) NULL,
  has_unknown_costs BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Saved', -- 'Saved', 'Voided', 'Paid'
  void_reason TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Daily Closing Audit Table
CREATE TABLE IF NOT EXISTS public.daily_closings (
  date DATE PRIMARY KEY, -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'Open', -- 'Open', 'Closed'
  closed_at TIMESTAMPTZ NULL,
  closed_by TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6b. Daily Ledger Overrides & Manual Adjustments Table
CREATE TABLE IF NOT EXISTS public.daily_ledger_overrides (
  date DATE PRIMARY KEY, -- YYYY-MM-DD
  purchases NUMERIC(14,2) NULL,
  delivered_sales NUMERIC(14,2) NULL,
  customer_collections NUMERIC(14,2) NULL,
  cogs NUMERIC(14,2) NULL,
  delivery_expenses NUMERIC(14,2) NULL,
  other_expenses NUMERIC(14,2) NULL,
  cash_in NUMERIC(14,2) NULL,
  cash_out NUMERIC(14,2) NULL,
  notes TEXT NULL,
  edited_by TEXT NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Indices for High-Speed Accounting Aggregations
CREATE INDEX IF NOT EXISTS idx_purchases_date ON public.purchases (purchase_date, status);
CREATE INDEX IF NOT EXISTS idx_collections_date ON public.collections (collection_date, status);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses (expense_date, status);
CREATE INDEX IF NOT EXISTS idx_capital_date ON public.capital_transactions (transaction_date, status);
CREATE INDEX IF NOT EXISTS idx_custom_invoices_date ON public.custom_invoices_ledger (invoice_date, status);

-- 8. Row Level Security (Admin Only)
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_invoices_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_ledger_overrides ENABLE ROW LEVEL SECURITY;

-- Service Role Policy (Full Access for Backend)
DO $$
BEGIN
  -- purchases
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'purchases' AND policyname = 'service_role_all_purchases') THEN
    CREATE POLICY service_role_all_purchases ON public.purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- collections
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'collections' AND policyname = 'service_role_all_collections') THEN
    CREATE POLICY service_role_all_collections ON public.collections FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- expenses
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'service_role_all_expenses') THEN
    CREATE POLICY service_role_all_expenses ON public.expenses FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- capital_transactions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'capital_transactions' AND policyname = 'service_role_all_capital') THEN
    CREATE POLICY service_role_all_capital ON public.capital_transactions FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- custom_invoices_ledger
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'custom_invoices_ledger' AND policyname = 'service_role_all_custom_inv') THEN
    CREATE POLICY service_role_all_custom_inv ON public.custom_invoices_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- daily_closings
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_closings' AND policyname = 'service_role_all_closings') THEN
    CREATE POLICY service_role_all_closings ON public.daily_closings FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
  -- daily_ledger_overrides
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'daily_ledger_overrides' AND policyname = 'service_role_all_ledger_overrides') THEN
    CREATE POLICY service_role_all_ledger_overrides ON public.daily_ledger_overrides FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==============================================================================
-- Migration 15: Unified Accounts & Business Ledger Architecture
-- Description:
--   1. Purchases table (supplier procurement, payment status, payable tracking)
--   2. Collections table (actual money collected from customers/pharmacies)
--   3. Expenses table (delivery, operational, administrative overheads)
--   4. Capital Transactions table (partner contributions & withdrawals)
--   5. Custom Invoices Ledger table (saved institutional invoices, custom COGS/profits)
--   6. Daily Closings table (financial day locking and audit)
--   7. Strict RLS Policies (internal admin-only, 0 access to pharmacy users)
--
-- Safety: Uses CREATE TABLE IF NOT EXISTS. Non-destructive and idempotent.
-- ==============================================================================

-- 1. Purchases
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT NOT NULL UNIQUE,
  supplier_name TEXT NOT NULL,
  invoice_reference TEXT,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (due_amount >= 0),
  payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK (payment_status IN ('Paid', 'Partially Paid', 'Unpaid')),
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Cheque', 'Credit/Payable', 'Other')),
  notes TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Voided')),
  void_reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Customer Collections
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_number TEXT NOT NULL UNIQUE,
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  collection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Cheque', 'Card', 'Other')),
  reference_invoice_id TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Voided')),
  void_reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Operating & Delivery Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT NOT NULL UNIQUE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('Delivery', 'Transport', 'Packaging', 'Office', 'Communication', 'Software', 'Marketing', 'Salary/Wages', 'Rent', 'Bank/Payment Fees', 'Miscellaneous')),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Cheque', 'Card', 'Other')),
  description TEXT NOT NULL,
  reference TEXT,
  attachment_url TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Voided')),
  void_reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Capital Contributions & Withdrawals
CREATE TABLE IF NOT EXISTS public.capital_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL UNIQUE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('Contribution', 'Withdrawal')),
  partner_name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'Bank Transfer' CHECK (payment_method IN ('Cash', 'Bank Transfer', 'bKash', 'Nagad', 'Cheque', 'Other')),
  reference TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Voided')),
  void_reason TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Saved Custom / Institutional Invoices Ledger
CREATE TABLE IF NOT EXISTS public.custom_invoices_ledger (
  id TEXT PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  order_ref TEXT,
  recipient_name TEXT NOT NULL,
  recipient_type TEXT NOT NULL DEFAULT 'institute',
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  license_or_reg_no TEXT,
  payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_charge NUMERIC(12,2) NOT NULL DEFAULT 0,
  special_adjustment NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_payable NUMERIC(12,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cogs NUMERIC(12,2) DEFAULT NULL,
  gross_profit NUMERIC(12,2) DEFAULT NULL,
  has_unknown_costs BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Saved' CHECK (status IN ('Saved', 'Voided', 'Paid')),
  void_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Daily Financial Closings
CREATE TABLE IF NOT EXISTS public.daily_closings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closing_date DATE NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Closed')),
  closed_at TIMESTAMPTZ,
  closed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6b. Daily Ledger Overrides & Manual Adjustments Table
CREATE TABLE IF NOT EXISTS public.daily_ledger_overrides (
  date DATE PRIMARY KEY, -- YYYY-MM-DD
  purchases NUMERIC(14,2) NULL,
  delivered_sales NUMERIC(14,2) NULL,
  delivery_charge_collected NUMERIC(14,2) NULL,
  customer_collections NUMERIC(14,2) NULL,
  cogs NUMERIC(14,2) NULL,
  transport_expenses NUMERIC(14,2) NULL,
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

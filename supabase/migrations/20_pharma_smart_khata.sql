-- ==============================================================================
-- Migration 20: Pharma-Smart Khata (ডিজিটাল ফার্মেসি হিসাব ও শর্ট খাতা)
-- Description:
--   1. khata_customers: Retail pharmacy credit customers & due tracking
--   2. khata_suppliers: Wholesale medicine suppliers & payable tracking
--   3. khata_transactions: Daily retail sales, due collections, purchases, and expenses
--   4. khata_short_book: Low/out-of-stock medicine shortage tracker with 1-click MediChain cart bridge
--   5. Row Level Security (RLS) policies scoped strictly to authenticated pharmacy
--
-- Safety: Uses CREATE TABLE IF NOT EXISTS. Non-destructive and idempotent.
-- ==============================================================================

-- 1. Retail Credit Customers
CREATE TABLE IF NOT EXISTS public.khata_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  total_due NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_due >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for pharmacy-scoped customer lookup
CREATE INDEX IF NOT EXISTS idx_khata_customers_pharmacy ON public.khata_customers(pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_khata_customers_phone ON public.khata_customers(phone);

-- 2. Wholesale Suppliers
CREATE TABLE IF NOT EXISTS public.khata_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  total_payable NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_payable >= 0),
  is_medichain BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for pharmacy-scoped supplier lookup
CREATE INDEX IF NOT EXISTS idx_khata_suppliers_pharmacy ON public.khata_suppliers(pharmacy_id);

-- 3. Unified Daily Khata Transactions (Sales, Collections, Purchases, Expenses)
CREATE TABLE IF NOT EXISTS public.khata_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('SALE', 'DUE_COLLECTION', 'PURCHASE', 'EXPENSE', 'SUPPLIER_PAYMENT')),
  customer_id UUID REFERENCES public.khata_customers(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.khata_suppliers(id) ON DELETE SET NULL,
  customer_name TEXT,
  supplier_name TEXT,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (due_amount >= 0),
  payment_method TEXT DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'bKash', 'Nagad', 'Due', 'Bank Transfer', 'Cheque', 'Other')),
  category TEXT,
  note TEXT,
  linked_order_id TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid date-range queries & performance
CREATE INDEX IF NOT EXISTS idx_khata_transactions_pharmacy_type ON public.khata_transactions(pharmacy_id, type);
CREATE INDEX IF NOT EXISTS idx_khata_transactions_created_at ON public.khata_transactions(pharmacy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_khata_transactions_customer ON public.khata_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_khata_transactions_supplier ON public.khata_transactions(supplier_id);
CREATE INDEX IF NOT EXISTS idx_khata_transactions_linked_order ON public.khata_transactions(linked_order_id);

-- 4. Short Book (আউট-অফ-স্টক ওষুধের তালিকা ও শর্ট খাতা)
CREATE TABLE IF NOT EXISTS public.khata_short_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id UUID REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  product_id TEXT,
  medicine_name TEXT NOT NULL,
  generic_name TEXT,
  company TEXT,
  required_qty INTEGER NOT NULL DEFAULT 1 CHECK (required_qty > 0),
  pack_size TEXT,
  estimated_price NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Cart', 'Ordered', 'Received')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_khata_short_book_pharmacy ON public.khata_short_book(pharmacy_id, status);

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- ==============================================================================

ALTER TABLE public.khata_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.khata_short_book ENABLE ROW LEVEL SECURITY;

-- Customers: Pharmacists can view/manage only their own store records
DROP POLICY IF EXISTS "khata_customers_pharmacy_isolation" ON public.khata_customers;
CREATE POLICY "khata_customers_pharmacy_isolation" ON public.khata_customers
  FOR ALL
  USING (
    pharmacy_id IS NULL OR 
    pharmacy_id IN (
      SELECT id FROM public.pharmacies WHERE user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    pharmacy_id IS NULL OR 
    pharmacy_id IN (
      SELECT id FROM public.pharmacies WHERE user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- Suppliers: Pharmacists can view/manage only their own store records
DROP POLICY IF EXISTS "khata_suppliers_pharmacy_isolation" ON public.khata_suppliers;
CREATE POLICY "khata_suppliers_pharmacy_isolation" ON public.khata_suppliers
  FOR ALL
  USING (
    pharmacy_id IS NULL OR 
    pharmacy_id IN (
      SELECT id FROM public.pharmacies WHERE user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    pharmacy_id IS NULL OR 
    pharmacy_id IN (
      SELECT id FROM public.pharmacies WHERE user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- Transactions: Isolated by pharmacy
DROP POLICY IF EXISTS "khata_transactions_pharmacy_isolation" ON public.khata_transactions;
CREATE POLICY "khata_transactions_pharmacy_isolation" ON public.khata_transactions
  FOR ALL
  USING (
    pharmacy_id IS NULL OR 
    pharmacy_id IN (
      SELECT id FROM public.pharmacies WHERE user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    pharmacy_id IS NULL OR 
    pharmacy_id IN (
      SELECT id FROM public.pharmacies WHERE user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

-- Short Book: Isolated by pharmacy
DROP POLICY IF EXISTS "khata_short_book_pharmacy_isolation" ON public.khata_short_book;
CREATE POLICY "khata_short_book_pharmacy_isolation" ON public.khata_short_book
  FOR ALL
  USING (
    pharmacy_id IS NULL OR 
    pharmacy_id IN (
      SELECT id FROM public.pharmacies WHERE user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  )
  WITH CHECK (
    pharmacy_id IS NULL OR 
    pharmacy_id IN (
      SELECT id FROM public.pharmacies WHERE user_id = auth.uid()
    ) OR
    auth.role() = 'service_role'
  );

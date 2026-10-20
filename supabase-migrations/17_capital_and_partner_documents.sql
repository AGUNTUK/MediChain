-- ==============================================================================
-- Migration 17: Capital & Partner Document Management System
-- Description:
--   1. partners table (profiles, equity/profit share, investment classification)
--   2. capital_transactions extensions (partner_id, purpose, document_reference)
--   3. capital_documents table (permanent traceable branded documents, versioning)
--   4. capital_document_sequences table (transaction-safe server-side numbering)
-- Safety: Uses CREATE TABLE IF NOT EXISTS & ALTER TABLE ADD COLUMN IF NOT EXISTS
-- ==============================================================================

-- 1. Partners / Investors Table
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  nid_reference TEXT,
  partner_type TEXT NOT NULL DEFAULT 'PARTNER_CAPITAL' CHECK (partner_type IN ('PARTNER_CAPITAL', 'INVESTOR_CAPITAL', 'PARTNER_LOAN', 'BUSINESS_LOAN')),
  ownership_percentage NUMERIC(5,2) DEFAULT 0,
  profit_share_percentage NUMERIC(5,2) DEFAULT 0,
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Archived')),
  notes TEXT,
  total_contributed NUMERIC(12,2) DEFAULT 0,
  total_withdrawn NUMERIC(12,2) DEFAULT 0,
  current_capital_balance NUMERIC(12,2) DEFAULT 0,
  created_by TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Extend Capital Transactions
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'capital_transactions' AND column_name = 'partner_id') THEN
    ALTER TABLE public.capital_transactions ADD COLUMN partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'capital_transactions' AND column_name = 'purpose') THEN
    ALTER TABLE public.capital_transactions ADD COLUMN purpose TEXT DEFAULT 'Partner Capital Contribution';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'capital_transactions' AND column_name = 'document_reference') THEN
    ALTER TABLE public.capital_transactions ADD COLUMN document_reference TEXT;
  END IF;
END $$;

-- 3. Capital Documents Table (Permanent, Versioned & Audited)
CREATE TABLE IF NOT EXISTS public.capital_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_number TEXT NOT NULL UNIQUE,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'CAPITAL_CONTRIBUTION_RECEIPT',
    'CASH_RECEIPT_VOUCHER',
    'CAPITAL_CONTRIBUTION_CERTIFICATE',
    'PARTNER_CAPITAL_STATEMENT',
    'PARTNER_CAPITAL_AGREEMENT'
  )),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  partner_name TEXT NOT NULL,
  capital_transaction_id UUID REFERENCES public.capital_transactions(id) ON DELETE SET NULL,
  document_title TEXT NOT NULL,
  document_status TEXT NOT NULL DEFAULT 'draft' CHECK (document_status IN ('draft', 'finalized', 'superseded', 'voided', 'archived')),
  document_version INT NOT NULL DEFAULT 1,
  storage_path TEXT,
  file_url TEXT,
  document_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT DEFAULT 'Admin',
  finalized_by TEXT,
  finalized_at TIMESTAMPTZ,
  void_reason TEXT,
  superseded_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Document Sequences Table (Transaction-Safe Server Sequence)
CREATE TABLE IF NOT EXISTS public.capital_document_sequences (
  sequence_prefix TEXT NOT NULL,
  year INT NOT NULL,
  current_val INT NOT NULL DEFAULT 0,
  PRIMARY KEY (sequence_prefix, year)
);

-- 5. Performance Indices
CREATE INDEX IF NOT EXISTS idx_partners_status ON public.partners (status);
CREATE INDEX IF NOT EXISTS idx_partners_type ON public.partners (partner_type);
CREATE INDEX IF NOT EXISTS idx_cap_docs_number ON public.capital_documents (document_number);
CREATE INDEX IF NOT EXISTS idx_cap_docs_partner ON public.capital_documents (partner_id, document_type);
CREATE INDEX IF NOT EXISTS idx_cap_docs_txn ON public.capital_documents (capital_transaction_id);
CREATE INDEX IF NOT EXISTS idx_cap_docs_status ON public.capital_documents (document_status);

-- 6. Row Level Security Hardening
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.capital_document_sequences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'partners' AND policyname = 'service_role_all_partners') THEN
    CREATE POLICY service_role_all_partners ON public.partners FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'capital_documents' AND policyname = 'service_role_all_cap_docs') THEN
    CREATE POLICY service_role_all_cap_docs ON public.capital_documents FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'capital_document_sequences' AND policyname = 'service_role_all_cap_seq') THEN
    CREATE POLICY service_role_all_cap_seq ON public.capital_document_sequences FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

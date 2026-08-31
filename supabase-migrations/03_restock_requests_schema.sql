-- ==========================================================
-- Migration: 03_restock_requests_schema.sql
-- Description: Production-ready Restock Request / Stock Alert Management System
-- ==========================================================

-- 1. Create restock_requests table
CREATE TABLE IF NOT EXISTS restock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  pharmacy_id TEXT NOT NULL,
  requested_by_user_id TEXT NOT NULL,
  requested_quantity INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'restocked', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  notification_sent_at TIMESTAMPTZ
);

-- 2. Partial Unique Index for Duplicate Prevention
-- Guarantees that a pharmacy can have only ONE active pending request per product at any given time.
-- Once resolved ('restocked' or 'cancelled'), subsequent future requests for the same product are permitted.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_restock_request 
ON restock_requests (product_id, pharmacy_id) 
WHERE status = 'pending';

-- 3. Query Performance Indexes
CREATE INDEX IF NOT EXISTS idx_restock_requests_product_id ON restock_requests (product_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_pharmacy_id ON restock_requests (pharmacy_id);
CREATE INDEX IF NOT EXISTS idx_restock_requests_status ON restock_requests (status);
CREATE INDEX IF NOT EXISTS idx_restock_requests_created_at ON restock_requests (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restock_requests_prod_status ON restock_requests (product_id, status);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE restock_requests ENABLE ROW LEVEL SECURITY;

-- 5. Row Level Security Policies
-- Pharmacies can view only their own requests
DROP POLICY IF EXISTS "Pharmacies can view own restock requests" ON restock_requests;
CREATE POLICY "Pharmacies can view own restock requests" 
ON restock_requests 
FOR SELECT 
USING (
  pharmacy_id IN (SELECT id::text FROM pharmacies WHERE user_id = auth.uid()::text) 
  OR requested_by_user_id = auth.uid()::text
);

-- Pharmacies can insert restock requests for their own pharmacy
DROP POLICY IF EXISTS "Pharmacies can insert own restock requests" ON restock_requests;
CREATE POLICY "Pharmacies can insert own restock requests" 
ON restock_requests 
FOR INSERT 
WITH CHECK (
  pharmacy_id IN (SELECT id::text FROM pharmacies WHERE user_id = auth.uid()::text) 
  OR requested_by_user_id = auth.uid()::text
);

-- Service role bypasses RLS for administrative and background operations

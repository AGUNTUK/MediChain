-- ==========================================================
-- Migration: 06_wms_staff_performance_and_barcodes.sql
-- Description: Adds warehouse order picking & packing attribution fields,
--              product barcode column, and indexes for staff performance metrics.
-- ==========================================================

-- 1. Add Staff Performance & Picking Audit columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picked_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS picker_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pick_started_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pick_completed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_by TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packer_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS packed_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_batch_picked BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS batch_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS unverified_picks_count INTEGER DEFAULT 0;

-- 2. Add Barcode column to products table for scan pick verification
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode TEXT;

-- 3. Query Performance Indexes for Staff Leaderboard & Realtime WMS Lookups
CREATE INDEX IF NOT EXISTS idx_orders_picked_by ON orders (picked_by);
CREATE INDEX IF NOT EXISTS idx_orders_packed_by ON orders (packed_by);
CREATE INDEX IF NOT EXISTS idx_orders_pick_started_at ON orders (pick_started_at);
CREATE INDEX IF NOT EXISTS idx_orders_packed_at ON orders (packed_at);
CREATE INDEX IF NOT EXISTS idx_orders_batch_id ON orders (batch_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode);

-- 4. Automatically generate initial barcode for products that currently lack one (prefix '880' + 9 digits)
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn 
  FROM products
)
UPDATE products p
SET barcode = '880' || LPAD(n.rn::text, 9, '0')
FROM numbered n
WHERE p.id = n.id AND (p.barcode IS NULL OR p.barcode = '');

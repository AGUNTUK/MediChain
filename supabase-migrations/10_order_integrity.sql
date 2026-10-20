-- ==============================================================================
-- Migration 10: Order & Invoice Data Integrity
-- Description: Establishes a database sequence for predictable monotonic order numbers,
-- adds dedicated columns to 'orders' (order_number, transaction_id, wms_attributes)
-- to stop multiplexing metadata into the user-facing 'notes' text field,
-- and provides backfill routines.
--
-- Safety: Additive only. Live code uses graceful fallbacks for order_number.
-- ==============================================================================

-- 1. Create Monotonic Order Sequence & Generator Function
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 10001;

CREATE OR REPLACE FUNCTION public.next_order_number() RETURNS text AS $$
DECLARE
  seq_val bigint;
BEGIN
  seq_val := nextval('public.order_number_seq');
  RETURN 'MCH-' || LPAD(seq_val::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. Add Dedicated Columns to Orders Table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS transaction_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS wms_attributes JSONB DEFAULT '{}'::jsonb;

-- 3. Backfill order_number from notes prefix 'MCH-XXXXX'
UPDATE public.orders
SET order_number = substring(notes from '^(MCH-[0-9A-Za-z]+)')
WHERE order_number IS NULL AND notes ~ '^MCH-[0-9A-Za-z]+';

-- For orders without an MCH prefix in notes, generate deterministic identifier
UPDATE public.orders
SET order_number = 'MCH-' || upper(substring(id::text, 1, 6))
WHERE order_number IS NULL;

-- 4. Clean up notes column to remove prefixed order identifier
UPDATE public.orders
SET notes = trim(regexp_replace(notes, '^MCH-[0-9A-Za-z]+(\.\s*)?', ''))
WHERE notes ~ '^MCH-[0-9A-Za-z]+';

-- 5. Backfill wms_attributes if multiplexed in notes
UPDATE public.orders
SET wms_attributes = substring(notes from 'WMS_ATTR:(\{.*\})')::jsonb
WHERE notes LIKE '%WMS_ATTR:%' AND notes ~ 'WMS_ATTR:\{.*\}' AND (wms_attributes IS NULL OR wms_attributes = '{}'::jsonb);

-- 6. Add Index on order_number
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);

-- ==============================================================================
-- Audit & Integrity Verification Queries (Run manually in SQL Editor):
-- 1. Count order items with missing product_id:
--    SELECT count(*) FROM public.order_items WHERE product_id IS NULL;
-- 2. Find duplicate order numbers:
--    SELECT order_number, count(*) FROM public.orders GROUP BY order_number HAVING count(*) > 1;
-- 3. Find invoices issued with placeholder license info:
--    SELECT count(*) FROM public.invoices WHERE invoice_number LIKE '%MCH%';
-- 4. Find orphan orders with no items:
--    SELECT o.id, o.created_at FROM public.orders o LEFT JOIN public.order_items oi ON oi.order_id = o.id WHERE oi.id IS NULL;
-- ==============================================================================

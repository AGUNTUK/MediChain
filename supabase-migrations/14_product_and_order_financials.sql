-- ==============================================================================
-- Migration 14: Product and Order Financials (Buying Price, COGS, Profitability)
-- Description:
--   1. Adds internal buying_price to products and inventory tables (nullable NUMERIC(12,2))
--   2. Adds historical financial snapshot columns to order_items:
--      buying_price, line_sales_amount, line_cost_amount, line_profit_amount
--
-- Safety: Uses ALTER TABLE ... ADD COLUMN IF NOT EXISTS. Completely non-destructive.
-- ==============================================================================

-- 1. Product Catalog: Internal Buying Price (NULL = Unknown, strictly confidential)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS buying_price NUMERIC(12,2) DEFAULT NULL;

-- 2. Inventory: Batch-level acquisition cost support
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS buying_price NUMERIC(12,2) DEFAULT NULL;

-- 3. Historical Order Items: Immutable financial snapshots at time of order
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS buying_price NUMERIC(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS line_sales_amount NUMERIC(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS line_cost_amount NUMERIC(12,2) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS line_profit_amount NUMERIC(12,2) DEFAULT NULL;

-- 4. Performance indices for finance and missing cost queries
CREATE INDEX IF NOT EXISTS idx_products_buying_price ON public.products (buying_price) WHERE buying_price IS NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_financials ON public.order_items (order_id, buying_price);

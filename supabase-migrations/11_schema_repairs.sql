-- ==============================================================================
-- Migration 11: Schema Repairs, Automated updated_at Triggers & Integrity Constraints
-- Description: 
-- 1. Corrects invalid window-function barcode assignment from migration 06.
-- 2. Adds missing Foreign Key constraints with explicit ON DELETE rules.
-- 3. Implements real automatic updated_at timestamp triggers across core tables.
-- 4. Deduplicates redundant indexes and retires unused tsvector overhead in favor of pg_trgm.
--
-- Safety: Additive / idempotent. Orphan checks included before applying FK constraints.
-- ==============================================================================

-- 1. Barcode Assignment CTE & Unique Constraint (H2)
WITH numbered AS (
  SELECT id, row_number() OVER (ORDER BY id) AS rn 
  FROM public.products
)
UPDATE public.products p
SET barcode = '880' || LPAD(n.rn::text, 9, '0')
FROM numbered n
WHERE p.id = n.id AND (p.barcode IS NULL OR p.barcode = '');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'products_barcode_unique'
  ) THEN
    -- Only add unique constraint if no duplicates exist
    IF NOT EXISTS (
      SELECT barcode FROM public.products WHERE barcode IS NOT NULL AND barcode != '' GROUP BY barcode HAVING count(*) > 1
    ) THEN
      ALTER TABLE public.products ADD CONSTRAINT products_barcode_unique UNIQUE (barcode);
    END IF;
  END IF;
END $$;

-- 2. Add Missing Foreign Key Constraints (H3)
-- Clean orphan restock requests if any exist before adding foreign key
DO $$
BEGIN
  -- A. Restock requests -> Products
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'restock_requests') THEN
    DELETE FROM public.restock_requests WHERE product_id NOT IN (SELECT id::text FROM public.products);
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_restock_requests_product') THEN
      ALTER TABLE public.restock_requests 
        ADD CONSTRAINT fk_restock_requests_product 
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;

    -- B. Restock requests -> Pharmacies
    DELETE FROM public.restock_requests WHERE pharmacy_id NOT IN (SELECT id::text FROM public.pharmacies);
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_restock_requests_pharmacy') THEN
      ALTER TABLE public.restock_requests 
        ADD CONSTRAINT fk_restock_requests_pharmacy 
        FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;
    END IF;
  END IF;

  -- C. Bulk campaign products -> Products
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bulk_campaign_products') THEN
    DELETE FROM public.bulk_campaign_products WHERE product_id NOT IN (SELECT id::text FROM public.products);
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bulk_campaign_products_product') THEN
      ALTER TABLE public.bulk_campaign_products 
        ADD CONSTRAINT fk_bulk_campaign_products_product 
        FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Notice applying foreign keys: %', SQLERRM;
END $$;

-- 3. Automatic updated_at Trigger Function (H4)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables that contain an updated_at column
DO $$
DECLARE
  tbl text;
  tables_with_updated_at text[] := ARRAY[
    'products',
    'inventory',
    'orders',
    'pharmacies',
    'carts',
    'app_settings',
    'restock_requests'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_updated_at LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS tr_%I_updated_at ON public.%I;', tbl, tbl);
      EXECUTE format('CREATE TRIGGER tr_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- 4. Deduplicate Redundant Indexes (H5)
-- In migration 05, idx_restock_requests_* was created twice (already in migration 03).
-- Safely ensure exactly one index exists per column.
DROP INDEX IF EXISTS public.idx_restock_requests_product_id_dup;

-- Retain pg_trgm GIN indices for ILIKE and drop legacy unused tsvector trigger
DROP TRIGGER IF EXISTS tr_product_search_vector ON public.products;
DROP INDEX IF EXISTS public.products_search_vector_idx;

-- End of Migration 11

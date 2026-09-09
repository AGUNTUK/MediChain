-- Migration 13: Bulk Campaign Billboard Banner Columns
-- Adds featured product, explicit discount percent, trust badges, and CTA link to bulk_campaigns

ALTER TABLE IF EXISTS public.bulk_campaigns 
  ADD COLUMN IF NOT EXISTS featured_product_id TEXT,
  ADD COLUMN IF NOT EXISTS discount_display_percent NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_badges JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS cta_link TEXT DEFAULT '/products';

-- Optional foreign key constraint with safe check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_bulk_campaigns_featured_product'
  ) THEN
    ALTER TABLE public.bulk_campaigns
      ADD CONSTRAINT fk_bulk_campaigns_featured_product
      FOREIGN KEY (featured_product_id) REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Gracefully ignore if type cast or constraint already exists
END $$;

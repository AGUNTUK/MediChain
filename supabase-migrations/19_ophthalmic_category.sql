-- Migration 19: Add Ophthalmic category and assign all eye care/ophthalmic products

-- 1. Ensure Ophthalmic category exists in categories table
INSERT INTO public.categories (name, created_at)
SELECT 'Ophthalmic', NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories WHERE LOWER(name) = 'ophthalmic'
);

-- 2. Update all eye/ophthalmic/eye care/eye drops products to category 'Ophthalmic'
DO $$
DECLARE
  v_ophthalmic_id UUID;
BEGIN
  SELECT id INTO v_ophthalmic_id FROM public.categories WHERE LOWER(name) = 'ophthalmic' LIMIT 1;

  UPDATE public.products
  SET 
    category_name_fallback = 'Ophthalmic',
    category_id = v_ophthalmic_id
  WHERE 
    category_name_fallback IN ('Eye Drop', 'Eye Drops', 'Eye Care', 'Eye Gel', 'Eye Ointment')
    OR (
      (LOWER(name) LIKE '%eye drop%' 
       OR LOWER(name) LIKE '%eye care%' 
       OR LOWER(name) LIKE '%eye gel%' 
       OR LOWER(name) LIKE '%eye ointment%'
       OR LOWER(name) LIKE '%ophthalmic%'
       OR LOWER(generic_name) LIKE '%ophthalmic%'
       OR LOWER(name) LIKE '%supraphen%')
      AND LOWER(name) NOT LIKE '%ear drop%'
      AND LOWER(name) NOT LIKE '%nasal%'
      AND LOWER(category_name_fallback) NOT LIKE '%ear%'
      AND LOWER(category_name_fallback) NOT LIKE '%nasal%'
    );
END $$;

-- Migration 12: Order Amendments Table & Audit Trail
-- Tracks procurement-time line item unavailability and automatic recalculation before packing

CREATE TABLE IF NOT EXISTS public.order_amendments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  removed_quantity INTEGER NOT NULL CHECK (removed_quantity > 0),
  reason TEXT,
  amended_by TEXT NOT NULL,
  amended_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for rapid lookup by order
CREATE INDEX IF NOT EXISTS idx_order_amendments_order_id ON public.order_amendments (order_id);
CREATE INDEX IF NOT EXISTS idx_order_amendments_amended_at ON public.order_amendments (amended_at DESC);

-- Enable RLS
ALTER TABLE IF EXISTS public.order_amendments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Order amendments readable by owning pharmacy" ON public.order_amendments;
CREATE POLICY "Order amendments readable by owning pharmacy"
  ON public.order_amendments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      JOIN public.pharmacies p ON p.id = o.pharmacy_id
      WHERE o.id = order_amendments.order_id
      AND (p.user_id = auth.uid() OR auth.jwt() ->> 'role' IN ('Admin', 'Depot Manager', 'Depot Staff', 'Rider'))
    )
  );

DROP POLICY IF EXISTS "Order amendments insertable by staff and admin" ON public.order_amendments;
CREATE POLICY "Order amendments insertable by staff and admin"
  ON public.order_amendments FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' IN ('Admin', 'Depot Manager', 'Depot Staff')
    OR auth.role() = 'service_role'
  );

-- ==============================================================================
-- Migration 00: Reconstructed Baseline Schema
-- Description: Complete declarative definition of all MediChain core database tables.
-- Resolves H1 (recovering the accidentally overwritten baseline schema).
-- Can be used to recreate the complete schema in a clean database or staging environment.
--
-- Safety: Uses CREATE TABLE IF NOT EXISTS. Completely non-destructive to existing data.
-- ==============================================================================

-- 1. Users & Accounts
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'Pharmacy Owner' CHECK (role IN ('Pharmacy Owner', 'Admin', 'Depot Staff', 'Delivery Staff')),
  pharmacy_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Pharmacies
CREATE TABLE IF NOT EXISTS public.pharmacies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  pharmacy_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  license_number TEXT,
  license_information TEXT,
  verification_status TEXT DEFAULT 'Pending' CHECK (verification_status IN ('Pending', 'Verified', 'Rejected', 'Suspended')),
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Products Catalog
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  generic_name TEXT,
  company TEXT NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name_fallback TEXT,
  strength TEXT,
  pack_size TEXT,
  selling_price NUMERIC(12,2) NOT NULL,
  mrp NUMERIC(12,2) NOT NULL,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  barcode TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Inventory (FEFO & Batch tracking)
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  available_stock INTEGER NOT NULL DEFAULT 0,
  reserved_stock INTEGER NOT NULL DEFAULT 0,
  sold_stock INTEGER NOT NULL DEFAULT 0,
  batch_number TEXT NOT NULL,
  expiry_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT,
  pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled')),
  payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
  payment_status TEXT NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed')),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_savings NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_mrp NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  transaction_id TEXT,
  wms_attributes JSONB DEFAULT '{}'::jsonb,
  delivery_address TEXT,
  estimated_delivery TIMESTAMPTZ,
  handover_otp TEXT,
  assigned_rider_id UUID,
  picked_by TEXT,
  picker_name TEXT,
  pick_started_at TIMESTAMPTZ,
  pick_completed_at TIMESTAMPTZ,
  packed_by TEXT,
  packer_name TEXT,
  packed_at TIMESTAMPTZ,
  is_batch_picked BOOLEAN DEFAULT FALSE,
  batch_id TEXT,
  unverified_picks_count INTEGER DEFAULT 0,
  has_return_requested BOOLEAN DEFAULT FALSE,
  return_reason TEXT,
  return_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Favourites
CREATE TABLE IF NOT EXISTS public.favourites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_product_favourite UNIQUE (user_id, product_id)
);

-- End of Baseline Schema

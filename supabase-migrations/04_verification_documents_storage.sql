-- ========================================================
-- Migration: Create Private Storage Bucket 'verification-documents'
-- and Configure Storage Row Level Security (RLS) Policies
-- ========================================================

-- 1. Create the bucket if it doesn't already exist (Idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  false, -- STRICTLY PRIVATE
  10485760, -- 10 MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ];

-- 2. Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Authenticated Pharmacies can upload verification documents to their own pharmacy/user folder
-- Path pattern: {pharmacy_id}/{doc_type}/{filename} OR {user_id}/{doc_type}/{filename}
DROP POLICY IF EXISTS "Pharmacies can upload own verification documents" ON storage.objects;
CREATE POLICY "Pharmacies can upload own verification documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (
    -- Allow if path starts with user's pharmacy_id
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.pharmacies WHERE user_id = auth.uid()
    )
    -- Or if path starts with the user's auth UID
    OR (storage.foldername(name))[1] = auth.uid()::text
    -- Or if user is an Admin
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'
    )
  )
);

-- 4. Policy: Authenticated Pharmacies can read/view their own verification documents, and Admins can view all
DROP POLICY IF EXISTS "Pharmacies can read own verification documents" ON storage.objects;
CREATE POLICY "Pharmacies can read own verification documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (
    -- User is reading their own pharmacy's documents
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.pharmacies WHERE user_id = auth.uid()
    )
    -- Or path starts with user's auth UID
    OR (storage.foldername(name))[1] = auth.uid()::text
    -- Or user is an Admin
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'
    )
  )
);

-- 5. Policy: Pharmacies can update their own documents, and Admins can update all
DROP POLICY IF EXISTS "Pharmacies can update own verification documents" ON storage.objects;
CREATE POLICY "Pharmacies can update own verification documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.pharmacies WHERE user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'verification-documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.pharmacies WHERE user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'
    )
  )
);

-- 6. Policy: Pharmacies can delete their own documents, and Admins can delete all
DROP POLICY IF EXISTS "Pharmacies can delete own verification documents" ON storage.objects;
CREATE POLICY "Pharmacies can delete own verification documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-documents'
  AND (
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.pharmacies WHERE user_id = auth.uid()
    )
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Admin'
    )
  )
);

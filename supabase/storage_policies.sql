-- Storage RLS policies for all buckets
-- Run in Supabase Dashboard > Storage > Policies, or via supabase db push

-- ==================== cv-uploads (PRIVATE) ====================
-- Authenticated users can read files in their company folder
CREATE POLICY "cv-uploads-read-company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
  );

-- Authenticated users can upload to their company folder
CREATE POLICY "cv-uploads-insert-company"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
  );

-- Owner can update their own files
CREATE POLICY "cv-uploads-update-owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND owner = auth.uid()
  );

-- Owner can delete their own files
CREATE POLICY "cv-uploads-delete-owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND owner = auth.uid()
  );

-- ==================== company-logos (PUBLIC read) ====================
-- Anyone can read company logos
CREATE POLICY "company-logos-public-read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

-- Authenticated admin can upload/replace logos
CREATE POLICY "company-logos-admin-write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- Authenticated admin can update logos
CREATE POLICY "company-logos-admin-update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- Authenticated admin can delete logos
CREATE POLICY "company-logos-admin-delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-logos'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ==================== avatars (PUBLIC read) ====================
-- Anyone can read avatars
CREATE POLICY "avatars-public-read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

-- Authenticated users can upload their own avatar
CREATE POLICY "avatars-user-write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND owner = auth.uid()
  );

-- Authenticated users can update their own avatar
CREATE POLICY "avatars-user-update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND owner = auth.uid()
  );

-- ==================== generated-docs (PRIVATE) ====================
-- Authenticated users can read docs from their company
CREATE POLICY "generated-docs-read-company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-docs'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
  );

-- Authenticated admin/hr can upload docs to their company
CREATE POLICY "generated-docs-insert-admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'generated-docs'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ==================== exports (PRIVATE) ====================
-- Authenticated admin/hr can read exports from their company
CREATE POLICY "exports-read-admin"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- Authenticated admin/hr can create exports in their company
CREATE POLICY "exports-insert-admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'exports'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- Storage RLS policies (mirrors storage_policies.sql as a versioned migration)

-- ==================== cv-uploads (PRIVATE) ====================
CREATE POLICY "cv-uploads-read-company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
  );

CREATE POLICY "cv-uploads-insert-company"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'cv-uploads'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
  );

CREATE POLICY "cv-uploads-update-owner"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND owner = auth.uid()
  );

CREATE POLICY "cv-uploads-delete-owner"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'cv-uploads'
    AND owner = auth.uid()
  );

-- ==================== company-logos (PUBLIC read) ====================
CREATE POLICY "company-logos-public-read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'company-logos');

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
CREATE POLICY "avatars-public-read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars-user-write"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND owner = auth.uid()
  );

CREATE POLICY "avatars-user-update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND owner = auth.uid()
  );

-- ==================== generated-docs (PRIVATE) ====================
CREATE POLICY "generated-docs-read-company"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'generated-docs'
    AND (storage.foldername(name))[1] = auth.jwt()->>'company_id'
  );

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

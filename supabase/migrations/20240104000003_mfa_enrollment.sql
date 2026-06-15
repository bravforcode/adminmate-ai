-- MFA Enrollment tracking for TOTP-based 2FA
-- Uses Supabase built-in MFA (auth.mfa_factors) as source of truth,
-- this table tracks enrollment metadata and encrypted backup codes.

CREATE TABLE mfa_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  factor_id TEXT,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  backup_codes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_mfa_enrollments_user_active
  ON mfa_enrollments(user_id) WHERE is_active = true;

CREATE INDEX idx_mfa_enrollments_user_id ON mfa_enrollments(user_id);

ALTER TABLE mfa_enrollments ENABLE ROW LEVEL SECURITY;

-- Users can only see their own enrollments
DROP POLICY IF EXISTS "mfa_enrollments_select_own" ON mfa_enrollments;
CREATE POLICY "mfa_enrollments_select_own" ON mfa_enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own enrollments
DROP POLICY IF EXISTS "mfa_enrollments_insert_own" ON mfa_enrollments;
CREATE POLICY "mfa_enrollments_insert_own" ON mfa_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own enrollments
DROP POLICY IF EXISTS "mfa_enrollments_update_own" ON mfa_enrollments;
CREATE POLICY "mfa_enrollments_update_own" ON mfa_enrollments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- Prevent anon access
DROP POLICY IF EXISTS "mfa_enrollments_no_anon" ON mfa_enrollments;
CREATE POLICY "mfa_enrollments_no_anon" ON mfa_enrollments
  FOR ALL TO anon
  USING (false)
  WITH CHECK (false);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_mfa_enrollments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mfa_enrollments_updated_at ON mfa_enrollments;
CREATE TRIGGER mfa_enrollments_updated_at
  BEFORE UPDATE ON mfa_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_mfa_enrollments_updated_at();

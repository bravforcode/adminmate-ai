-- SCIM 2.0 Provisioning tables
-- User lifecycle management via SSO push

-- Add SCIM fields to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS scim_external_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS scim_last_sync TIMESTAMPTZ;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auth_provider TEXT DEFAULT 'email';

-- SCIM provisioning logs
CREATE TABLE IF NOT EXISTS scim_provisioning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'deprovision')),
  external_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scim_logs_company ON scim_provisioning_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_scim_logs_external ON scim_provisioning_logs(external_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_scim_external ON user_profiles(scim_external_id);

-- RLS policies
ALTER TABLE scim_provisioning_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scim_logs_company_isolation" ON scim_provisioning_logs
  FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- SCIM endpoint requires service token (not user session)
-- In production, SCIM endpoints would be edge functions with service auth

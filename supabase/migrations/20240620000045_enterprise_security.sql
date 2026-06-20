-- ============================================================
-- Release 22: Enterprise Security — SSO / SAML / SCIM / Session Policy
-- SSO provider configs, SCIM tokens, session policies, security events.
-- SSO disabled by default. SCIM cannot bypass company scope.
-- ============================================================

-- 1. SSO Provider Configurations
CREATE TABLE IF NOT EXISTS sso_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_type VARCHAR(50) NOT NULL,            -- 'saml', 'oidc', 'azure_ad', 'google_workspace'
  provider_name VARCHAR(255) NOT NULL,
  metadata_url TEXT,
  entity_id VARCHAR(512),
  certificate TEXT,
  is_enabled BOOLEAN DEFAULT false,               -- Disabled by default
  config_status VARCHAR(30) DEFAULT 'not_configured', -- 'not_configured', 'configured', 'verified', 'error'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sso_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY sso_read ON sso_provider_configs
  FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY sso_insert ON sso_provider_configs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'write')
  );
CREATE POLICY sso_update ON sso_provider_configs
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'write')
  );
CREATE POLICY sso_delete ON sso_provider_configs
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'write')
  );

CREATE INDEX IF NOT EXISTS idx_sso_company ON sso_provider_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_sso_enabled ON sso_provider_configs(is_enabled);
CREATE INDEX IF NOT EXISTS idx_sso_status ON sso_provider_configs(config_status);

CREATE TRIGGER update_sso_updated_at BEFORE UPDATE ON sso_provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. SCIM Tokens
CREATE TABLE IF NOT EXISTS scim_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_config_id UUID NOT NULL REFERENCES sso_provider_configs(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,               -- SHA-256 hash of token
  scopes JSONB DEFAULT '["users", "groups"]',    -- SCIM resource scopes
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE scim_tokens ENABLE ROW LEVEL SECURITY;

-- SCIM tokens: only admin/owner can read
CREATE POLICY scim_read ON scim_tokens
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'read')
  );
-- SCIM tokens: only admin/owner can create — company_id MUST match (cannot bypass scope)
CREATE POLICY scim_insert ON scim_tokens
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'write')
  );
CREATE POLICY scim_update ON scim_tokens
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'write')
  );
CREATE POLICY scim_delete ON scim_tokens
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'write')
  );

CREATE INDEX IF NOT EXISTS idx_scim_company ON scim_tokens(company_id);
CREATE INDEX IF NOT EXISTS idx_scim_provider ON scim_tokens(provider_config_id);
CREATE INDEX IF NOT EXISTS idx_scim_active ON scim_tokens(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_scim_hash ON scim_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_scim_expires ON scim_tokens(expires_at);

-- 3. Session Policies
CREATE TABLE IF NOT EXISTS session_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  max_session_hours INTEGER DEFAULT 8,
  idle_timeout_minutes INTEGER DEFAULT 30,
  require_mfa BOOLEAN DEFAULT false,
  ip_allowlist JSONB DEFAULT '[]',                -- Allowed IP CIDRs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id)                             -- One policy per company
);

ALTER TABLE session_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY sp_read ON session_policies
  FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY sp_insert ON session_policies
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND has_permission('session_policy', 'write')
  );
CREATE POLICY sp_update ON session_policies
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND has_permission('session_policy', 'write')
  );
CREATE POLICY sp_delete ON session_policies
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND has_permission('session_policy', 'write')
  );

CREATE INDEX IF NOT EXISTS idx_sp_company ON session_policies(company_id);

CREATE TRIGGER update_sp_updated_at BEFORE UPDATE ON session_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Security Events
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  event_type VARCHAR(100) NOT NULL,              -- 'sso_login', 'sso_failure', 'session_expired', 'ip_blocked', 'mfa_required', etc.
  ip_address INET,
  user_agent TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Security events: admin/owner can read company events; system can insert
CREATE POLICY se_read ON security_events
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND has_permission('sso', 'read')
  );
-- Service role inserts via RPC; direct insert only by authenticated users in same company
CREATE POLICY se_insert ON security_events
  FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_se_company ON security_events(company_id);
CREATE INDEX IF NOT EXISTS idx_se_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_se_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_se_created ON security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_se_company_type ON security_events(company_id, event_type);

-- ============================================================
-- RBAC Permissions: sso_read, sso_write, session_policy_read, session_policy_write
-- Owner and admin only for write. Read = admin/owner.
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('sso', 'read',   'View SSO configuration'),
  ('sso', 'write',  'Manage SSO configuration and SCIM tokens'),
  ('session_policy', 'read',  'View session policy'),
  ('session_policy', 'write', 'Manage session policy');

-- Owner: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource IN ('sso', 'session_policy');

-- Admin: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource IN ('sso', 'session_policy');

-- ============================================================
-- Helper: Validate session against company policy
-- ============================================================
CREATE OR REPLACE FUNCTION validate_company_session(
  p_user_id UUID,
  p_company_id UUID,
  p_session_started_at TIMESTAMPTZ,
  p_last_active_at TIMESTAMPTZ,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_policy RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_session_hours NUMERIC;
  v_idle_minutes NUMERIC;
  v_result JSONB := '{"valid": true}'::jsonb;
BEGIN
  SELECT * INTO v_policy
  FROM session_policies
  WHERE company_id = p_company_id;

  -- No policy = use defaults (8h session, 30min idle)
  IF v_policy IS NULL THEN
    v_policy := ROW(NULL, p_company_id, 8, 30, false, '[]'::jsonb, now(), now());
  END IF;

  -- Check max session duration
  v_session_hours := EXTRACT(EPOCH FROM (v_now - p_session_started_at)) / 3600;
  IF v_session_hours > v_policy.max_session_hours THEN
    v_result := v_result || '{"valid": false, "reason": "session_max_duration_exceeded"}'::jsonb;
  END IF;

  -- Check idle timeout
  v_idle_minutes := EXTRACT(EPOCH FROM (v_now - p_last_active_at)) / 60;
  IF v_idle_minutes > v_policy.idle_timeout_minutes THEN
    v_result := v_result || '{"valid": false, "reason": "idle_timeout_exceeded"}'::jsonb;
  END IF;

  -- Check IP allowlist
  IF p_ip_address IS NOT NULL AND jsonb_array_length(v_policy.ip_allowlist) > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_policy.ip_allowlist) AS allowed
      WHERE p_ip_address <<= allowed::cidr
    ) THEN
      v_result := v_result || '{"valid": false, "reason": "ip_not_allowed"}'::jsonb;
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

-- ============================================================
-- Helper: Enforce SCIM company scope (prevent cross-company token usage)
-- ============================================================
CREATE OR REPLACE FUNCTION validate_scim_token(
  p_token_hash VARCHAR(64),
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM scim_tokens st
    JOIN sso_provider_configs sp ON sp.id = st.provider_config_id
    WHERE st.token_hash = p_token_hash
      AND st.is_active = true
      AND (st.expires_at IS NULL OR st.expires_at > NOW())
      AND st.company_id = p_company_id          -- Company scope enforced
      AND sp.company_id = p_company_id           -- Double-check provider belongs to same company
      AND sp.is_enabled = true                   -- SSO must be enabled
  )
$$;

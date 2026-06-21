-- RELEASE 26C.2 — Enhanced Feature Flags
-- Supports: global, tenant, plan, country, beta, kill-switch
-- Extends base feature_flags from 20240620000006_global_config_tables.sql

-- ============== EXTEND FEATURE_FLAGS TABLE ==============
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS flag_type VARCHAR(30) NOT NULL DEFAULT 'global'
  CHECK (flag_type IN ('global', 'tenant', 'plan', 'country', 'beta', 'kill_switch'));
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS is_kill_switch BOOLEAN DEFAULT false;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS rollout_percentage INTEGER DEFAULT 100
  CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100);
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS allowed_plans TEXT[] DEFAULT '{}';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS allowed_countries TEXT[] DEFAULT '{}';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============== PLAN_FEATURE_FLAGS ==============
-- Plan-based feature overrides (e.g. 'pro' plan gets AI matching)
CREATE TABLE IF NOT EXISTS plan_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_slug VARCHAR(50) NOT NULL,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_slug, feature_flag_id)
);

-- ============== COUNTRY_FEATURE_FLAGS ==============
-- Country-based feature overrides (e.g. payroll only in TH)
CREATE TABLE IF NOT EXISTS country_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code VARCHAR(10) NOT NULL,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(country_code, feature_flag_id)
);

-- ============== BETA_ENROLLMENTS ==============
-- Tracks which companies are enrolled in beta features
CREATE TABLE IF NOT EXISTS beta_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_flag_id UUID NOT NULL REFERENCES feature_flags(id) ON DELETE CASCADE,
    enrolled_by UUID REFERENCES auth.users(id),
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
    UNIQUE(company_id, feature_flag_id)
);

-- ============== FEATURE_FLAG_EVALUATION_LOG ==============
-- Audit trail for kill-switch activations and flag evaluations
CREATE TABLE IF NOT EXISTS feature_flag_evaluation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    feature_key VARCHAR(100) NOT NULL,
    flag_type VARCHAR(30) NOT NULL,
    result BOOLEAN NOT NULL,
    evaluation_path TEXT NOT NULL,  -- e.g. 'kill_switch -> tenant_override -> global_default'
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== INDEXES ==============
CREATE INDEX IF NOT EXISTS idx_feature_flags_flag_type ON feature_flags(flag_type);
CREATE INDEX IF NOT EXISTS idx_feature_flags_kill_switch ON feature_flags(is_kill_switch) WHERE is_kill_switch = true;
CREATE INDEX IF NOT EXISTS idx_plan_feature_flags_plan ON plan_feature_flags(plan_slug);
CREATE INDEX IF NOT EXISTS idx_plan_feature_flags_flag ON plan_feature_flags(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_country_feature_flags_country ON country_feature_flags(country_code);
CREATE INDEX IF NOT EXISTS idx_country_feature_flags_flag ON country_feature_flags(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_beta_enrollments_company ON beta_enrollments(company_id);
CREATE INDEX IF NOT EXISTS idx_beta_enrollments_flag ON beta_enrollments(feature_flag_id);
CREATE INDEX IF NOT EXISTS idx_beta_enrollments_status ON beta_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_ff_eval_log_company ON feature_flag_evaluation_log(company_id);
CREATE INDEX IF NOT EXISTS idx_ff_eval_log_flag ON feature_flag_evaluation_log(feature_key);

-- ============== RLS ==============
ALTER TABLE plan_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE country_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE beta_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_evaluation_log ENABLE ROW LEVEL SECURITY;

-- Plan flags: readable by authenticated, writable by platform admins
CREATE POLICY "plan_feature_flags_read" ON plan_feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "plan_feature_flags_write" ON plan_feature_flags FOR ALL TO authenticated
  USING (safe_user_role() = 'platform_admin')
  WITH CHECK (safe_user_role() = 'platform_admin');

-- Country flags: readable by authenticated, writable by platform admins
CREATE POLICY "country_feature_flags_read" ON country_feature_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "country_feature_flags_write" ON country_feature_flags FOR ALL TO authenticated
  USING (safe_user_role() = 'platform_admin')
  WITH CHECK (safe_user_role() = 'platform_admin');

-- Beta enrollments: company-scoped read, admin write
CREATE POLICY "beta_enrollments_read" ON beta_enrollments FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());
CREATE POLICY "beta_enrollments_write" ON beta_enrollments FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() = 'admin')
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() = 'admin');

-- Evaluation log: company-scoped read, system-only write
CREATE POLICY "ff_eval_log_read" ON feature_flag_evaluation_log FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR company_id IS NULL);
CREATE POLICY "ff_eval_log_insert" ON feature_flag_evaluation_log FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============== ENHANCED is_feature_enabled FUNCTION ==============
-- Evaluation order: kill_switch -> plan -> country -> tenant -> beta -> global
CREATE OR REPLACE FUNCTION is_feature_enabled(
  p_feature_key TEXT,
  p_company_id UUID DEFAULT NULL,
  p_plan_slug TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_flag_id UUID;
  v_flag_type VARCHAR(30);
  v_is_kill_switch BOOLEAN;
  v_result BOOLEAN;
  v_eval_path TEXT := '';
BEGIN
  -- Find the flag definition
  SELECT id, flag_type, is_kill_switch
  INTO v_flag_id, v_flag_type, v_is_kill_switch
  FROM feature_flags
  WHERE key = p_feature_key AND deleted_at IS NULL
  LIMIT 1;

  IF v_flag_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. KILL SWITCH — if active, feature is OFF everywhere, no exceptions
  IF v_is_kill_switch = true THEN
    v_result := false;
    v_eval_path := 'kill_switch_active';
    -- Log evaluation
    INSERT INTO feature_flag_evaluation_log (company_id, feature_key, flag_type, result, evaluation_path)
    VALUES (p_company_id, p_feature_key, v_flag_type, false, v_eval_path);
    RETURN false;
  END IF;

  -- 2. PLAN OVERRIDE — check if plan is in allowed_plans or plan_feature_flags table
  IF p_plan_slug IS NOT NULL AND v_flag_type IN ('global', 'plan') THEN
    -- Check plan_feature_flags table
    SELECT PFF.is_enabled INTO v_result
    FROM plan_feature_flags PFF
    WHERE PFF.feature_flag_id = v_flag_id
      AND PFF.plan_slug = p_plan_slug
    LIMIT 1;

    IF v_result IS NOT NULL THEN
      v_eval_path := 'plan_override:' || p_plan_slug;
      INSERT INTO feature_flag_evaluation_log (company_id, feature_key, flag_type, result, evaluation_path)
      VALUES (p_company_id, p_feature_key, v_flag_type, v_result, v_eval_path);
      RETURN v_result;
    END IF;
  END IF;

  -- 3. COUNTRY OVERRIDE
  IF p_country_code IS NOT NULL AND v_flag_type IN ('global', 'country') THEN
    SELECT CFF.is_enabled INTO v_result
    FROM country_feature_flags CFF
    WHERE CFF.feature_flag_id = v_flag_id
      AND CFF.country_code = p_country_code
    LIMIT 1;

    IF v_result IS NOT NULL THEN
      v_eval_path := 'country_override:' || p_country_code;
      INSERT INTO feature_flag_evaluation_log (company_id, feature_key, flag_type, result, evaluation_path)
      VALUES (p_company_id, p_feature_key, v_flag_type, v_result, v_eval_path);
      RETURN v_result;
    END IF;
  END IF;

  -- 4. TENANT (COMPANY) OVERRIDE
  IF p_company_id IS NOT NULL AND v_flag_type IN ('global', 'tenant', 'beta') THEN
    SELECT CFF.is_enabled INTO v_result
    FROM company_feature_flags CFF
    WHERE CFF.feature_flag_id = v_flag_id
      AND CFF.company_id = p_company_id
    LIMIT 1;

    IF v_result IS NOT NULL THEN
      v_eval_path := 'tenant_override:' || p_company_id;
      INSERT INTO feature_flag_evaluation_log (company_id, feature_key, flag_type, result, evaluation_path)
      VALUES (p_company_id, p_feature_key, v_flag_type, v_result, v_eval_path);
      RETURN v_result;
    END IF;
  END IF;

  -- 5. BETA ENROLLMENT — for beta flags, only enrolled companies get access
  IF v_flag_type = 'beta' THEN
    IF p_company_id IS NOT NULL THEN
      SELECT true INTO v_result
      FROM beta_enrollments BE
      WHERE BE.feature_flag_id = v_flag_id
        AND BE.company_id = p_company_id
        AND BE.status = 'active'
        AND (BE.expires_at IS NULL OR BE.expires_at > NOW())
      LIMIT 1;

      v_result := COALESCE(v_result, false);
      v_eval_path := 'beta_enrollment';
      INSERT INTO feature_flag_evaluation_log (company_id, feature_key, flag_type, result, evaluation_path)
      VALUES (p_company_id, p_feature_key, v_flag_type, v_result, v_eval_path);
      RETURN v_result;
    END IF;
    -- Beta flag with no company — denied
    INSERT INTO feature_flag_evaluation_log (company_id, feature_key, flag_type, result, evaluation_path)
    VALUES (p_company_id, p_feature_key, v_flag_type, false, 'beta_no_company');
    RETURN false;
  END IF;

  -- 6. GLOBAL DEFAULT
  v_eval_path := 'global_default';
  INSERT INTO feature_flag_evaluation_log (company_id, feature_key, flag_type, result, evaluation_path)
  VALUES (p_company_id, p_feature_key, v_flag_type,
    (SELECT is_enabled FROM feature_flags WHERE id = v_flag_id), v_eval_path);

  RETURN (SELECT is_enabled FROM feature_flags WHERE id = v_flag_id);
END;
$$;

-- ============== HELPER: Activate kill switch ==============
CREATE OR REPLACE FUNCTION activate_kill_switch(p_feature_key TEXT, p_activate BOOLEAN DEFAULT true)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE feature_flags
  SET is_kill_switch = p_activate,
      updated_at = NOW()
  WHERE key = p_feature_key;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Feature flag not found: %', p_feature_key;
  END IF;

  -- Log the kill switch activation
  INSERT INTO feature_flag_evaluation_log (company_id, feature_key, flag_type, result, evaluation_path)
  VALUES (NULL, p_feature_key, 'kill_switch', NOT p_activate, 'kill_switch_' || CASE WHEN p_activate THEN 'activated' ELSE 'deactivated' END);
END;
$$;

-- ============== HELPER: Bulk evaluate flags for a company ==============
CREATE OR REPLACE FUNCTION evaluate_company_flags(
  p_company_id UUID,
  p_plan_slug TEXT DEFAULT NULL,
  p_country_code TEXT DEFAULT NULL
)
RETURNS TABLE(feature_key TEXT, is_enabled BOOLEAN, flag_type VARCHAR(30))
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    ff.key,
    is_feature_enabled(ff.key, p_company_id, p_plan_slug, p_country_code),
    ff.flag_type
  FROM feature_flags ff
  WHERE ff.deleted_at IS NULL
  ORDER BY ff.key;
$$;

-- ============== SEED: Enhanced flag types ==============
-- Update existing flags with proper types
UPDATE feature_flags SET flag_type = 'global' WHERE flag_type IS NULL;

-- Add kill-switch flags for critical systems
INSERT INTO feature_flags (key, name, description, flag_type, is_kill_switch, is_enabled) VALUES
  ('kill_payroll_processing', 'Kill: Payroll Processing', 'Emergency stop for all payroll runs', 'kill_switch', true, false),
  ('kill_ai_assistant', 'Kill: AI Assistant', 'Emergency stop for AI assistant features', 'kill_switch', true, false),
  ('kill_messaging', 'Kill: Messaging', 'Emergency stop for all messaging channels', 'kill_switch', true, false),
  ('kill_api_webhooks', 'Kill: API & Webhooks', 'Emergency stop for API access and webhooks', 'kill_switch', true, false)
ON CONFLICT (key) DO NOTHING;

-- Add beta flags
INSERT INTO feature_flags (key, name, description, flag_type, is_enabled) VALUES
  ('beta_people_analytics', 'Beta: People Analytics', 'Advanced people analytics dashboard', 'beta', false),
  ('beta_compensation_bands', 'Beta: Compensation Bands', 'Compensation band management', 'beta', false),
  ('beta_workforce_planning', 'Beta: Workforce Planning', 'AI-powered workforce planning', 'beta', false)
ON CONFLICT (key) DO NOTHING;

-- Add plan-based flags
INSERT INTO feature_flags (key, name, description, flag_type, allowed_plans, is_enabled) VALUES
  ('advanced_reporting', 'Advanced Reporting', 'Advanced report builder and exports', 'plan', ARRAY['pro', 'enterprise'], false),
  ('sso_integration', 'SSO Integration', 'SAML/OIDC single sign-on', 'plan', ARRAY['enterprise'], false),
  ('custom_branding', 'Custom Branding', 'White-label branding customization', 'plan', ARRAY['pro', 'enterprise'], false)
ON CONFLICT (key) DO NOTHING;

-- Add country-based flags
INSERT INTO feature_flags (key, name, description, flag_type, allowed_countries, is_enabled) VALUES
  ('payroll_thailand', 'Thailand Payroll', 'Thai payroll processing with social security', 'country', ARRAY['TH'], false),
  ('payroll_singapore', 'Singapore Payroll', 'Singapore payroll with CPF', 'country', ARRAY['SG'], false),
  ('statutory_filing_th', 'Thailand Statutory Filing', 'Thai government filing integration', 'country', ARRAY['TH'], false)
ON CONFLICT (key) DO NOTHING;

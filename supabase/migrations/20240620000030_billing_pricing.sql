-- RELEASE 12 — Billing + Pricing + Usage Limits
-- Plans, plan features, subscriptions, usage tracking, invoices, module entitlements.

-- ============== PLANS ==============
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    tier VARCHAR(50) NOT NULL UNIQUE,
    price_monthly NUMERIC(10,2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'THB',
    trial_days INTEGER NOT NULL DEFAULT 14,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== PLAN FEATURES ==============
CREATE TABLE IF NOT EXISTS plan_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    limit_value INTEGER NOT NULL DEFAULT 0,
    is_unlimited BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(plan_id, feature_key)
);

-- ============== SUBSCRIPTIONS ==============
-- Drop old subscriptions table if it exists (different schema from 000018)
-- Safe on clean DB; on existing DB, old table had tier/max_employees columns
-- that are replaced by the billing-aware schema below
DROP TABLE IF EXISTS subscriptions CASCADE;

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    status VARCHAR(30) DEFAULT 'trialing',
    trial_ends_at TIMESTAMPTZ,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id)
);

-- ============== USAGE RECORDS ==============
CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    feature_key VARCHAR(100) NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== INVOICES ==============
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'THB',
    status VARCHAR(30) DEFAULT 'draft',
    due_date DATE,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== MODULE ENTITLEMENTS ==============
CREATE TABLE IF NOT EXISTS module_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    module_key VARCHAR(100) NOT NULL,
    is_entitled BOOLEAN DEFAULT false,
    entitled_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, module_key)
);

-- ============== INDEXES ==============
CREATE INDEX IF NOT EXISTS idx_plans_tier ON plans(tier);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_key ON plan_features(feature_key);
CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_usage_records_company ON usage_records(company_id);
CREATE INDEX IF NOT EXISTS idx_usage_records_feature ON usage_records(feature_key);
CREATE INDEX IF NOT EXISTS idx_usage_records_period ON usage_records(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_module_entitlements_company ON module_entitlements(company_id);
CREATE INDEX IF NOT EXISTS idx_module_entitlements_key ON module_entitlements(module_key);

-- ============== RLS ==============
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_entitlements ENABLE ROW LEVEL SECURITY;

-- Plans: readable by all authenticated users (needed for plan selection UI)
CREATE POLICY "plans_read" ON plans FOR SELECT TO authenticated USING (true);
-- Plans: only service role manages plans (admin platform)
CREATE POLICY "plans_write" ON plans FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Plan features: readable by all authenticated users
CREATE POLICY "plan_features_read" ON plan_features FOR SELECT TO authenticated USING (true);
-- Plan features: only service role
CREATE POLICY "plan_features_write" ON plan_features FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Subscriptions: company-scoped
CREATE POLICY "subscriptions_read" ON subscriptions FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());
CREATE POLICY "subscriptions_insert" ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY "subscriptions_update" ON subscriptions FOR UPDATE TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

-- Usage records: company-scoped
CREATE POLICY "usage_records_read" ON usage_records FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());
CREATE POLICY "usage_records_insert" ON usage_records FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

-- Invoices: company-scoped
CREATE POLICY "invoices_read" ON invoices FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

-- Module entitlements: company-scoped
CREATE POLICY "module_entitlements_read" ON module_entitlements FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());
CREATE POLICY "module_entitlements_insert" ON module_entitlements FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY "module_entitlements_update" ON module_entitlements FOR UPDATE TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

-- ============== SEED PLANS ==============
INSERT INTO plans (name, tier, price_monthly, price_currency, trial_days) VALUES
  ('Starter',     'starter',     990.00,  'THB', 14),
  ('Growth',      'growth',     2990.00,  'THB', 14),
  ('Pro',         'pro',        5900.00,  'THB', 14),
  ('Enterprise',  'enterprise',    0.00,  'THB', 30);

-- ============== SEED PLAN FEATURES ==============
-- Starter features
INSERT INTO plan_features (plan_id, feature_key, limit_value, is_unlimited)
SELECT p.id, f.feature_key, f.limit_value, f.is_unlimited
FROM plans p, (VALUES
  ('hr_users',          2,   false),
  ('employees',         50,  false),
  ('jobs',              3,   false),
  ('candidates',        20,  false),
  ('ai_messages',       50,  false),
  ('document_signing',  0,   false),
  ('pdpa_tools',        0,   false),
  ('audit_log_days',    30,  false),
  ('bulk_import',       0,   false),
  ('custom_reports',    0,   false),
  ('api_access',        0,   false)
) AS f(feature_key, limit_value, is_unlimited)
WHERE p.tier = 'starter';

-- Growth features
INSERT INTO plan_features (plan_id, feature_key, limit_value, is_unlimited)
SELECT p.id, f.feature_key, f.limit_value, f.is_unlimited
FROM plans p, (VALUES
  ('hr_users',          5,   false),
  ('employees',         500, false),
  ('jobs',              15,  false),
  ('candidates',        200, false),
  ('ai_messages',       500, false),
  ('document_signing',  1,   true),
  ('pdpa_tools',        1,   true),
  ('audit_log_days',    90,  false),
  ('bulk_import',       0,   false),
  ('custom_reports',    0,   false),
  ('api_access',        0,   false)
) AS f(feature_key, limit_value, is_unlimited)
WHERE p.tier = 'growth';

-- Pro features
INSERT INTO plan_features (plan_id, feature_key, limit_value, is_unlimited)
SELECT p.id, f.feature_key, f.limit_value, f.is_unlimited
FROM plans p, (VALUES
  ('hr_users',          20,  false),
  ('employees',         5000, false),
  ('jobs',              0,   true),
  ('candidates',        2000, false),
  ('ai_messages',       0,   true),
  ('document_signing',  1,   true),
  ('pdpa_tools',        1,   true),
  ('audit_log_days',    365, false),
  ('bulk_import',       1,   true),
  ('custom_reports',    1,   true),
  ('api_access',        1,   true)
) AS f(feature_key, limit_value, is_unlimited)
WHERE p.tier = 'pro';

-- Enterprise features (all unlimited)
INSERT INTO plan_features (plan_id, feature_key, limit_value, is_unlimited)
SELECT p.id, f.feature_key, f.limit_value, f.is_unlimited
FROM plans p, (VALUES
  ('hr_users',          0,  true),
  ('employees',         0,  true),
  ('jobs',              0,  true),
  ('candidates',        0,  true),
  ('ai_messages',       0,  true),
  ('document_signing',  1,  true),
  ('pdpa_tools',        1,  true),
  ('audit_log_days',    0,  true),
  ('bulk_import',       1,  true),
  ('custom_reports',    1,  true),
  ('api_access',        1,  true)
) AS f(feature_key, limit_value, is_unlimited)
WHERE p.tier = 'enterprise';

-- ============== USAGE LIMIT FUNCTION ==============
CREATE OR REPLACE FUNCTION check_usage_limit(
  p_company_id UUID,
  p_feature_key VARCHAR
) RETURNS TABLE(allowed BOOLEAN, current_usage BIGINT, limit_value BIGINT, is_unlimited BOOLEAN) AS $$
DECLARE
  v_plan_limit BIGINT;
  v_is_unlimited BOOLEAN;
  v_current_usage BIGINT;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Get the company's active subscription plan feature
  SELECT pf.limit_value, pf.is_unlimited INTO v_plan_limit, v_is_unlimited
  FROM subscriptions s
  JOIN plan_features pf ON pf.plan_id = s.plan_id
  WHERE s.company_id = p_company_id
    AND pf.feature_key = p_feature_key
    AND s.status IN ('active', 'trialing')
  LIMIT 1;

  -- If no subscription or feature not found, deny
  IF v_plan_limit IS NULL THEN
    allowed := false;
    current_usage := 0;
    limit_value := 0;
    is_unlimited := false;
    RETURN NEXT;
    RETURN;
  END IF;

  -- If unlimited, allow
  IF v_is_unlimited THEN
    allowed := true;
    current_usage := 0;
    limit_value := 0;
    is_unlimited := true;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Calculate current billing period
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;

  -- Get current usage
  SELECT COALESCE(SUM(usage_count), 0) INTO v_current_usage
  FROM usage_records
  WHERE company_id = p_company_id
    AND feature_key = p_feature_key
    AND period_start = v_period_start
    AND period_end = v_period_end;

  allowed := v_current_usage < v_plan_limit;
  current_usage := v_current_usage;
  limit_value := v_plan_limit;
  is_unlimited := false;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============== MODULE ENTITLEMENT CHECK FUNCTION ==============
CREATE OR REPLACE FUNCTION check_module_entitlement(
  p_company_id UUID,
  p_module_key VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  v_entitled BOOLEAN;
BEGIN
  SELECT me.is_entitled INTO v_entitled
  FROM module_entitlements me
  WHERE me.company_id = p_company_id
    AND me.module_key = p_module_key
    AND me.is_entitled = true
    AND (me.expires_at IS NULL OR me.expires_at > NOW());

  RETURN COALESCE(v_entitled, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============== TRIGGER: auto-update updated_at ==============
CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();
CREATE TRIGGER trg_module_entitlements_updated_at BEFORE UPDATE ON module_entitlements
  FOR EACH ROW EXECUTE FUNCTION update_billing_updated_at();

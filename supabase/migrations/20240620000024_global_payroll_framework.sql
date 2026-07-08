-- ============================================================
-- Release 9B: Global Payroll Framework + Country Pack Builder
-- Country packs, rule versioning, tax profiles, FX snapshots
-- ============================================================

-- 1. Country Packs
CREATE TABLE IF NOT EXISTS payroll_country_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  country_code VARCHAR(3) NOT NULL,
  pack_name VARCHAR(255) NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, country_code)
);

ALTER TABLE payroll_country_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY pcp_read ON payroll_country_packs FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY pcp_insert ON payroll_country_packs FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY pcp_update ON payroll_country_packs FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_pcp_company ON payroll_country_packs(company_id);
CREATE INDEX IF NOT EXISTS idx_pcp_country ON payroll_country_packs(country_code);

CREATE TRIGGER update_pcp_updated_at BEFORE UPDATE ON payroll_country_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Rule Sets (each country pack contains multiple rule sets)
CREATE TABLE IF NOT EXISTS payroll_rule_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_pack_id UUID NOT NULL REFERENCES payroll_country_packs(id) ON DELETE CASCADE,
  rule_key VARCHAR(100) NOT NULL,
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_pack_id, rule_key)
);

ALTER TABLE payroll_rule_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY prs_read ON payroll_rule_sets FOR SELECT
  USING (country_pack_id IN (SELECT id FROM payroll_country_packs WHERE company_id = safe_user_company_id()));
CREATE POLICY prs_insert ON payroll_rule_sets FOR INSERT
  WITH CHECK (country_pack_id IN (SELECT id FROM payroll_country_packs WHERE company_id = safe_user_company_id()));

CREATE INDEX IF NOT EXISTS idx_prs_pack ON payroll_rule_sets(country_pack_id);

-- 3. Rule Versions (effective dating for rule configs)
CREATE TABLE IF NOT EXISTS payroll_rule_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_set_id UUID NOT NULL REFERENCES payroll_rule_sets(id) ON DELETE CASCADE,
  version_number VARCHAR(20) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  rule_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rule_set_id, version_number)
);

ALTER TABLE payroll_rule_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY prv_read ON payroll_rule_versions FOR SELECT
  USING (rule_set_id IN (
    SELECT prs.id FROM payroll_rule_sets prs
    JOIN payroll_country_packs pcp ON pcp.id = prs.country_pack_id
    WHERE pcp.company_id = safe_user_company_id()
  ));
CREATE POLICY prv_insert ON payroll_rule_versions FOR INSERT
  WITH CHECK (rule_set_id IN (
    SELECT prs.id FROM payroll_rule_sets prs
    JOIN payroll_country_packs pcp ON pcp.id = prs.country_pack_id
    WHERE pcp.company_id = safe_user_company_id()
  ));

CREATE INDEX IF NOT EXISTS idx_prv_rule_set ON payroll_rule_versions(rule_set_id);
CREATE INDEX IF NOT EXISTS idx_prv_effective ON payroll_rule_versions(effective_from, effective_to);

-- 4. Employee Tax Profiles
CREATE TABLE IF NOT EXISTS employee_tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  country_code VARCHAR(3) NOT NULL,
  tax_id VARCHAR(100),
  filing_status VARCHAR(50),
  deductions_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id)
);

ALTER TABLE employee_tax_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY etp_read ON employee_tax_profiles FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY etp_insert ON employee_tax_profiles FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY etp_update ON employee_tax_profiles FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_etp_company ON employee_tax_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_etp_employee ON employee_tax_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_etp_country ON employee_tax_profiles(country_code);

CREATE TRIGGER update_etp_updated_at BEFORE UPDATE ON employee_tax_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Exchange Rate Snapshots
CREATE TABLE IF NOT EXISTS exchange_rate_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_currency VARCHAR(3) NOT NULL,
  target_currency VARCHAR(3) NOT NULL,
  rate NUMERIC(18,8) NOT NULL,
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE exchange_rate_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY ers_read ON exchange_rate_snapshots FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ers_insert ON exchange_rate_snapshots FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ers_company ON exchange_rate_snapshots(company_id);
CREATE INDEX IF NOT EXISTS idx_ers_pair_date ON exchange_rate_snapshots(source_currency, target_currency, snapshot_date);

-- 6. RBAC Permissions for payroll country packs
INSERT INTO permissions (resource, action, description) VALUES
  ('payroll_country_pack', 'read', 'View country packs and rule sets'),
  ('payroll_country_pack', 'write', 'Create and edit country packs'),
  ('payroll_country_pack', 'activate', 'Activate or deactivate country packs'),
  ('payroll_tax_profile', 'read', 'View employee tax profiles'),
  ('payroll_tax_profile', 'write', 'Create and edit employee tax profiles'),
  ('payroll_fx', 'read', 'View exchange rate snapshots'),
  ('payroll_fx', 'write', 'Create exchange rate snapshots')
ON CONFLICT (resource, action) DO NOTHING;

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'payroll_country_pack' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'payroll_country_pack' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'payroll_country_pack' AND p.action = 'activate'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'payroll_tax_profile' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'payroll_tax_profile' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'payroll_fx' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'payroll_fx' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'payroll_country_pack' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'payroll_country_pack' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'payroll_country_pack' AND p.action = 'activate'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'payroll_tax_profile' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'payroll_tax_profile' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'payroll_fx' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'payroll_fx' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'payroll_country_pack' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'payroll_tax_profile' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'payroll_tax_profile' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'payroll_fx' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'payroll_country_pack' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'payroll_tax_profile' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'payroll_country_pack' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 7. Seed country packs per company
DO $$
DECLARE
  comp RECORD;
BEGIN
  FOR comp IN SELECT id FROM companies
  LOOP
    INSERT INTO payroll_country_packs (id, company_id, country_code, pack_name, version, is_active) VALUES
      (gen_random_uuid(), comp.id, 'TH', 'Thailand Payroll Pack', '1.0.0', true),
      (gen_random_uuid(), comp.id, 'SG', 'Singapore Payroll Pack', '1.0.0', false),
      (gen_random_uuid(), comp.id, 'VN', 'Vietnam Payroll Pack', '1.0.0', false),
      (gen_random_uuid(), comp.id, 'ID', 'Indonesia Payroll Pack', '1.0.0', false),
      (gen_random_uuid(), comp.id, 'MY', 'Malaysia Payroll Pack', '1.0.0', false),
      (gen_random_uuid(), comp.id, 'PH', 'Philippines Payroll Pack', '1.0.0', false),
      (gen_random_uuid(), comp.id, 'JP', 'Japan Payroll Pack', '1.0.0', false)
    ON CONFLICT (company_id, country_code) DO NOTHING;

    INSERT INTO payroll_rule_sets (id, country_pack_id, rule_key, rule_name, description)
    SELECT gen_random_uuid(), pcp.id, rs.rule_key, rs.rule_name, rs.description
    FROM payroll_country_packs pcp
    CROSS JOIN (VALUES
      ('social_security', 'Social Security (SSO)', 'Thai social security contribution rates'),
      ('provident_fund', 'Provident Fund', 'Provident fund contribution rules'),
      ('personal_income_tax', 'Personal Income Tax (PIT)', 'Thai progressive income tax brackets'),
      ('welfare_benefits', 'Welfare Benefits', 'Taxable and exempt welfare benefits')
    ) AS rs(rule_key, rule_name, description)
    WHERE pcp.country_code = 'TH' AND pcp.company_id = comp.id
    ON CONFLICT (country_pack_id, rule_key) DO NOTHING;

    INSERT INTO payroll_rule_versions (id, rule_set_id, version_number, effective_from, effective_to, rule_config, is_active)
    SELECT gen_random_uuid(), prs.id, rv.version_number, rv.effective_from, rv.effective_to, rv.rule_config, rv.is_active
    FROM payroll_rule_sets prs
    JOIN payroll_country_packs pcp ON pcp.id = prs.country_pack_id
    CROSS JOIN (VALUES
      ('social_security', '1.0.0', '2024-01-01'::date, NULL::date, '{"employee_rate": 0.05, "employer_rate": 0.05, "max_monthly_salary": 75000, "min_monthly_salary": 1650, "contribution_type": "percentage"}'::jsonb, true),
      ('provident_fund', '1.0.0', '2024-01-01'::date, NULL::date, '{"employee_rate": 0.03, "employer_rate": 0.03, "min_months_for_vesting": 60, "vesting_rate": "graduated"}'::jsonb, true),
      ('personal_income_tax', '1.0.0', '2024-01-01'::date, NULL::date, '{"brackets": [{"min": 0, "max": 150000, "rate": 0}, {"min": 150001, "max": 180000, "rate": 0.05}, {"min": 180001, "max": 700000, "rate": 0.10}, {"min": 700001, "max": 2000000, "rate": 0.15}, {"min": 2000001, "max": 5000000, "rate": 0.20}, {"min": 5000001, "max": 10000000, "rate": 0.25}, {"min": 10000001, "max": 999999999999, "rate": 0.35}], "personal_allowance": 60000, "spouse_allowance": 60000, "child_allowance": 30000}'::jsonb, true),
      ('welfare_benefits', '1.0.0', '2024-01-01'::date, NULL::date, '{"exempt_items": ["life_insurance", "medical_expense", "meal_allowance_up_to", "fuel_allowance"], "taxable_items": ["bonus", "overtime", "commissions"], "meal_allowance_exempt_cap": 1600}'::jsonb, true)
    ) AS rv(rule_key, version_number, effective_from, effective_to, rule_config, is_active)
    WHERE prs.rule_key = rv.rule_key AND pcp.country_code = 'TH' AND pcp.company_id = comp.id
    ON CONFLICT (rule_set_id, version_number) DO NOTHING;
  END LOOP;
END $$;

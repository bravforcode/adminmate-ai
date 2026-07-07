-- ============================================================
-- Release 33B.8: Payroll Professional Validation
-- Royal Decree-aligned tax brackets, social security calculator,
-- config completeness validator, and readiness audit
-- ============================================================

-- 1. payroll_configs table (referenced by frontend service)
CREATE TABLE IF NOT EXISTS payroll_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  country_code VARCHAR(3) NOT NULL DEFAULT 'TH',
  pay_period VARCHAR(20) DEFAULT 'monthly',
  pay_day INTEGER DEFAULT 25,
  province VARCHAR(10) DEFAULT 'BKK',
  cycle_type VARCHAR(20) DEFAULT 'monthly',
  tax_year INTEGER DEFAULT EXTRACT(YEAR FROM NOW())::INTEGER,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_pay_period CHECK (pay_period IN ('monthly', 'biweekly', 'weekly')),
  CONSTRAINT valid_pay_day CHECK (pay_day >= 1 AND pay_day <= 31),
  CONSTRAINT valid_cycle_type CHECK (cycle_type IN ('monthly', 'biweekly', 'weekly')),
  CONSTRAINT valid_country_code CHECK (country_code IN ('TH', 'SG', 'VN', 'ID', 'MY', 'PH', 'JP')),
  UNIQUE(company_id, country_code)
);

ALTER TABLE payroll_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY pconf_read ON payroll_configs FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY pconf_insert ON payroll_configs FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY pconf_update ON payroll_configs FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_pconf_company ON payroll_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_pconf_country ON payroll_configs(company_id, country_code);

CREATE TRIGGER update_pconf_updated_at BEFORE UPDATE ON payroll_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED: Royal Decree 2024 — Official Thai Tax Brackets (8 brackets)
-- Source: Revenue Department of Thailand (พระราชกฤษฎีกา)
-- Reference: พระราชกฤษฎีกา ออกตามความในประมวลรัษฎากร ว่าด้วยการกำหนด
--           อัตราภาษีเงินได้ (ฉบับที่ 782) พ.ศ. 2567
-- ============================================================

-- Delete placeholder rows from migration 000023, insert proper 8-bracket structure
DELETE FROM th_tax_brackets WHERE year = 2024;

INSERT INTO th_tax_brackets (year, min_income, max_income, tax_rate) VALUES
  (2024, 0,            150000,     0.00),
  (2024, 150001,       1800000,    5.00),
  (2024, 1800001,      3600000,   10.00),
  (2024, 3600001,      5400000,   15.00),
  (2024, 5400001,      7200000,   20.00),
  (2024, 7200001,      9600000,   25.00),
  (2024, 9600001,      12000000,  30.00),
  (2024, 12000001,     NULL,      35.00);

-- Seed same brackets for current year if different
INSERT INTO th_tax_brackets (year, min_income, max_income, tax_rate)
SELECT EXTRACT(YEAR FROM NOW())::INTEGER, min_income, max_income, tax_rate
FROM th_tax_brackets
WHERE year = 2024
  AND EXTRACT(YEAR FROM NOW())::INTEGER != 2024
ON CONFLICT (year, min_income) DO NOTHING;

-- Seed SS rules for current year if different
INSERT INTO th_social_security_rules (year, min_salary, max_salary, employee_rate, employer_rate)
SELECT EXTRACT(YEAR FROM NOW())::INTEGER, min_salary, max_salary, employee_rate, employer_rate
FROM th_social_security_rules
WHERE year = 2024
  AND EXTRACT(YEAR FROM NOW())::INTEGER != 2024
ON CONFLICT (year, min_salary) DO NOTHING;

-- ============================================================
-- Function 1: validate_thailand_payroll_config(company_id)
-- Returns JSONB report of configuration completeness
-- ============================================================

CREATE OR REPLACE FUNCTION validate_thailand_payroll_config(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config RECORD;
  v_result JSONB := '{}'::jsonb;
  v_issues TEXT[] := '{}';
  v_score INTEGER := 0;
  v_total INTEGER := 8;
  v_has_country_pack BOOLEAN;
  v_has_ss_rules BOOLEAN;
  v_has_tax_brackets BOOLEAN;
  v_has_rule_versions BOOLEAN;
BEGIN
  -- Check payroll_configs row
  SELECT * INTO v_config
  FROM payroll_configs
  WHERE company_id = p_company_id AND country_code = 'TH';

  IF v_config IS NULL THEN
    v_issues := array_append(v_issues, 'No Thailand payroll configuration found');
    v_result := jsonb_build_object(
      'is_valid', false,
      'score', 0,
      'max_score', v_total,
      'issues', to_jsonb(v_issues),
      'details', '{}'::jsonb
    );
    RETURN v_result;
  END IF;

  -- Check pay_period
  IF v_config.pay_period IS NOT NULL AND v_config.pay_period != '' THEN
    v_score := v_score + 1;
  ELSE
    v_issues := array_append(v_issues, 'pay_period is not configured');
  END IF;

  -- Check pay_day
  IF v_config.pay_day IS NOT NULL AND v_config.pay_day BETWEEN 1 AND 31 THEN
    v_score := v_score + 1;
  ELSE
    v_issues := array_append(v_issues, 'pay_day is not configured or out of range');
  END IF;

  -- Check province
  IF v_config.province IS NOT NULL AND v_config.province != '' THEN
    v_score := v_score + 1;
  ELSE
    v_issues := array_append(v_issues, 'province is not configured');
  END IF;

  -- Check cycle_type
  IF v_config.cycle_type IS NOT NULL AND v_config.cycle_type != '' THEN
    v_score := v_score + 1;
  ELSE
    v_issues := array_append(v_issues, 'cycle_type is not configured');
  END IF;

  -- Check country pack exists and is active
  SELECT EXISTS(
    SELECT 1 FROM payroll_country_packs
    WHERE company_id = p_company_id AND country_code = 'TH' AND is_active = true
  ) INTO v_has_country_pack;

  IF v_has_country_pack THEN
    v_score := v_score + 1;
  ELSE
    v_issues := array_append(v_issues, 'Thailand country pack is not active');
  END IF;

  -- Check SS rules exist for current year
  SELECT EXISTS(
    SELECT 1 FROM th_social_security_rules
    WHERE year = EXTRACT(YEAR FROM NOW())::INTEGER
  ) INTO v_has_ss_rules;

  IF v_has_ss_rules THEN
    v_score := v_score + 1;
  ELSE
    v_issues := array_append(v_issues, 'Social security rules not seeded for current year');
  END IF;

  -- Check tax brackets exist for current year (must have 8 for Royal Decree compliance)
  SELECT EXISTS(
    SELECT 1 FROM th_tax_brackets
    WHERE year = COALESCE(v_config.tax_year, EXTRACT(YEAR FROM NOW())::INTEGER)
    HAVING count(*) = 8
  ) INTO v_has_tax_brackets;

  IF v_has_tax_brackets THEN
    v_score := v_score + 1;
  ELSE
    v_issues := array_append(v_issues, 'Tax brackets incomplete — Royal Decree requires 8 brackets');
  END IF;

  -- Check rule versions exist
  SELECT EXISTS(
    SELECT 1 FROM payroll_rule_versions prv
    JOIN payroll_rule_sets prs ON prs.id = prv.rule_set_id
    JOIN payroll_country_packs pcp ON pcp.id = prs.country_pack_id
    WHERE pcp.company_id = p_company_id AND pcp.country_code = 'TH' AND prv.is_active = true
  ) INTO v_has_rule_versions;

  IF v_has_rule_versions THEN
    v_score := v_score + 1;
  ELSE
    v_issues := array_append(v_issues, 'No active rule versions found for Thailand');
  END IF;

  v_result := jsonb_build_object(
    'is_valid', (v_score = v_total),
    'score', v_score,
    'max_score', v_total,
    'issues', to_jsonb(v_issues),
    'details', jsonb_build_object(
      'pay_period', v_config.pay_period,
      'pay_day', v_config.pay_day,
      'province', v_config.province,
      'cycle_type', v_config.cycle_type,
      'tax_year', v_config.tax_year,
      'country_pack_active', v_has_country_pack,
      'ss_rules_present', v_has_ss_rules,
      'tax_brackets_complete', v_has_tax_brackets,
      'rule_versions_active', v_has_rule_versions
    )
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- Function 2: get_thailand_tax_brackets(p_year INTEGER DEFAULT 2024)
-- Returns tax bracket data per Royal Decree (8 brackets)
-- ============================================================

CREATE OR REPLACE FUNCTION get_thailand_tax_brackets(p_year INTEGER DEFAULT 2024)
RETURNS TABLE (
  bracket_number INTEGER,
  min_income NUMERIC(15,2),
  max_income NUMERIC(15,2),
  tax_rate NUMERIC(5,2),
  marginal_amount NUMERIC(15,2),
  reference TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY tb.min_income)::INTEGER AS bracket_number,
    tb.min_income,
    COALESCE(tb.max_income, 999999999.99),
    tb.tax_rate,
    CASE
      WHEN tb.max_income IS NULL THEN 999999999.99
      ELSE tb.max_income - tb.min_income
    END AS marginal_amount,
    'Royal Decree 782 (พ.ร.ฎ.782) B.E. 2567'::TEXT AS reference
  FROM th_tax_brackets tb
  WHERE tb.year = p_year
  ORDER BY tb.min_income;
END;
$$;

-- ============================================================
-- Function 3: calculate_thailand_social_security(gross_salary)
-- Calculates employee & employer SS contributions per SSO rules
-- Floor 1,650 THB, Cap 15,000 THB/month, Employee 5%, Employer 5%
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_thailand_social_security(
  p_gross_salary NUMERIC(15,2),
  p_year INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_rules RECORD;
  v_assessable NUMERIC(15,2);
  v_employee NUMERIC(15,2);
  v_employer NUMERIC(15,2);
  v_total NUMERIC(15,2);
BEGIN
  v_year := COALESCE(p_year, EXTRACT(YEAR FROM NOW())::INTEGER);

  SELECT * INTO v_rules
  FROM th_social_security_rules
  WHERE year = v_year
  LIMIT 1;

  IF v_rules IS NULL THEN
    RETURN jsonb_build_object(
      'error', 'No social security rules found for year ' || v_year,
      'employee', 0,
      'employer', 0,
      'total', 0,
      'assessable_salary', 0
    );
  END IF;

  -- Clamp salary to floor/cap
  v_assessable := GREATEST(LEAST(p_gross_salary, v_rules.max_salary), v_rules.min_salary);

  -- Calculate contributions (rounded to nearest 1 THB per SSO rules)
  v_employee := ROUND(v_assessable * (v_rules.employee_rate / 100));
  v_employer := ROUND(v_assessable * (v_rules.employer_rate / 100));
  v_total := v_employee + v_employer;

  RETURN jsonb_build_object(
    'gross_salary', p_gross_salary,
    'assessable_salary', v_assessable,
    'employee', v_employee,
    'employer', v_employer,
    'total', v_total,
    'employee_rate', v_rules.employee_rate,
    'employer_rate', v_rules.employer_rate,
    'min_salary', v_rules.min_salary,
    'max_salary', v_rules.max_salary,
    'year', v_year
  );
END;
$$;

-- ============================================================
-- Function 4: audit_payroll_readiness(company_id)
-- Returns comprehensive payroll readiness assessment
-- ============================================================

CREATE OR REPLACE FUNCTION audit_payroll_readiness(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_config_valid JSONB;
  v_tax_count BIGINT;
  v_ss_count BIGINT;
  v_country_packs JSONB;
  v_employee_count BIGINT;
  v_salary_count BIGINT;
  v_readiness VARCHAR(20);
  v_warnings TEXT[] := '{}';
  v_blockers TEXT[] := '{}';
BEGIN
  -- 1. Validate config completeness
  v_config_valid := validate_thailand_payroll_config(p_company_id);

  -- 2. Count tax brackets for 2024
  SELECT count(*) INTO v_tax_count FROM th_tax_brackets WHERE year = 2024;

  IF v_tax_count < 8 THEN
    v_blockers := array_append(v_blockers, format('Tax brackets incomplete: %s/8 (Royal Decree requires 8)', v_tax_count));
  END IF;

  -- 3. Count SS rules
  SELECT count(*) INTO v_ss_count FROM th_social_security_rules WHERE year = 2024;

  IF v_ss_count = 0 THEN
    v_blockers := array_append(v_blockers, 'No social security rules for 2024');
  END IF;

  -- 4. Country pack status
  SELECT jsonb_agg(jsonb_build_object(
    'country_code', country_code,
    'is_active', is_active,
    'version', version
  )) INTO v_country_packs
  FROM payroll_country_packs
  WHERE company_id = p_company_id;

  -- 5. Employee coverage
  SELECT count(*) INTO v_employee_count
  FROM employees WHERE company_id = p_company_id;

  SELECT count(*) INTO v_salary_count
  FROM salary_structures ss
  WHERE ss.company_id = p_company_id
    AND ss.effective_to IS NULL;

  IF v_salary_count < v_employee_count THEN
    v_warnings := array_append(v_warnings, format(
      'Only %s/%s employees have active salary structures',
      v_salary_count, v_employee_count
    ));
  END IF;

  -- 6. Determine overall readiness
  IF (v_config_valid ->> 'is_valid')::BOOLEAN = false THEN
    v_readiness := 'NOT_READY';
  ELSIF array_length(v_blockers, 1) > 0 THEN
    v_readiness := 'BLOCKED';
  ELSIF array_length(v_warnings, 1) > 0 THEN
    v_readiness := 'PARTIAL';
  ELSE
    v_readiness := 'READY';
  END IF;

  v_result := jsonb_build_object(
    'readiness', v_readiness,
    'company_id', p_company_id,
    'config_validation', v_config_valid,
    'tax_brackets_count', v_tax_count,
    'ss_rules_count', v_ss_count,
    'country_packs', COALESCE(v_country_packs, '[]'::jsonb),
    'employee_count', v_employee_count,
    'active_salary_structures', v_salary_count,
    'warnings', to_jsonb(v_warnings),
    'blockers', to_jsonb(v_blockers),
    'audited_at', NOW()
  );

  RETURN v_result;
END;
$$;

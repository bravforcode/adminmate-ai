-- ============================================================
-- 33B.8: Payroll Professional Validation Tests (pgTAP)
-- Tests: validate_thailand_payroll_config, get_thailand_tax_brackets,
--        calculate_thailand_social_security, audit_payroll_readiness
-- ============================================================

SELECT plan(15);

-- ============================================================
-- Test Setup: Ensure seed data exists
-- ============================================================

DO $$
DECLARE
  v_company_id UUID := '11111111-1111-1111-1111-111111111111';
  v_emp_id UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  v_current_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
BEGIN
  -- Ensure test company exists
  INSERT INTO companies (id, name, industry, country, currency, timezone, locale)
  VALUES (v_company_id, 'Payroll Test Co', 'Technology', 'TH', 'THB', 'Asia/Bangkok', 'th')
  ON CONFLICT (id) DO NOTHING;

  -- Seed tax brackets for 2024 (delete old placeholders first)
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

  -- Seed tax brackets for current year (same structure)
  IF v_current_year != 2024 THEN
    INSERT INTO th_tax_brackets (year, min_income, max_income, tax_rate)
    SELECT v_current_year, min_income, max_income, tax_rate FROM th_tax_brackets WHERE year = 2024
    ON CONFLICT (year, min_income) DO NOTHING;
  END IF;

  -- Seed SS rules for 2024
  INSERT INTO th_social_security_rules (year, min_salary, max_salary, employee_rate, employer_rate)
  VALUES (2024, 1650, 15000, 5.00, 5.00)
  ON CONFLICT DO NOTHING;

  -- Seed SS rules for current year
  IF v_current_year != 2024 THEN
    INSERT INTO th_social_security_rules (year, min_salary, max_salary, employee_rate, employer_rate)
    VALUES (v_current_year, 1650, 15000, 5.00, 5.00)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Seed payroll config
  INSERT INTO payroll_configs (company_id, country_code, pay_period, pay_day, province, cycle_type, tax_year, is_active)
  VALUES (v_company_id, 'TH', 'monthly', 25, 'BKK', 'monthly', 2024, true)
  ON CONFLICT (company_id, country_code) DO UPDATE
  SET pay_period = EXCLUDED.pay_period,
      pay_day = EXCLUDED.pay_day,
      province = EXCLUDED.province,
      cycle_type = EXCLUDED.cycle_type,
      tax_year = EXCLUDED.tax_year,
      is_active = EXCLUDED.is_active;

  -- Seed employee with correct column names
  INSERT INTO employees (id, company_id, employee_number, job_title, hire_date, start_date, employment_status, work_email)
  VALUES (v_emp_id, v_company_id, 'EMP-TEST-001', 'Test Employee', '2024-01-01', '2024-01-01', 'active', 'somchai@test.com')
  ON CONFLICT (id) DO NOTHING;

  -- Seed salary structure
  INSERT INTO salary_structures (company_id, employee_id, base_salary, effective_from, effective_to)
  VALUES (v_company_id, v_emp_id, 50000, '2024-01-01', NULL)
  ON CONFLICT DO NOTHING;

  -- Seed TH country pack as active
  INSERT INTO payroll_country_packs (company_id, country_code, pack_name, version, is_active)
  VALUES (v_company_id, 'TH', 'Thailand Payroll Pack', '1.0.0', true)
  ON CONFLICT (company_id, country_code) DO UPDATE SET is_active = true;

  -- Seed rule sets for TH pack
  IF NOT EXISTS (
    SELECT 1 FROM payroll_rule_sets prs
    JOIN payroll_country_packs pcp ON pcp.id = prs.country_pack_id
    WHERE pcp.company_id = v_company_id AND prs.rule_key = 'social_security'
  ) THEN
    INSERT INTO payroll_rule_sets (country_pack_id, rule_key, rule_name, description)
    SELECT pcp.id, 'social_security', 'Social Security', 'SS contribution rules'
    FROM payroll_country_packs pcp
    WHERE pcp.company_id = v_company_id AND pcp.country_code = 'TH';
  END IF;

  -- Seed rule versions
  IF NOT EXISTS (
    SELECT 1 FROM payroll_rule_versions prv
    JOIN payroll_rule_sets prs ON prs.id = prv.rule_set_id
    JOIN payroll_country_packs pcp ON pcp.id = prs.country_pack_id
    WHERE pcp.company_id = v_company_id AND prv.is_active = true
  ) THEN
    INSERT INTO payroll_rule_versions (rule_set_id, version_number, effective_from, rule_config, is_active)
    SELECT prs.id, '1.0.0', '2024-01-01'::DATE, '{"employee_rate": 0.05}'::JSONB, true
    FROM payroll_rule_sets prs
    JOIN payroll_country_packs pcp ON pcp.id = prs.country_pack_id
    WHERE pcp.company_id = v_company_id AND prs.rule_key = 'social_security';
  END IF;
END $$;

-- ============================================================
-- Tests 1-4: validate_thailand_payroll_config()
-- ============================================================

-- Test 1: Function is callable and returns JSONB
SELECT lives_ok(
  $$SELECT validate_thailand_payroll_config('11111111-1111-1111-1111-111111111111')$$,
  'validate_thailand_payroll_config is callable'
);

-- Test 2: Returns valid JSONB with expected keys
SELECT ok(
  (SELECT validate_thailand_payroll_config('11111111-1111-1111-1111-111111111111') ? 'is_valid'),
  'validate_thailand_payroll_config returns is_valid key'
);

-- Test 3: Returns valid score for configured company
SELECT ok(
  (SELECT (validate_thailand_payroll_config('11111111-1111-1111-1111-111111111111') ->> 'score')::INTEGER > 0),
  'validate_thailand_payroll_config returns score > 0 for configured company'
);

-- Test 4: Returns not valid for non-existent company
SELECT is(
  (SELECT (validate_thailand_payroll_config('99999999-9999-9999-9999-999999999999') ->> 'is_valid')::BOOLEAN),
  false,
  'validate_thailand_payroll_config returns false for non-existent company'
);

-- ============================================================
-- Tests 5-8: get_thailand_tax_brackets()
-- ============================================================

-- Test 5: Returns exactly 8 brackets for 2024
SELECT is(
  (SELECT count(*) FROM get_thailand_tax_brackets(2024)),
  8::BIGINT,
  'get_thailand_tax_brackets returns 8 brackets for 2024'
);

-- Test 6: First bracket is 0% (exempt threshold)
SELECT is(
  (SELECT tax_rate FROM get_thailand_tax_brackets(2024) WHERE bracket_number = 1),
  0.00,
  'First bracket is 0% (exempt threshold per Royal Decree)'
);

-- Test 7: Last bracket is 35% (highest rate)
SELECT is(
  (SELECT tax_rate FROM get_thailand_tax_brackets(2024) WHERE bracket_number = 8),
  35.00,
  'Last bracket is 35% (highest rate per Royal Decree)'
);

-- Test 8: All brackets ordered correctly (monotonically increasing rates)
SELECT ok(
  (
    SELECT bool_and(next_rate >= prev_rate)
    FROM (
      SELECT tax_rate AS prev_rate,
             LEAD(tax_rate) OVER (ORDER BY bracket_number) AS next_rate
      FROM get_thailand_tax_brackets(2024)
    ) sub
    WHERE next_rate IS NOT NULL
  ),
  'Tax bracket rates are monotonically non-decreasing'
);

-- ============================================================
-- Tests 9-12: calculate_thailand_social_security()
-- ============================================================

-- Test 9: Normal salary within range — 30K > cap (15K), so assessable = 15,000, SS = 750 each
SELECT is(
  (SELECT (calculate_thailand_social_security(30000::numeric, 2024) ->> 'employee')::NUMERIC),
  750.00,
  'SS on 30,000 THB salary (above cap): assessable=15000, employee SS = 750'
);

SELECT is(
  (SELECT (calculate_thailand_social_security(30000::numeric, 2024) ->> 'employer')::NUMERIC),
  750.00,
  'SS on 30,000 THB salary (above cap): assessable=15000, employer SS = 750'
);

-- Test 10: Below-floor salary clamps to floor (1,000 THB → assessable 1,650 → SS 83 each)
SELECT is(
  (SELECT (calculate_thailand_social_security(1000::numeric, 2024) ->> 'employee')::NUMERIC),
  83.00,
  'SS on 1,000 THB (below floor): clamped to floor 1,650 → employee SS = 83'
);

-- Test 11: Above-cap salary clamps to cap (100,000 THB → assessable 15,000 → SS 750 each)
SELECT is(
  (SELECT (calculate_thailand_social_security(100000::numeric, 2024) ->> 'employer')::NUMERIC),
  750.00,
  'SS on 100,000 THB (above cap): clamped to cap 15,000 → employer SS = 750'
);

-- ============================================================
-- Tests 12-14: audit_payroll_readiness()
-- ============================================================

-- Test 12: Returns readiness status
SELECT lives_ok(
  $$SELECT audit_payroll_readiness('11111111-1111-1111-1111-111111111111')$$,
  'audit_payroll_readiness is callable'
);

-- Test 13: Returns valid readiness level
SELECT ok(
  (SELECT audit_payroll_readiness('11111111-1111-1111-1111-111111111111') ? 'readiness'),
  'audit_payroll_readiness returns readiness key'
);

-- Test 14: Company with full config returns READY or PARTIAL (not NOT_READY or BLOCKED)
SELECT ok(
  (SELECT (audit_payroll_readiness('11111111-1111-1111-1111-111111111111') ->> 'readiness') IN ('READY', 'PARTIAL')),
  'Fully configured company returns READY or PARTIAL (not BLOCKED or NOT_READY)'
);

-- ============================================================
-- Finish
-- ============================================================

SELECT * FROM finish();

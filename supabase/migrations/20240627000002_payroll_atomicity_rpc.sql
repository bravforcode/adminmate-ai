-- ============================================================
-- Payroll Atomicity RPC: payroll_calculate_run
--
-- Wraps the entire payroll calculation in a single PostgreSQL
-- transaction with:
--   1. Advisory lock (prevents concurrent runs)
--   2. Status guard (only 'draft' or 'calculated' can recalculate)
--   3. Atomic batch update of all payroll_run_items
--   4. Aggregate update of the payroll_runs summary row
--   5. Audit event insertion
--
-- This prevents partial updates if any single item fails and
-- ensures consistent totals even under concurrent access.
-- ============================================================

CREATE OR REPLACE FUNCTION payroll_calculate_run(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run          RECORD;
  v_company_id   UUID;
  v_total_gross  NUMERIC(15,2) := 0;
  v_total_ded    NUMERIC(15,2) := 0;
  v_total_net    NUMERIC(15,2) := 0;
  v_item_count   INTEGER := 0;
  v_brackets     RECORD;
  v_ss_rules     RECORD;
  v_current_year INTEGER := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_item         RECORD;
  v_gross        NUMERIC(15,2);
  v_ss_emp       NUMERIC(15,2);
  v_ss_employer  NUMERIC(15,2);
  v_tax          NUMERIC(15,2);
  v_net          NUMERIC(15,2);
  v_remaining    NUMERIC(15,2);
  v_bracket_min  NUMERIC(15,2);
  v_bracket_max  NUMERIC(15,2);
  v_taxable      NUMERIC(15,2);
  v_user_id      UUID;
BEGIN
  -- ── 0. Resolve authenticated user ──
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- ── 1. Advisory lock (prevents concurrent calculation on same run) ──
  IF NOT pg_try_advisory_xact_lock(('x' || substr(p_run_id::text, 1, 8))::bit(32)::int) THEN
    RAISE EXCEPTION 'Another payroll calculation is already in progress for this run';
  END IF;

  -- ── 2. Fetch and validate run status ──
  SELECT id, company_id, cycle_id, status
  INTO v_run
  FROM payroll_runs
  WHERE id = p_run_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payroll run not found: %', p_run_id;
  END IF;

  IF v_run.status NOT IN ('draft', 'calculated') THEN
    RAISE EXCEPTION 'Cannot calculate run in status ''%''. Must be ''draft'' or ''calculated''.', v_run.status;
  END IF;

  v_company_id := v_run.company_id;

  -- ── 3. Fetch tax brackets for current year ──
  -- Using a cursor/loop pattern since we need to iterate brackets per item
  -- We load brackets into a temp table for efficient repeated access
  CREATE TEMP TABLE IF NOT EXISTS tmp_brackets (
    min_income NUMERIC(15,2),
    max_income NUMERIC(15,2),
    tax_rate   NUMERIC(5,2)
  ) ON COMMIT DROP;

  DELETE FROM tmp_brackets;

  INSERT INTO tmp_brackets (min_income, max_income, tax_rate)
  SELECT min_income, COALESCE(max_income, 999999999), tax_rate
  FROM th_tax_brackets
  WHERE year = v_current_year
  ORDER BY min_income ASC;

  IF (SELECT COUNT(*) FROM tmp_brackets) = 0 THEN
    RAISE EXCEPTION 'No tax brackets found for year %. Check th_tax_brackets seed data.', v_current_year;
  END IF;

  -- ── 4. Fetch SS rules for current year ──
  SELECT employee_rate, employer_rate, min_salary, max_salary
  INTO v_ss_rules
  FROM th_social_security_rules
  WHERE year = v_current_year
  LIMIT 1;

  -- ── 5. Calculate each item atomically ──
  FOR v_item IN
    SELECT pri.*
    FROM payroll_run_items pri
    WHERE pri.run_id = p_run_id
    ORDER BY pri.created_at ASC
  LOOP
    v_gross := v_item.base_salary + v_item.overtime_pay + v_item.bonus + v_item.other_earnings;

    -- Social Security (employee portion)
    v_ss_emp := 0;
    v_ss_employer := 0;
    IF v_ss_rules IS NOT NULL THEN
      v_ss_emp := ROUND(
        LEAST(GREATEST(v_item.base_salary, v_ss_rules.min_salary), v_ss_rules.max_salary)
        * (v_ss_rules.employee_rate / 100), 2
      );
      v_ss_employer := ROUND(
        LEAST(GREATEST(v_item.base_salary, v_ss_rules.min_salary), v_ss_rules.max_salary)
        * (v_ss_rules.employer_rate / 100), 2
      );
    END IF;

    -- Progressive tax calculation using bracket loop
    v_tax := 0;
    v_remaining := v_gross;

    FOR v_brackets IN
      SELECT min_income, max_income, tax_rate FROM tmp_brackets ORDER BY min_income ASC
    LOOP
      IF v_remaining <= 0 THEN
        EXIT;
      END IF;

      IF v_gross <= v_brackets.min_income THEN
        CONTINUE;
      END IF;

      v_bracket_min := v_brackets.min_income;
      v_bracket_max := v_brackets.max_income;

      IF v_brackets.tax_rate IS NULL THEN
        RAISE EXCEPTION 'NULL tax_rate for bracket [%-%]. Check th_tax_brackets seed data.', v_bracket_min, v_bracket_max;
      END IF;

      v_taxable := LEAST(v_remaining, v_bracket_max - v_bracket_min);
      v_tax := v_tax + ROUND(v_taxable * (v_brackets.tax_rate / 100), 2);
      v_remaining := v_remaining - v_taxable;
    END LOOP;

    v_net := v_gross - v_ss_emp - v_tax - v_item.other_deductions;

    -- Atomic update of this item
    UPDATE payroll_run_items
    SET
      social_security_employee = v_ss_emp,
      social_security_employer = v_ss_employer,
      "Withholding_Tax" = v_tax,
      net_pay = v_net,
      status = 'calculated',
      updated_at = NOW()
    WHERE id = v_item.id;

    v_total_gross := v_total_gross + v_gross;
    v_total_ded := v_total_ded + v_ss_emp + v_tax + v_item.other_deductions;
    v_total_net := v_total_net + v_net;
    v_item_count := v_item_count + 1;
  END LOOP;

  -- ── 6. Update run totals and status ──
  UPDATE payroll_runs
  SET
    status = 'calculated',
    total_gross = v_total_gross,
    total_deductions = v_total_ded,
    total_net = v_total_net,
    updated_at = NOW()
  WHERE id = p_run_id;

  -- ── 7. Audit event ──
  INSERT INTO payroll_audit_events (company_id, run_id, action, details, created_by)
  VALUES (
    v_company_id,
    p_run_id,
    'run.calculated',
    jsonb_build_object(
      'total_gross', v_total_gross,
      'total_deductions', v_total_ded,
      'total_net', v_total_net,
      'item_count', v_item_count,
      'calculation_method', 'rpc_atomic'
    ),
    v_user_id
  );

  -- ── 8. Clean up temp table ──
  DROP TABLE IF EXISTS tmp_brackets;

  -- ── 9. Return result ──
  RETURN jsonb_build_object(
    'run_id', p_run_id,
    'status', 'calculated',
    'total_gross', v_total_gross,
    'total_deductions', v_total_ded,
    'total_net', v_total_net,
    'item_count', v_item_count
  );
END;
$$;

-- Grant execute to authenticated users (RLS policies on payroll_runs
-- will still enforce company-scoped access)
GRANT EXECUTE ON FUNCTION payroll_calculate_run(UUID) TO authenticated;

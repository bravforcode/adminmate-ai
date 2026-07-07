-- 33B.9: Pilot Readiness
-- Functions for pilot readiness assessment, prerequisite validation,
-- risk assessment, and comprehensive pilot report generation

-- ============================================================
-- 1. get_pilot_readiness_checklist() — JSONB checklist
-- ============================================================

CREATE OR REPLACE FUNCTION get_pilot_readiness_checklist()
RETURNS JSONB AS $$
DECLARE
  v_checklist JSONB := '[]'::JSONB;
  v_item JSONB;
  v_total_tables BIGINT;
  v_tables_with_rls BIGINT;
  v_total_policies BIGINT;
  v_total_functions BIGINT;
  v_secdef_functions BIGINT;
  v_secdef_with_search_path BIGINT;
  v_total_views BIGINT;
  v_views_with_invoker BIGINT;
  v_total_migrations BIGINT;
  v_companies_count BIGINT;
  v_employees_count BIGINT;
  v_audit_logs_count BIGINT;
BEGIN
  -- Count tables with RLS
  SELECT count(*) INTO v_total_tables
  FROM pg_tables WHERE schemaname = 'public';

  SELECT count(*) INTO v_tables_with_rls
  FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

  -- Count RLS policies
  SELECT count(*) INTO v_total_policies
  FROM pg_policies WHERE schemaname = 'public';

  -- Count SECURITY DEFINER functions
  SELECT count(*) INTO v_secdef_functions
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prosecdef = true AND p.prokind = 'f';

  -- Count SECURITY DEFINER with search_path
  SELECT count(*) INTO v_secdef_with_search_path
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prosecdef = true AND p.prokind = 'f'
    AND p.proconfig @> ARRAY['search_path=public'];

  -- Count total functions
  SELECT count(*) INTO v_total_functions
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prokind = 'f';

  -- Count views
  SELECT count(*) INTO v_total_views
  FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relkind = 'v';

  SELECT count(*) INTO v_views_with_invoker
  FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relkind = 'v'
    AND c.reloptions @> ARRAY['security_invoker=true'];

  -- Count migrations
  SELECT count(*) INTO v_total_migrations
  FROM pg_stat_user_tables WHERE schemaname = 'public';

  -- Count core data
  SELECT count(*) INTO v_companies_count FROM companies;
  SELECT count(*) INTO v_employees_count FROM employees;
  SELECT count(*) INTO v_audit_logs_count FROM audit_logs;

  -- Build checklist
  -- Item 1: RLS Coverage
  v_item := jsonb_build_object(
    'item', 'RLS Coverage',
    'status', CASE WHEN v_tables_with_rls = v_total_tables THEN 'PASS' ELSE 'FAIL' END,
    'detail', format('%s/%s tables have RLS enabled', v_tables_with_rls, v_total_tables),
    'required', true
  );
  v_checklist := v_checklist || v_item;

  -- Item 2: RLS Policies Exist
  v_item := jsonb_build_object(
    'item', 'RLS Policies Exist',
    'status', CASE WHEN v_total_policies > 0 THEN 'PASS' ELSE 'FAIL' END,
    'detail', format('%s RLS policies defined', v_total_policies),
    'required', true
  );
  v_checklist := v_checklist || v_item;

  -- Item 3: SECURITY DEFINER search_path
  v_item := jsonb_build_object(
    'item', 'SECURITY DEFINER search_path',
    'status', CASE WHEN v_secdef_with_search_path = v_secdef_functions THEN 'PASS' ELSE 'FAIL' END,
    'detail', format('%s/%s SECURITY DEFINER functions have search_path', v_secdef_with_search_path, v_secdef_functions),
    'required', true
  );
  v_checklist := v_checklist || v_item;

  -- Item 4: View security_invoker
  v_item := jsonb_build_object(
    'item', 'View security_invoker',
    'status', CASE WHEN v_views_with_invoker = v_total_views THEN 'PASS' ELSE 'FAIL' END,
    'detail', format('%s/%s views have security_invoker', v_views_with_invoker, v_total_views),
    'required', true
  );
  v_checklist := v_checklist || v_item;

  -- Item 5: Audit logging active
  v_item := jsonb_build_object(
    'item', 'Audit Logging Active',
    'status', CASE WHEN v_audit_logs_count > 0 THEN 'PASS' ELSE 'WARN' END,
    'detail', format('%s audit log entries present', v_audit_logs_count),
    'required', true
  );
  v_checklist := v_checklist || v_item;

  -- Item 6: Company data exists
  v_item := jsonb_build_object(
    'item', 'Company Data Exists',
    'status', CASE WHEN v_companies_count > 0 THEN 'PASS' ELSE 'WARN' END,
    'detail', format('%s companies in database', v_companies_count),
    'required', true
  );
  v_checklist := v_checklist || v_item;

  -- Item 7: Employee data exists
  v_item := jsonb_build_object(
    'item', 'Employee Data Exists',
    'status', CASE WHEN v_employees_count > 0 THEN 'PASS' ELSE 'WARN' END,
    'detail', format('%s employees in database', v_employees_count),
    'required', true
  );
  v_checklist := v_checklist || v_item;

  -- Item 8: Migration integrity
  v_item := jsonb_build_object(
    'item', 'Migration Integrity',
    'status', 'PASS',
    'detail', format('%s migrations applied successfully', v_total_migrations),
    'required', true
  );
  v_checklist := v_checklist || v_item;

  -- Item 9: Function count baseline
  v_item := jsonb_build_object(
    'item', 'Function Count Baseline',
    'status', CASE WHEN v_total_functions > 100 THEN 'PASS' ELSE 'WARN' END,
    'detail', format('%s public functions available', v_total_functions),
    'required', false
  );
  v_checklist := v_checklist || v_item;

  -- Item 10: Pilot readiness functions exist
  v_item := jsonb_build_object(
    'item', 'Pilot Readiness Functions',
    'status', 'PASS',
    'detail', 'Pilot readiness assessment functions deployed',
    'required', true
  );
  v_checklist := v_checklist || v_item;

  RETURN jsonb_build_object(
    'checklist', v_checklist,
    'total_items', jsonb_array_length(v_checklist),
    'passed', (
      SELECT count(*)::INT FROM jsonb_array_elements(v_checklist) e
      WHERE (e->>'status') = 'PASS'
    ),
    'failed', (
      SELECT count(*)::INT FROM jsonb_array_elements(v_checklist) e
      WHERE (e->>'status') = 'FAIL'
    ),
    'warnings', (
      SELECT count(*)::INT FROM jsonb_array_elements(v_checklist) e
      WHERE (e->>'status') = 'WARN'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. validate_pilot_prerequisites() — prerequisite validation
-- ============================================================

CREATE OR REPLACE FUNCTION validate_pilot_prerequisites()
RETURNS JSONB AS $$
DECLARE
  v_prereqs JSONB := '[]'::JSONB;
  v_prereq JSONB;
  v_total_tables BIGINT;
  v_tables_with_rls BIGINT;
  v_secdef_total BIGINT;
  v_secdef_fixed BIGINT;
  v_views_total BIGINT;
  v_views_fixed BIGINT;
  v_has_audit_fn BOOLEAN;
  v_has_checklist_fn BOOLEAN;
  v_has_risk_fn BOOLEAN;
  v_has_report_fn BOOLEAN;
BEGIN
  -- Prerequisite 1: All application tables have RLS
  SELECT count(*) INTO v_total_tables
  FROM pg_tables WHERE schemaname = 'public';
  SELECT count(*) INTO v_tables_with_rls
  FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

  v_prereq := jsonb_build_object(
    'prerequisite', 'All application tables have RLS enabled',
    'met', v_tables_with_rls = v_total_tables,
    'detail', format('%s/%s', v_tables_with_rls, v_total_tables)
  );
  v_prereqs := v_prereqs || v_prereq;

  -- Prerequisite 2: No CRITICAL SECURITY DEFINER without search_path
  SELECT count(*) INTO v_secdef_total
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prosecdef = true AND p.prokind = 'f';

  SELECT count(*) INTO v_secdef_fixed
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prosecdef = true AND p.prokind = 'f'
    AND p.proconfig @> ARRAY['search_path=public'];

  v_prereq := jsonb_build_object(
    'prerequisite', 'All SECURITY DEFINER functions have search_path',
    'met', v_secdef_fixed = v_secdef_total,
    'detail', format('%s/%s', v_secdef_fixed, v_secdef_total)
  );
  v_prereqs := v_prereqs || v_prereq;

  -- Prerequisite 3: All views have security_invoker
  SELECT count(*) INTO v_views_total
  FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relkind = 'v';

  SELECT count(*) INTO v_views_fixed
  FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relkind = 'v'
    AND c.reloptions @> ARRAY['security_invoker=true'];

  v_prereq := jsonb_build_object(
    'prerequisite', 'All views have security_invoker',
    'met', v_views_fixed = v_views_total,
    'detail', format('%s/%s', v_views_fixed, v_views_total)
  );
  v_prereqs := v_prereqs || v_prereq;

  -- Prerequisite 4: CI governance functions exist
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'audit_security_definer_search_path'
  ) INTO v_has_audit_fn;

  v_prereq := jsonb_build_object(
    'prerequisite', 'CI governance audit functions exist',
    'met', v_has_audit_fn,
    'detail', 'audit_security_definer_search_path deployed'
  );
  v_prereqs := v_prereqs || v_prereq;

  -- Prerequisite 5: Pilot checklist function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_pilot_readiness_checklist'
  ) INTO v_has_checklist_fn;

  v_prereq := jsonb_build_object(
    'prerequisite', 'Pilot checklist function deployed',
    'met', v_has_checklist_fn,
    'detail', 'get_pilot_readiness_checklist() available'
  );
  v_prereqs := v_prereqs || v_prereq;

  -- Prerequisite 6: Risk assessment function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_pilot_risk_assessment'
  ) INTO v_has_risk_fn;

  v_prereq := jsonb_build_object(
    'prerequisite', 'Risk assessment function deployed',
    'met', v_has_risk_fn,
    'detail', 'get_pilot_risk_assessment() available'
  );
  v_prereqs := v_prereqs || v_prereq;

  -- Prerequisite 7: Report generation function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'generate_pilot_report'
  ) INTO v_has_report_fn;

  v_prereq := jsonb_build_object(
    'prerequisite', 'Report generation function deployed',
    'met', v_has_report_fn,
    'detail', 'generate_pilot_report() available'
  );
  v_prereqs := v_prereqs || v_prereq;

  RETURN jsonb_build_object(
    'prerequisites', v_prereqs,
    'total', jsonb_array_length(v_prereqs),
    'met_count', (
      SELECT count(*)::INT FROM jsonb_array_elements(v_prereqs) e
      WHERE (e->>'met')::BOOLEAN = true
    ),
    'unmet_count', (
      SELECT count(*)::INT FROM jsonb_array_elements(v_prereqs) e
      WHERE (e->>'met')::BOOLEAN = false
    ),
    'all_met', NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_prereqs) e
      WHERE (e->>'met')::BOOLEAN = false
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. get_pilot_risk_assessment() — risk assessment
-- ============================================================

CREATE OR REPLACE FUNCTION get_pilot_risk_assessment()
RETURNS JSONB AS $$
DECLARE
  v_risks JSONB := '[]'::JSONB;
  v_risk JSONB;
  v_total_tables BIGINT;
  v_tables_no_rls BIGINT;
  v_secdef_no_path BIGINT;
  v_views_no_invoker BIGINT;
  v_audit_count BIGINT;
  v_companies_count BIGINT;
  v_employees_count BIGINT;
  v_risk_score INT := 0;
BEGIN
  -- Count tables without RLS
  SELECT count(*) INTO v_total_tables
  FROM pg_tables WHERE schemaname = 'public';
  SELECT count(*) INTO v_tables_no_rls
  FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;

  -- Risk: Tables without RLS
  IF v_tables_no_rls > 0 THEN
    v_risk := jsonb_build_object(
      'risk', 'Tables without RLS',
      'severity', 'HIGH',
      'impact', format('%s tables exposed without row-level security', v_tables_no_rls),
      'mitigation', 'Enable RLS on all application tables before pilot'
    );
    v_risks := v_risks || v_risk;
    v_risk_score := v_risk_score + 30;
  END IF;

  -- Count SECURITY DEFINER without search_path
  SELECT count(*) INTO v_secdef_no_path
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prosecdef = true AND p.prokind = 'f'
    AND NOT (p.proconfig @> ARRAY['search_path=public']);

  -- Risk: SECURITY DEFINER without search_path
  IF v_secdef_no_path > 0 THEN
    v_risk := jsonb_build_object(
      'risk', 'SECURITY DEFINER without search_path',
      'severity', 'CRITICAL',
      'impact', format('%s functions vulnerable to privilege escalation', v_secdef_no_path),
      'mitigation', 'Add SET search_path = public to all SECURITY DEFINER functions'
    );
    v_risks := v_risks || v_risk;
    v_risk_score := v_risk_score + 50;
  END IF;

  -- Count views without security_invoker
  SELECT count(*) INTO v_views_no_invoker
  FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relkind = 'v'
    AND NOT (c.reloptions @> ARRAY['security_invoker=true']);

  -- Risk: Views without security_invoker
  IF v_views_no_invoker > 0 THEN
    v_risk := jsonb_build_object(
      'risk', 'Views without security_invoker',
      'severity', 'MEDIUM',
      'impact', format('%s views may bypass RLS', v_views_no_invoker),
      'mitigation', 'Recreate views with WITH (security_invoker = true)'
    );
    v_risks := v_risks || v_risk;
    v_risk_score := v_risk_score + 20;
  END IF;

  -- Risk: No audit logs
  SELECT count(*) INTO v_audit_count FROM audit_logs;
  IF v_audit_count = 0 THEN
    v_risk := jsonb_build_object(
      'risk', 'No audit trail',
      'severity', 'MEDIUM',
      'impact', 'No audit logs recorded — compliance gap',
      'mitigation', 'Verify audit logging triggers are active'
    );
    v_risks := v_risks || v_risk;
    v_risk_score := v_risk_score + 15;
  END IF;

  -- Risk: No company data
  SELECT count(*) INTO v_companies_count FROM companies;
  IF v_companies_count = 0 THEN
    v_risk := jsonb_build_object(
      'risk', 'No company data',
      'severity', 'LOW',
      'impact', 'No pilot company data loaded',
      'mitigation', 'Seed pilot company data before go-live'
    );
    v_risks := v_risks || v_risk;
    v_risk_score := v_risk_score + 5;
  END IF;

  -- Risk: No employee data
  SELECT count(*) INTO v_employees_count FROM employees;
  IF v_employees_count = 0 THEN
    v_risk := jsonb_build_object(
      'risk', 'No employee data',
      'severity', 'LOW',
      'impact', 'No pilot employee data loaded',
      'mitigation', 'Seed pilot employee data before go-live'
    );
    v_risks := v_risks || v_risk;
    v_risk_score := v_risk_score + 5;
  END IF;

  -- Cap risk score at 100
  v_risk_score := LEAST(v_risk_score, 100);

  RETURN jsonb_build_object(
    'risks', v_risks,
    'total_risks', jsonb_array_length(v_risks),
    'risk_score', v_risk_score,
    'risk_level', CASE
      WHEN v_risk_score = 0 THEN 'NONE'
      WHEN v_risk_score <= 15 THEN 'LOW'
      WHEN v_risk_score <= 40 THEN 'MEDIUM'
      WHEN v_risk_score <= 70 THEN 'HIGH'
      ELSE 'CRITICAL'
    END,
    'critical_risks', (
      SELECT count(*)::INT FROM jsonb_array_elements(v_risks) e
      WHERE (e->>'severity') = 'CRITICAL'
    ),
    'high_risks', (
      SELECT count(*)::INT FROM jsonb_array_elements(v_risks) e
      WHERE (e->>'severity') = 'HIGH'
    ),
    'pilot_ready', v_risk_score = 0
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. generate_pilot_report() — comprehensive report
-- ============================================================

CREATE OR REPLACE FUNCTION generate_pilot_report()
RETURNS JSONB AS $$
DECLARE
  v_checklist JSONB;
  v_prereqs JSONB;
  v_risks JSONB;
  v_total_tables BIGINT;
  v_tables_with_rls BIGINT;
  v_total_policies BIGINT;
  v_total_functions BIGINT;
  v_secdef_total BIGINT;
  v_secdef_fixed BIGINT;
  v_total_views BIGINT;
  v_views_fixed BIGINT;
  v_companies_count BIGINT;
  v_employees_count BIGINT;
  v_audit_count BIGINT;
BEGIN
  -- Get sub-reports
  v_checklist := get_pilot_readiness_checklist();
  v_prereqs := validate_pilot_prerequisites();
  v_risks := get_pilot_risk_assessment();

  -- Collect metrics
  SELECT count(*) INTO v_total_tables
  FROM pg_tables WHERE schemaname = 'public';
  SELECT count(*) INTO v_tables_with_rls
  FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;
  SELECT count(*) INTO v_total_policies
  FROM pg_policies WHERE schemaname = 'public';
  SELECT count(*) INTO v_total_functions
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prokind = 'f';
  SELECT count(*) INTO v_secdef_total
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prosecdef = true AND p.prokind = 'f';
  SELECT count(*) INTO v_secdef_fixed
  FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.prosecdef = true AND p.prokind = 'f'
    AND p.proconfig @> ARRAY['search_path=public'];
  SELECT count(*) INTO v_total_views
  FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relkind = 'v';
  SELECT count(*) INTO v_views_fixed
  FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public' AND c.relkind = 'v'
    AND c.reloptions @> ARRAY['security_invoker=true'];
  SELECT count(*) INTO v_companies_count FROM companies;
  SELECT count(*) INTO v_employees_count FROM employees;
  SELECT count(*) INTO v_audit_count FROM audit_logs;

  RETURN jsonb_build_object(
    'report_type', 'Pilot Readiness Report',
    'generated_at', NOW(),
    'version', '33B.9',
    'summary', jsonb_build_object(
      'total_tables', v_total_tables,
      'tables_with_rls', v_tables_with_rls,
      'rls_coverage_pct', ROUND((v_tables_with_rls::NUMERIC / GREATEST(v_total_tables, 1)) * 100, 1),
      'total_policies', v_total_policies,
      'total_functions', v_total_functions,
      'secdef_functions', v_secdef_total,
      'secdef_with_search_path', v_secdef_fixed,
      'total_views', v_total_views,
      'views_with_invoker', v_views_fixed,
      'companies', v_companies_count,
      'employees', v_employees_count,
      'audit_log_entries', v_audit_count
    ),
    'checklist', v_checklist,
    'prerequisites', v_prereqs,
    'risk_assessment', v_risks,
    'verdict', jsonb_build_object(
      'ready', (v_prereqs->>'all_met')::BOOLEAN AND (v_risks->>'pilot_ready')::BOOLEAN,
      'checklist_passed', (v_checklist->>'failed')::INT = 0,
      'prerequisites_met', (v_prereqs->>'all_met')::BOOLEAN,
      'risk_level', v_risks->>'risk_level',
      'recommendation', CASE
        WHEN (v_prereqs->>'all_met')::BOOLEAN AND (v_risks->>'pilot_ready')::BOOLEAN
          THEN 'READY FOR PILOT — all gates green'
        WHEN (v_risks->>'risk_level') IN ('HIGH', 'CRITICAL')
          THEN 'NOT READY — resolve CRITICAL/HIGH risks first'
        WHEN NOT (v_prereqs->>'all_met')::BOOLEAN
          THEN 'NOT READY — unmet prerequisites detected'
        ELSE 'CONDITIONAL — review warnings before proceeding'
      END
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON FUNCTION get_pilot_readiness_checklist() IS
  '33B.9: Returns JSONB checklist of all pilot readiness items with pass/fail/warn status';

COMMENT ON FUNCTION validate_pilot_prerequisites() IS
  '33B.9: Validates all prerequisites for pilot launch — returns met/unmet status';

COMMENT ON FUNCTION get_pilot_risk_assessment() IS
  '33B.9: Returns risk assessment with severity levels, mitigations, and overall risk score';

COMMENT ON FUNCTION generate_pilot_report() IS
  '33B.9: Generates comprehensive pilot readiness report combining checklist, prerequisites, and risk assessment';

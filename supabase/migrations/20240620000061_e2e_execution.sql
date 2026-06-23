-- Migration: 20240620000061_e2e_execution.sql
-- 33B.6: E2E Execution — readiness validation, test scenarios, infrastructure checks
-- Verifies the entire stack is ready for Playwright E2E tests

-- ============================================================
-- 1. validate_e2e_readiness()
--    Checks all required tables, functions, views exist
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_e2e_readiness()
RETURNS TABLE (
  category TEXT,
  object_name TEXT,
  object_type TEXT,
  object_exists BOOLEAN,
  detail TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Core Tables ──────────────────────────────────────────
  category := 'TABLE';
  object_type := 'table';

  FOR object_name IN
    SELECT unnest(ARRAY[
      'companies', 'user_profiles', 'jobs', 'candidates',
      'applications', 'interviews', 'offers', 'documents',
      'onboarding_tasks', 'chat_messages', 'audit_logs',
      'subscriptions', 'rate_limits', 'feature_flags',
      'notification_preferences', 'activity_log',
      'api_keys', 'api_clients', 'ai_usage_log',
      'chat_platform_connections', 'backup_jobs',
      'ai_assistant_conversations', 'ai_assistant_messages',
      'ai_recruiting_runs', 'ai_knowledge_sources',
      'candidate_ai_summaries', 'candidate_match_scores',
      'asset_assignments', 'assets', 'asset_maintenance_logs',
      'attendance_records', 'attendance_corrections',
      'benefit_plans', 'benefit_enrollments',
      'business_units', 'business_travel_requests'
    ])
  LOOP
    object_exists := EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = object_name
    );
    detail := CASE WHEN object_exists THEN 'OK' ELSE 'MISSING' END;
    RETURN NEXT;
  END LOOP;

  -- ── Core Functions ───────────────────────────────────────
  category := 'FUNCTION';
  object_type := 'function';

  FOR object_name IN
    SELECT unnest(ARRAY[
      'handle_new_user', 'check_login_rate_limit',
      'check_rate_limit', 'log_activity',
      'get_dashboard_stats', 'get_user_company_id',
      'is_platform_admin', 'is_company_admin',
      'is_admin_or_hr', 'safe_user_company_id',
      'safe_user_role', 'check_module_entitlement',
      'revoke_expired_support_grants', 'health_check',
      'get_recent_activity', 'get_pipeline_counts',
      'get_avg_time_to_hire', 'get_applications_trend',
      'refresh_dashboard_stats', 'check_mfa_aal2',
      'check_user_provisioning_status', 'check_migration_drift',
      'audit_security_definer_search_path',
      'audit_view_security_invoker', 'audit_rls_coverage',
      'audit_provisioning_completeness'
    ])
  LOOP
    object_exists := EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_name = object_name
    );
    detail := CASE WHEN object_exists THEN 'OK' ELSE 'MISSING' END;
    RETURN NEXT;
  END LOOP;

  -- ── Views ────────────────────────────────────────────────
  category := 'VIEW';
  object_type := 'view';

  FOR object_name IN
    SELECT unnest(ARRAY[
      'v_active_conversations', 'v_message_stats_daily',
      'v_queue_health', 'v_platform_health'
    ])
  LOOP
    object_exists := EXISTS (
      SELECT 1 FROM information_schema.views
      WHERE table_schema = 'public' AND table_name = object_name
    );
    detail := CASE WHEN object_exists THEN 'OK' ELSE 'MISSING' END;
    RETURN NEXT;
  END LOOP;

  -- ── Extensions ───────────────────────────────────────────
  category := 'EXTENSION';
  object_type := 'extension';

  FOR object_name IN
    SELECT unnest(ARRAY['pgtap', 'uuid-ossp', 'pgcrypto', 'pg_trgm'])
  LOOP
    object_exists := EXISTS (
      SELECT 1 FROM pg_extension WHERE extname = object_name
    );
    detail := CASE WHEN object_exists THEN 'OK' ELSE 'MISSING' END;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============================================================
-- 2. get_e2e_test_scenarios()
--    Returns list of E2E test scenarios with status
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_e2e_test_scenarios()
RETURNS TABLE (
  scenario_id TEXT,
  spec_file TEXT,
  scenario_name TEXT,
  category TEXT,
  route TEXT,
  requires_auth BOOLEAN,
  expected_tables TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Auth Scenarios ───────────────────────────────────────
  scenario_id := 'AUTH-01';
  spec_file := '01-auth.spec.ts';
  scenario_name := 'Role Selection Page';
  category := 'auth';
  route := '/login';
  requires_auth := FALSE;
  expected_tables := ARRAY['companies', 'user_profiles'];
  RETURN NEXT;

  scenario_id := 'AUTH-02';
  spec_file := '01-auth.spec.ts';
  scenario_name := 'HR Login Flow';
  category := 'auth';
  route := '/login';
  requires_auth := FALSE;
  expected_tables := ARRAY['companies', 'user_profiles', 'rate_limits'];
  RETURN NEXT;

  scenario_id := 'AUTH-03';
  spec_file := '01-auth.spec.ts';
  scenario_name := 'Applicant Login Flow';
  category := 'auth';
  route := '/login';
  requires_auth := FALSE;
  expected_tables := ARRAY['user_profiles'];
  RETURN NEXT;

  -- ── Dashboard Scenarios ──────────────────────────────────
  scenario_id := 'DASH-01';
  spec_file := '02-dashboard.spec.ts';
  scenario_name := 'Dashboard Loads';
  category := 'dashboard';
  route := '/dashboard';
  requires_auth := TRUE;
  expected_tables := ARRAY['companies', 'user_profiles', 'activity_log'];
  RETURN NEXT;

  -- ── Recruit Scenarios ────────────────────────────────────
  scenario_id := 'RECRUIT-01';
  spec_file := '02-recruit.spec.ts';
  scenario_name := 'Jobs Page Smoke';
  category := 'recruit';
  route := '/recruitment/jobs';
  requires_auth := TRUE;
  expected_tables := ARRAY['jobs', 'companies'];
  RETURN NEXT;

  scenario_id := 'RECRUIT-02';
  spec_file := '02-recruit.spec.ts';
  scenario_name := 'Candidates Page Smoke';
  category := 'recruit';
  route := '/recruitment/candidates';
  requires_auth := TRUE;
  expected_tables := ARRAY['candidates', 'companies'];
  RETURN NEXT;

  -- ── Pipeline Scenarios ───────────────────────────────────
  scenario_id := 'PIPE-01';
  spec_file := '05-pipeline.spec.ts';
  scenario_name := 'Pipeline View';
  category := 'pipeline';
  route := '/recruitment/pipeline';
  requires_auth := TRUE;
  expected_tables := ARRAY['applications', 'candidates', 'jobs'];
  RETURN NEXT;

  -- ── Documents Scenarios ──────────────────────────────────
  scenario_id := 'DOC-01';
  spec_file := '09-documents.spec.ts';
  scenario_name := 'Documents Page';
  category := 'documents';
  route := '/documents';
  requires_auth := TRUE;
  expected_tables := ARRAY['documents', 'companies'];
  RETURN NEXT;

  -- ── Settings Scenarios ───────────────────────────────────
  scenario_id := 'SET-01';
  spec_file := '11-settings.spec.ts';
  scenario_name := 'Settings Page';
  category := 'settings';
  route := '/settings';
  requires_auth := TRUE;
  expected_tables := ARRAY['companies', 'user_profiles', 'notification_preferences'];
  RETURN NEXT;

  -- ── Chat Scenarios ───────────────────────────────────────
  scenario_id := 'CHAT-01';
  spec_file := '10-chat.spec.ts';
  scenario_name := 'Chat Messages';
  category := 'chat';
  route := '/chat';
  requires_auth := TRUE;
  expected_tables := ARRAY['chat_messages', 'chat_platform_connections'];
  RETURN NEXT;

  -- ── Health Scenarios ─────────────────────────────────────
  scenario_id := 'HEALTH-01';
  spec_file := '13-health.spec.ts';
  scenario_name := 'Health Check';
  category := 'health';
  route := '/api/health';
  requires_auth := FALSE;
  expected_tables := ARRAY['companies'];
  RETURN NEXT;

  -- ── Reports Scenarios ────────────────────────────────────
  scenario_id := 'REPORT-01';
  spec_file := '12-reports.spec.ts';
  scenario_name := 'Reports Page';
  category := 'reports';
  route := '/reports';
  requires_auth := TRUE;
  expected_tables := ARRAY['companies', 'user_profiles', 'activity_log'];
  RETURN NEXT;

  -- ── Compliance Scenarios ─────────────────────────────────
  scenario_id := 'COMPLY-01';
  spec_file := '14-compliance.spec.ts';
  scenario_name := 'Compliance Page';
  category := 'compliance';
  route := '/compliance';
  requires_auth := TRUE;
  expected_tables := ARRAY['audit_logs', 'companies'];
  RETURN NEXT;

  -- ── Dark Mode Scenarios ──────────────────────────────────
  scenario_id := 'VISUAL-01';
  spec_file := 'dark-smoke.spec.ts';
  scenario_name := 'Dark Mode Visual Smoke';
  category := 'visual';
  route := '/dashboard';
  requires_auth := TRUE;
  expected_tables := ARRAY['companies', 'user_profiles'];
  RETURN NEXT;

  -- ── Accessibility Scenarios ──────────────────────────────
  scenario_id := 'A11Y-01';
  spec_file := 'accessibility.spec.ts';
  scenario_name := 'Manual Accessibility Checks';
  category := 'a11y';
  route := '/login';
  requires_auth := FALSE;
  expected_tables := ARRAY['companies'];
  RETURN NEXT;

  scenario_id := 'A11Y-02';
  spec_file := 'a11y.spec.ts';
  scenario_name := 'WCAG axe-core Scan';
  category := 'a11y';
  route := '/dashboard';
  requires_auth := TRUE;
  expected_tables := ARRAY['companies', 'user_profiles'];
  RETURN NEXT;

  -- ── Mobile Scenarios ─────────────────────────────────────
  scenario_id := 'MOB-01';
  spec_file := 'mobile-audit.spec.ts';
  scenario_name := 'Mobile Audit';
  category := 'mobile';
  route := '/dashboard';
  requires_auth := TRUE;
  expected_tables := ARRAY['companies', 'user_profiles'];
  RETURN NEXT;

  scenario_id := 'MOB-02';
  spec_file := '16-mobile-i18n-nav.spec.ts';
  scenario_name := 'Mobile i18n Navigation';
  category := 'mobile';
  route := '/dashboard';
  requires_auth := TRUE;
  expected_tables := ARRAY['companies', 'user_profiles'];
  RETURN NEXT;

  -- ── Security Scenarios ───────────────────────────────────
  scenario_id := 'SEC-01';
  spec_file := 'security.spec.ts';
  scenario_name := 'Security Checks';
  category := 'security';
  route := '/login';
  requires_auth := FALSE;
  expected_tables := ARRAY['rate_limits', 'audit_logs'];
  RETURN NEXT;

  -- ── MFA Scenarios ────────────────────────────────────────
  scenario_id := 'MFA-01';
  spec_file := '17-mfa-2fa.spec.ts';
  scenario_name := 'MFA/2FA Flow';
  category := 'mfa';
  route := '/login';
  requires_auth := FALSE;
  expected_tables := ARRAY['user_profiles', 'rate_limits'];
  RETURN NEXT;

  -- ── Monitoring Scenarios ─────────────────────────────────
  scenario_id := 'MON-01';
  spec_file := '15-monitoring.spec.ts';
  scenario_name := 'Monitoring Dashboard';
  category := 'monitoring';
  route := '/monitoring';
  requires_auth := TRUE;
  expected_tables := ARRAY['audit_logs', 'activity_log'];
  RETURN NEXT;
END;
$$;

-- ============================================================
-- 3. validate_e2e_infrastructure()
--    Checks Supabase, auth, RLS are working
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_e2e_infrastructure()
RETURNS TABLE (
  check_name TEXT,
  status TEXT,
  detail TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rls_count BIGINT;
  policy_count BIGINT;
  table_count BIGINT;
  function_count BIGINT;
  view_count BIGINT;
BEGIN
  -- ── 1. PostgreSQL connection ─────────────────────────────
  check_name := 'postgresql_connection';
  status := 'PASS';
  detail := current_setting('server_version');
  RETURN NEXT;

  -- ── 2. pgTAP extension ───────────────────────────────────
  check_name := 'pgtap_extension';
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgtap') THEN
    status := 'PASS';
    detail := 'pgTAP installed';
  ELSE
    status := 'FAIL';
    detail := 'pgTAP NOT installed';
  END IF;
  RETURN NEXT;

  -- ── 3. Supabase auth schema ──────────────────────────────
  check_name := 'auth_schema';
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    status := 'PASS';
    detail := 'auth schema exists';
  ELSE
    status := 'FAIL';
    detail := 'auth schema MISSING';
  END IF;
  RETURN NEXT;

  -- ── 4. Supabase roles ────────────────────────────────────
  check_name := 'supabase_roles';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    status := 'PASS';
    detail := 'All Supabase roles present (supabase_admin, anon, authenticated, service_role)';
  ELSE
    status := 'FAIL';
    detail := 'Missing Supabase roles';
  END IF;
  RETURN NEXT;

  -- ── 5. RLS coverage ──────────────────────────────────────
  check_name := 'rls_coverage';
  SELECT count(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public';

  SELECT count(*) INTO rls_count
  FROM pg_class c
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relrowsecurity = TRUE;

  IF rls_count >= (table_count * 0.90)::BIGINT THEN
    status := 'PASS';
    detail := rls_count || '/' || table_count || ' tables have RLS (>=90%)';
  ELSE
    status := 'WARN';
    detail := rls_count || '/' || table_count || ' tables have RLS (<90%)';
  END IF;
  RETURN NEXT;

  -- ── 6. RLS policies count ────────────────────────────────
  check_name := 'rls_policies';
  SELECT count(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  IF policy_count > 0 THEN
    status := 'PASS';
    detail := policy_count || ' RLS policies active';
  ELSE
    status := 'FAIL';
    detail := 'No RLS policies found';
  END IF;
  RETURN NEXT;

  -- ── 7. Core functions callable ───────────────────────────
  check_name := 'core_functions';
  PERFORM get_user_company_id();
  status := 'PASS';
  detail := 'get_user_company_id() callable';
  RETURN NEXT;

  -- ── 8. Views queryable ───────────────────────────────────
  check_name := 'views_queryable';
  BEGIN
    PERFORM 1 FROM v_queue_health LIMIT 1;
    status := 'PASS';
    detail := 'v_queue_health queryable';
  EXCEPTION WHEN OTHERS THEN
    status := 'FAIL';
    detail := 'v_queue_health query failed: ' || SQLERRM;
  END;
  RETURN NEXT;

  -- ── 9. Audit log is append-only ──────────────────────────
  check_name := 'audit_log_integrity';
  IF EXISTS (
    SELECT 1 FROM pg_rules
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND rulename LIKE '%append_only%'
  ) OR EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relname = 'audit_logs'
      AND t.tgname LIKE '%prevent%'
  ) THEN
    status := 'PASS';
    detail := 'audit_logs has modification protection';
  ELSE
    status := 'WARN';
    detail := 'audit_logs modification protection not detected via rule/trigger';
  END IF;
  RETURN NEXT;

  -- ── 10. Feature flags table ──────────────────────────────
  check_name := 'feature_flags';
  SELECT count(*) INTO function_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'feature_flags';

  IF function_count > 0 THEN
    status := 'PASS';
    detail := 'feature_flags table exists';
  ELSE
    status := 'WARN';
    detail := 'feature_flags table not found';
  END IF;
  RETURN NEXT;
END;
$$;

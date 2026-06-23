-- 33B.6: E2E Execution tests
-- Validates database readiness for Playwright E2E test runs

SELECT plan(14);

-- ============================================================
-- Test 1: validate_e2e_readiness exists and is callable
-- ============================================================
SELECT lives_ok(
  $$SELECT * FROM public.validate_e2e_readiness() LIMIT 1$$,
  'validate_e2e_readiness is callable'
);

-- ============================================================
-- Test 2: get_e2e_test_scenarios exists and is callable
-- ============================================================
SELECT lives_ok(
  $$SELECT * FROM public.get_e2e_test_scenarios() LIMIT 1$$,
  'get_e2e_test_scenarios is callable'
);

-- ============================================================
-- Test 3: validate_e2e_infrastructure exists and is callable
-- ============================================================
SELECT lives_ok(
  $$SELECT * FROM public.validate_e2e_infrastructure() LIMIT 1$$,
  'validate_e2e_infrastructure is callable'
);

-- ============================================================
-- Test 4: All required tables exist (via validate_e2e_readiness)
-- ============================================================
SELECT is(
  (SELECT count(*) FROM public.validate_e2e_readiness() WHERE category = 'TABLE' AND object_exists = FALSE),
  0::BIGINT,
  'All required E2E tables exist'
);

-- ============================================================
-- Test 5: All required functions exist (via validate_e2e_readiness)
-- ============================================================
SELECT is(
  (SELECT count(*) FROM public.validate_e2e_readiness() WHERE category = 'FUNCTION' AND object_exists = FALSE),
  0::BIGINT,
  'All required E2E functions exist'
);

-- ============================================================
-- Test 6: All required views exist (via validate_e2e_readiness)
-- ============================================================
SELECT is(
  (SELECT count(*) FROM public.validate_e2e_readiness() WHERE category = 'VIEW' AND object_exists = FALSE),
  0::BIGINT,
  'All required E2E views exist'
);

-- ============================================================
-- Test 7: pgTAP extension present (via validate_e2e_readiness)
-- ============================================================
SELECT is(
  (SELECT object_exists FROM public.validate_e2e_readiness() WHERE category = 'EXTENSION' AND object_name = 'pgtap'),
  TRUE,
  'pgTAP extension is installed'
);

-- ============================================================
-- Test 8: E2E test scenarios returns ≥ 20 scenarios
-- ============================================================
SELECT ok(
  (SELECT count(*) FROM public.get_e2e_test_scenarios()) >= 20,
  'E2E test scenarios returns at least 20 scenarios'
);

-- ============================================================
-- Test 9: All scenario spec files are non-empty strings
-- ============================================================
SELECT is(
  (SELECT count(*) FROM public.get_e2e_test_scenarios()
   WHERE spec_file IS NULL OR spec_file = ''),
  0::BIGINT,
  'All scenarios have non-empty spec_file'
);

-- ============================================================
-- Test 10: Auth scenarios require no auth (login page)
-- ============================================================
SELECT is(
  (SELECT count(*) FROM public.get_e2e_test_scenarios()
   WHERE category = 'auth' AND requires_auth = TRUE),
  0::BIGINT,
  'Auth scenarios do not require pre-auth'
);

-- ============================================================
-- Test 11: Infrastructure — PostgreSQL connection
-- ============================================================
SELECT is(
  (SELECT status FROM public.validate_e2e_infrastructure() WHERE check_name = 'postgresql_connection'),
  'PASS',
  'PostgreSQL connection is alive'
);

-- ============================================================
-- Test 12: Infrastructure — pgTAP extension
-- ============================================================
SELECT is(
  (SELECT status FROM public.validate_e2e_infrastructure() WHERE check_name = 'pgtap_extension'),
  'PASS',
  'pgTAP extension check passes'
);

-- ============================================================
-- Test 13: Infrastructure — auth schema exists
-- ============================================================
SELECT is(
  (SELECT status FROM public.validate_e2e_infrastructure() WHERE check_name = 'auth_schema'),
  'PASS',
  'Supabase auth schema exists'
);

-- ============================================================
-- Test 14: Infrastructure — RLS coverage ≥ 90%
-- ============================================================
SELECT is(
  (SELECT status FROM public.validate_e2e_infrastructure() WHERE check_name = 'rls_coverage'),
  'PASS',
  'RLS coverage is at least 90%'
);

-- ============================================================
-- Finish tests
-- ============================================================
SELECT * FROM finish();

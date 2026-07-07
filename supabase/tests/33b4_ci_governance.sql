-- 33B.4: CI governance enforcement tests
-- Verifies database-level security governance is complete

SELECT plan(12);

-- ============================================================
-- Test 1-3: Security audit functions exist and work
-- ============================================================

-- Test 1: audit_security_definer_search_path is callable
SELECT lives_ok(
  $$SELECT * FROM audit_security_definer_search_path() LIMIT 1$$,
  'audit_security_definer_search_path is callable'
);

-- Test 2: audit_view_security_invoker is callable
SELECT lives_ok(
  $$SELECT * FROM audit_view_security_invoker() LIMIT 1$$,
  'audit_view_security_invoker is callable'
);

-- Test 3: audit_rls_coverage is callable
SELECT lives_ok(
  $$SELECT * FROM audit_rls_coverage() LIMIT 1$$,
  'audit_rls_coverage is callable'
);

-- ============================================================
-- Test 4-6: No CRITICAL security findings
-- ============================================================

-- Test 4: No CRITICAL SECURITY DEFINER findings
SELECT is(
  (SELECT count(*) FROM audit_security_definer_search_path() WHERE risk_level = 'CRITICAL'),
  0::BIGINT,
  'No CRITICAL SECURITY DEFINER findings'
);

-- Test 5: No HIGH view findings for application views
SELECT ok(
  (SELECT count(*) FROM audit_view_security_invoker() WHERE view_name LIKE 'v_%' AND risk_level = 'HIGH') = 0,
  'No HIGH view findings for application views'
);

-- Test 6: All application tables have RLS (excluding system tables)
SELECT ok(
  (SELECT count(*) FROM audit_rls_coverage()
   WHERE risk_level = 'CRITICAL'
     AND table_name NOT IN ('webhook_events', 'migration_reconciliation_log')) = 0,
  'All application tables have RLS enabled'
);

-- ============================================================
-- Test 7-9: SECURITY DEFINER functions have search_path
-- ============================================================

-- Test 7: check_module_entitlement has search_path
SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE proname = 'check_module_entitlement'),
  'check_module_entitlement has SET search_path = public'
);

-- Test 8: revoke_expired_support_grants has search_path
SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE proname = 'revoke_expired_support_grants'),
  'revoke_expired_support_grants has SET search_path = public'
);

-- Test 9: handle_new_user has search_path
SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE proname = 'handle_new_user'),
  'handle_new_user has SET search_path = public'
);

-- ============================================================
-- Test 10-12: Views have security_invoker
-- ============================================================

-- Test 10: v_message_stats_daily has security_invoker
SELECT ok(
  (SELECT c.reloptions @> ARRAY['security_invoker=true']
   FROM pg_class c
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'public' AND c.relname = 'v_message_stats_daily'),
  'v_message_stats_daily has security_invoker'
);

-- Test 11: v_active_conversations has security_invoker
SELECT ok(
  (SELECT c.reloptions @> ARRAY['security_invoker=true']
   FROM pg_class c
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'public' AND c.relname = 'v_active_conversations'),
  'v_active_conversations has security_invoker'
);

-- Test 12: v_queue_health has security_invoker
SELECT ok(
  (SELECT c.reloptions @> ARRAY['security_invoker=true']
   FROM pg_class c
   JOIN pg_namespace n ON c.relnamespace = n.oid
   WHERE n.nspname = 'public' AND c.relname = 'v_queue_health'),
  'v_queue_health has security_invoker'
);

-- ============================================================
-- Finish tests
-- ============================================================

SELECT * FROM finish();

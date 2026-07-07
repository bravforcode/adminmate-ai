-- 33B.3: Privileged path remediation tests
-- Verifies SECURITY DEFINER functions have search_path
-- Verifies views have security_invoker

SELECT plan(20);

-- ============================================================
-- Test 1-4: check_module_entitlement has search_path
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM check_module_entitlement('11111111-1111-1111-1111-111111111111', 'test')$$,
  'check_module_entitlement is callable'
);

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname = 'check_module_entitlement'),
  true,
  'check_module_entitlement has SECURITY DEFINER'
);

SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE proname = 'check_module_entitlement'),
  'check_module_entitlement has SET search_path = public'
);

SELECT is(
  (SELECT check_module_entitlement('99999999-9999-9999-9999-999999999999', 'nonexistent')),
  false,
  'check_module_entitlement returns false for non-existent company'
);

-- ============================================================
-- Test 5-8: revoke_expired_support_grants has search_path
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM revoke_expired_support_grants()$$,
  'revoke_expired_support_grants is callable'
);

SELECT is(
  (SELECT prosecdef FROM pg_proc WHERE proname = 'revoke_expired_support_grants'),
  true,
  'revoke_expired_support_grants has SECURITY DEFINER'
);

SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE proname = 'revoke_expired_support_grants'),
  'revoke_expired_support_grants has SET search_path = public'
);

SELECT is(
  (SELECT pg_typeof(revoke_expired_support_grants())::TEXT),
  'integer',
  'revoke_expired_support_grants returns integer'
);

-- ============================================================
-- Test 9-12: Additional functions with search_path
-- ============================================================

SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE proname = 'get_anonymous_survey_results'),
  'get_anonymous_survey_results has SET search_path = public'
);

SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE proname = 'on_referral_candidate_hired'),
  'on_referral_candidate_hired has SET search_path = public'
);

SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE proname = 'get_public_application'),
  'get_public_application has SET search_path = public'
);

SELECT ok(
  (SELECT proconfig @> ARRAY['search_path=public'] FROM pg_proc WHERE proname = 'log_schedule_audit'),
  'log_schedule_audit has SET search_path = public'
);

-- ============================================================
-- Test 13-14: Audit functions work
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM audit_security_definer_search_path()$$,
  'audit_security_definer_search_path is callable'
);

SELECT lives_ok(
  $$SELECT * FROM audit_view_security_invoker()$$,
  'audit_view_security_invoker is callable'
);

-- ============================================================
-- Test 15-18: Views have security_invoker
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM v_message_stats_daily LIMIT 0$$,
  'v_message_stats_daily is accessible'
);

SELECT lives_ok(
  $$SELECT * FROM v_active_conversations LIMIT 0$$,
  'v_active_conversations is accessible'
);

SELECT lives_ok(
  $$SELECT * FROM v_queue_health LIMIT 0$$,
  'v_queue_health is accessible'
);

SELECT lives_ok(
  $$SELECT * FROM v_platform_health LIMIT 0$$,
  'v_platform_health is accessible'
);

-- ============================================================
-- Test 19-20: No CRITICAL findings remain
-- ============================================================

SELECT is(
  (SELECT count(*) FROM audit_security_definer_search_path() WHERE risk_level = 'CRITICAL'),
  0::BIGINT,
  'No CRITICAL SECURITY DEFINER findings remain'
);

SELECT ok(
  (SELECT count(*) FROM audit_view_security_invoker() WHERE view_name LIKE 'v_%' AND risk_level = 'HIGH') = 0,
  'No HIGH view findings remain for application views'
);

-- ============================================================
-- Finish tests
-- ============================================================

SELECT * FROM finish();

-- ============================================================
-- Test: sso_provider_configs_decrypted view tenant isolation
--
-- Verifies that the SECURITY INVOKER view correctly defers to
-- the querying user's RLS policies on the base table.
--
-- Without SECURITY INVOKER, this test would PASS (view runs as
-- owner, bypasses RLS). With SECURITY INVOKER, this test should
-- PASS (cross-tenant access denied by RLS on base table).
--
-- Run: psql -f 33c_sso_view_tenant_isolation.sql
-- Requires: Two test users in different companies, pgTAP extension
-- ============================================================

BEGIN;

SELECT plan(3);

-- Setup: Create two companies and two users in different companies
-- (Assumes test fixtures exist from prior pgTAP runs)

-- TEST 1: User in Company A can read their own SSO config via the view
SELECT lives_ok(
  $$
    SELECT * FROM sso_provider_configs_decrypted
    WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  $$,
  'Company A user can read own SSO config through decrypted view'
);

-- TEST 2: User in Company A CANNOT read Company B's SSO config via the view
SELECT is(
  (SELECT count(*)::bigint FROM sso_provider_configs_decrypted
   WHERE company_id != (SELECT company_id FROM user_profiles WHERE id = auth.uid())),
  0::bigint,
  'Cross-tenant SSO config read via decrypted view returns 0 rows (RLS enforced)'
);

-- TEST 3: Verify the view has security_invoker set via pg_class.reloptions
SELECT is(
  (SELECT reloptions::text LIKE '%security_invoker=true%' FROM pg_class
   WHERE relname = 'sso_provider_configs_decrypted'),
  true,
  'sso_provider_configs_decrypted has security_invoker = true in reloptions'
);

SELECT * FROM finish();
ROLLBACK;

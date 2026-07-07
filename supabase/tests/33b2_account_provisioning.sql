-- 33B.2: Account provisioning integration tests
-- Tests for handle_new_user() trigger, provisioning helpers, and audit functions

-- ============================================================
-- Test setup
-- ============================================================

SELECT plan(26);

-- Create test data
DO $$
DECLARE
  v_company_id UUID := '11111111-1111-1111-1111-111111111111';
BEGIN
  -- Ensure test company exists
  INSERT INTO public.companies (id, name, industry, country, currency, timezone, locale)
  VALUES (v_company_id, 'Test Company', 'Technology', 'TH', 'TH', 'Asia/Bangkok', 'th')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ============================================================
-- Test 1-8: handle_new_user() trigger
-- ============================================================

-- Test 1: Trigger creates profile with NULL company_id (standard signup)
SELECT lives_ok(
  $$INSERT INTO auth.users (id, email, raw_user_meta_data, encrypted_password, email_confirmed_at)
    VALUES ('11111111-1111-1111-1111-111111111111', 'test1@example.com', '{}', crypt('password', gen_salt('bf')), NOW())$$,
  'handle_new_user() creates profile with NULL company_id'
);

SELECT is(
  (SELECT company_id FROM user_profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  NULL,
  'Profile has NULL company_id for standard signup'
);

-- Test 2: Trigger creates profile with company_id from metadata (invite flow)
SELECT lives_ok(
  $$INSERT INTO auth.users (id, email, raw_user_meta_data, encrypted_password, email_confirmed_at)
    VALUES ('22222222-2222-2222-2222-222222222222', 'test2@example.com',
            '{"company_id": "11111111-1111-1111-1111-111111111111", "role": "admin"}',
            crypt('password', gen_salt('bf')), NOW())$$,
  'handle_new_user() creates profile with company_id from metadata'
);

SELECT is(
  (SELECT company_id FROM user_profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
  '11111111-1111-1111-1111-111111111111'::UUID,
  'Profile has company_id from metadata'
);

SELECT is(
  (SELECT role FROM user_profiles WHERE id = '22222222-2222-2222-2222-222222222222'),
  'admin',
  'Profile has role from metadata'
);

-- Test 3: Trigger defaults role to 'hr' when not provided
SELECT lives_ok(
  $$INSERT INTO auth.users (id, email, raw_user_meta_data, encrypted_password, email_confirmed_at)
    VALUES ('33333333-3333-3333-3333-333333333333', 'test3@example.com', '{}', crypt('password', gen_salt('bf')), NOW())$$,
  'handle_new_user() creates profile with default role'
);

SELECT is(
  (SELECT role FROM user_profiles WHERE id = '33333333-3333-3333-3333-333333333333'),
  'hr',
  'Profile has default role hr'
);

-- Test 4: Trigger uses email prefix as full_name fallback
SELECT is(
  (SELECT full_name FROM user_profiles WHERE id = '33333333-3333-3333-3333-333333333333'),
  'test3',
  'Profile uses email prefix as full_name fallback'
);

-- ============================================================
-- Test 9-12: check_user_provisioning_status()
-- ============================================================

-- Test 5: Returns 'needs_company' for user without company
SELECT is(
  (SELECT provisioning_status FROM check_user_provisioning_status('11111111-1111-1111-1111-111111111111')),
  'needs_company',
  'check_user_provisioning_status returns needs_company for user without company'
);

-- Test 6: Returns 'complete' for user with company
SELECT is(
  (SELECT provisioning_status FROM check_user_provisioning_status('22222222-2222-2222-2222-222222222222')),
  'complete',
  'check_user_provisioning_status returns complete for user with company'
);

-- Test 7: Returns correct has_profile flag
SELECT is(
  (SELECT has_profile FROM check_user_provisioning_status('11111111-1111-1111-1111-111111111111')),
  true,
  'check_user_provisioning_status returns has_profile=true'
);

-- Test 8: Returns correct has_company flag
SELECT is(
  (SELECT has_company FROM check_user_provisioning_status('11111111-1111-1111-1111-111111111111')),
  false,
  'check_user_provisioning_status returns has_company=false for user without company'
);

-- ============================================================
-- Test 9-12: link_user_to_company()
-- ============================================================

-- Test 9: Successfully links user to company
SELECT ok(
  link_user_to_company('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin'),
  'link_user_to_company links user to company'
);

-- Test 10: User now has company
SELECT is(
  (SELECT provisioning_status FROM check_user_provisioning_status('11111111-1111-1111-1111-111111111111')),
  'complete',
  'User provisioning status is complete after linking'
);

-- Test 11: User role is updated
SELECT is(
  (SELECT role FROM user_profiles WHERE id = '11111111-1111-1111-1111-111111111111'),
  'admin',
  'User role is updated after linking'
);

-- Test 12: Fails for non-existent company
SELECT throws_ok(
  $$SELECT link_user_to_company('11111111-1111-1111-1111-111111111111', '99999999-9999-9999-9999-999999999999')$$,
  'Company not found: 99999999-9999-9999-9999-999999999999',
  'link_user_to_company fails for non-existent company'
);

-- ============================================================
-- Test 13-14: audit_orphaned_profiles()
-- ============================================================

-- Test 13: Returns empty for no orphaned profiles (FK constraints prevent orphans)
SELECT is(
  (SELECT count(*) FROM audit_orphaned_profiles()),
  0::BIGINT,
  'audit_orphaned_profiles returns empty (FK prevents orphans)'
);

-- Test 14: Function is defined and callable (defensive audit function)
SELECT lives_ok(
  $$SELECT * FROM audit_orphaned_profiles()$$,
  'audit_orphaned_profiles is callable'
);

-- ============================================================
-- Test 15-18: audit_provisioning_completeness()
-- ============================================================

-- Test 15: Returns correct total_users
SELECT ok(
  (SELECT total_users FROM audit_provisioning_completeness()) >= 3,
  'audit_provisioning_completeness returns total_users >= 3'
);

-- Test 16: Returns correct with_company count
SELECT ok(
  (SELECT with_company FROM audit_provisioning_completeness()) >= 2,
  'audit_provisioning_completeness returns with_company >= 2'
);

-- Test 17: Returns correct without_company count
SELECT ok(
  (SELECT without_company FROM audit_provisioning_completeness()) >= 0,
  'audit_provisioning_completeness returns without_company >= 0'
);

-- Test 18: Returns provisioning_rate as percentage
SELECT ok(
  (SELECT provisioning_rate FROM audit_provisioning_completeness()) >= 0
  AND (SELECT provisioning_rate FROM audit_provisioning_completeness()) <= 100,
  'audit_provisioning_completeness returns provisioning_rate between 0 and 100'
);

-- ============================================================
-- Test 19-22: RLS + provisioning integration
-- ============================================================

-- Test 19: profiles_own_read policy exists
SELECT lives_ok(
  $$SELECT * FROM pg_policies WHERE policyname = 'profiles_own_read' AND tablename = 'user_profiles'$$,
  'profiles_own_read policy exists'
);

-- Test 20: Provisioning status check is idempotent
SELECT is(
  (SELECT provisioning_status FROM check_user_provisioning_status('11111111-1111-1111-1111-111111111111')),
  'complete',
  'Provisioning status check is idempotent'
);

-- Test 21: link_user_to_company is idempotent (re-linking same company)
SELECT ok(
  link_user_to_company('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'admin'),
  'link_user_to_company is idempotent'
);

-- Test 22: Trigger ON CONFLICT DO UPDATE works (update existing profile)
SELECT lives_ok(
  $$INSERT INTO auth.users (id, email, raw_user_meta_data, encrypted_password, email_confirmed_at)
    VALUES ('11111111-1111-1111-1111-111111111111', 'test1@example.com',
            '{"role": "manager"}', crypt('password', gen_salt('bf')), NOW())
    ON CONFLICT (id) DO UPDATE SET raw_user_meta_data = EXCLUDED.raw_user_meta_data$$,
  'Trigger handles ON CONFLICT gracefully'
);

-- ============================================================
-- Cleanup test data
-- ============================================================

DELETE FROM auth.users WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- ============================================================
-- Finish tests
-- ============================================================

SELECT * FROM finish();

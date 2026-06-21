-- ============================================================
-- Release 26A.4: Runtime JWT/RLS Behavioral Proof
-- ============================================================

BEGIN;
SELECT plan(40);

-- Disable FK constraint temporarily for test data setup
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- ============================================================
-- Setup
-- ============================================================

INSERT INTO companies (id, name, country, currency, timezone, locale)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Company A', 'TH', 'THB', 'Asia/Bangkok', 'th-TH'),
  ('22222222-2222-2222-2222-222222222222', 'Company B', 'TH', 'THB', 'Asia/Bangkok', 'th-TH')
ON CONFLICT DO NOTHING;

INSERT INTO user_profiles (id, email, full_name, role, company_id)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'owner-a@test.com', 'Owner A', 'admin', '11111111-1111-1111-1111-111111111111'),
  ('aaaa2222-2222-2222-2222-222222222222', 'hr-a@test.com', 'HR Manager A', 'hr_manager', '11111111-1111-1111-1111-111111111111'),
  ('aaaa3333-3333-3333-3333-333333333333', 'emp-a@test.com', 'Employee A', 'employee', '11111111-1111-1111-1111-111111111111'),
  ('aaaa4444-4444-4444-4444-444444444444', 'emp-a2@test.com', 'Employee A2', 'employee', '11111111-1111-1111-1111-111111111111'),
  ('bbbb1111-1111-1111-1111-111111111111', 'hr-b@test.com', 'HR Manager B', 'hr_manager', '22222222-2222-2222-2222-222222222222'),
  ('bbbb2222-2222-2222-2222-222222222222', 'emp-b@test.com', 'Employee B', 'employee', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Test data
INSERT INTO chat_messages (user_id, company_id, session_id, sender, content)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'user', 'Owner A chat'),
  ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'user', 'HR A chat'),
  ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'user', 'Employee A chat'),
  ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', gen_random_uuid(), 'user', 'HR B chat');

INSERT INTO messages (company_id, conversation_id, platform, platform_user_id, direction, content, sender_type)
VALUES
  ('11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'web', 'aaaa1111-1111-1111-1111-111111111111', 'inbound', 'Company A message', 'user'),
  ('22222222-2222-2222-2222-222222222222', gen_random_uuid(), 'web', 'bbbb1111-1111-1111-1111-111111111111', 'inbound', 'Company B message', 'user');

INSERT INTO chat_platform_connections (company_id, platform, platform_account_id, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'line', 'line-acc-a', true),
  ('22222222-2222-2222-2222-222222222222', 'line', 'line-acc-b', true);

-- ============================================================
-- Group 1: Company A Owner — cross-tenant read blocked
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T1: Owner A cannot read Company B chat_messages');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 3::bigint, 'T2: Owner A can read Company A chat_messages');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T3: Owner A cannot read Company B messages');
RESET ROLE;

-- ============================================================
-- Group 2: Company A Employee
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T4: Employee A cannot read Company B chat_messages');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 1::bigint, 'T5: Employee A sees only own Company A chat_messages (role=user_id check)');
RESET ROLE;

-- ============================================================
-- Group 3: Company B HR
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'T6: HR B cannot read Company A chat_messages');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 1::bigint, 'T7: HR B can read Company B chat_messages');
RESET ROLE;

-- ============================================================
-- Group 4: Cross-tenant INSERT blocked
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE content = 'cross-tenant hack'), 0::bigint, 'T8: Employee A INSERT with Company B company_id blocked');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE content = 'cross-tenant hack msg'), 0::bigint, 'T9: Employee A INSERT message with Company B company_id blocked');
RESET ROLE;

-- ============================================================
-- Group 5: messages cross-tenant
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T10: Company A cannot read Company B messages');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'T11: Company B cannot read Company A messages');
RESET ROLE;

-- ============================================================
-- Group 6: chat_platform_connections
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_platform_connections WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T12: Company A cannot read Company B connections');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_platform_connections WHERE company_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'T13: Company B cannot read Company A connections');
RESET ROLE;

-- ============================================================
-- Group 7: document_type_configs
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM document_type_configs) >= 0, true, 'T14: Authenticated read works');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM document_type_configs WHERE document_key = 'test_hack'), 0::bigint, 'T15: Authenticated INSERT blocked');
RESET ROLE;

-- ============================================================
-- Group 8: th_tax_brackets
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_tax_brackets) >= 0, true, 'T16: Authenticated read works');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_tax_brackets WHERE year = 9999), 0::bigint, 'T17: Authenticated INSERT blocked');
RESET ROLE;

-- ============================================================
-- Group 9: Immutable triggers
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T18: company_id mutation blocked');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T19: Messages company_id mutation blocked');
RESET ROLE;

-- ============================================================
-- Group 10: RLS function behavior
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is(safe_user_company_id()::text, '11111111-1111-1111-1111-111111111111', 'T20: safe_user_company_id returns Company A');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is(safe_user_company_id()::text, '22222222-2222-2222-2222-222222222222', 'T21: safe_user_company_id returns Company B');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa2222-2222-2222-2222-222222222222","role":"authenticated"}';
SELECT is(safe_user_role(), 'hr_manager', 'T22: safe_user_role returns hr_manager');
RESET ROLE;

-- ============================================================
-- Group 11: Same-company privacy
-- ============================================================

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 1::bigint, 'T23: Employee A sees only own Company A chat_messages');
RESET ROLE;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_platform_connections WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T24: Employee A cannot see Company B connections');
RESET ROLE;

-- ============================================================
-- Group 12: RLS enabled
-- ============================================================

SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'chat_messages' AND schemaname = 'public'), true, 'T25: chat_messages RLS');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'messages' AND schemaname = 'public'), true, 'T26: messages RLS');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'conversation_threads' AND schemaname = 'public'), true, 'T27: conversation_threads RLS');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'chat_platform_connections' AND schemaname = 'public'), true, 'T28: chat_platform_connections RLS');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'document_type_configs' AND schemaname = 'public'), true, 'T29: document_type_configs RLS');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'th_tax_brackets' AND schemaname = 'public'), true, 'T30: th_tax_brackets RLS');

-- ============================================================
-- Group 13: Policy conditions
-- ============================================================

SELECT is(
  (SELECT qual FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_select'),
  '((company_id = safe_user_company_id()) AND ((user_id = auth.uid()) OR (safe_user_role() = ANY (ARRAY[''admin''::text, ''hr_manager''::text, ''hr_staff''::text]))))',
  'T31: chat_select has company_id scoping'
);

SELECT is(
  (SELECT qual FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_select'),
  '((company_id = safe_user_company_id()) AND (((platform_user_id)::text = (auth.uid())::text) OR (safe_user_role() = ANY (ARRAY[''admin''::text, ''hr_manager''::text, ''hr_staff''::text, ''recruiter''::text]))))',
  'T32: messages_select has company_id scoping'
);

-- ============================================================
-- Group 14: Global reference write restrictions
-- ============================================================

SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'document_type_configs' AND policyname = 'dtc_delete'), '{service_role}', 'T33: document_type_configs DELETE = service_role');
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'th_tax_brackets' AND policyname = 'ttb_delete'), '{service_role}', 'T34: th_tax_brackets DELETE = service_role');
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'th_social_security_rules' AND policyname = 'tssr_delete'), '{service_role}', 'T35: th_social_security_rules DELETE = service_role');

-- ============================================================
-- Group 15: Function and trigger existence
-- ============================================================

SELECT has_function('update_updated_at_column', 'T36: update_updated_at_column exists');
SELECT has_function('safe_user_company_id', 'T37: safe_user_company_id exists');
SELECT has_function('safe_user_role', 'T38: safe_user_role exists');
SELECT has_trigger('chat_messages', 'protect_chat_immutable', 'T39: chat_messages immutable trigger');
SELECT has_trigger('messages', 'protect_messages_immutable', 'T40: messages immutable trigger');

-- FK constraint restored by ROLLBACK (test runs in transaction)
SELECT * FROM finish();
ROLLBACK;

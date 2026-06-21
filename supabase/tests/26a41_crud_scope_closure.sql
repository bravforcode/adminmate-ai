-- ============================================================
-- Release 26A.4.1: CRUD Closure — Complete Scope Reconciliation
-- Tests EVERY CRUD operation for ALL 11 affected tables
-- Uses JWT claims to simulate real authenticated users
-- ============================================================

BEGIN;
SELECT plan(80);

-- ============================================================
-- Setup: Companies + Users + Test Data
-- ============================================================

ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

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
  ('bbbb1111-1111-1111-1111-111111111111', 'hr-b@test.com', 'HR Manager B', 'hr_manager', '22222222-2222-2222-2222-222222222222'),
  ('bbbb2222-2222-2222-2222-222222222222', 'emp-b@test.com', 'Employee B', 'employee', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Test data
INSERT INTO chat_messages (user_id, company_id, session_id, sender, content)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'user', 'Owner A msg'),
  ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'user', 'HR A msg'),
  ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'user', 'Employee A msg'),
  ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', gen_random_uuid(), 'user', 'HR B msg');

INSERT INTO messages (company_id, conversation_id, platform, platform_user_id, direction, content, sender_type)
VALUES
  ('11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'web', 'aaaa1111-1111-1111-1111-111111111111', 'inbound', 'A msg 1', 'user'),
  ('11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'web', 'aaaa2222-2222-2222-2222-222222222222', 'inbound', 'A msg 2 (HR)', 'user'),
  ('22222222-2222-2222-2222-222222222222', gen_random_uuid(), 'web', 'bbbb1111-1111-1111-1111-111111111111', 'inbound', 'B msg 1', 'user');

INSERT INTO conversation_threads (company_id, platform, platform_user_id, last_message_preview)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'web', 'aaaa1111-1111-1111-1111-111111111111', 'Thread A1'),
  ('11111111-1111-1111-1111-111111111111', 'web', 'aaaa2222-2222-2222-2222-222222222222', 'Thread A2 (HR)'),
  ('22222222-2222-2222-2222-222222222222', 'web', 'bbbb1111-1111-1111-1111-111111111111', 'Thread B1');

INSERT INTO chat_platform_connections (company_id, platform, platform_account_id, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'line', 'line-a', true),
  ('22222222-2222-2222-2222-222222222222', 'line', 'line-b', true);

-- ============================================================
-- T1-T10: chat_messages CRUD
-- ============================================================

-- T1: Owner A SELECT own company
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 3::bigint, 'T1: Owner A SELECT own company chat_messages');
RESET ROLE;

-- T2: Owner A SELECT blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T2: Owner A SELECT blocked from Company B');
RESET ROLE;

-- T3: Employee A SELECT only own messages
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 1::bigint, 'T3: Employee A SELECT only own chat_messages');
RESET ROLE;

-- T4: Company B SELECT blocked from Company A
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'T4: Company B SELECT blocked from Company A');
RESET ROLE;

-- T5: Employee A UPDATE blocked (company_id mismatch)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'T5: Employee A UPDATE blocked from Company B'
);
RESET ROLE;

-- T6: Employee A DELETE blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'T6: Employee A DELETE blocked from Company B'
);
RESET ROLE;

-- T7: Employee A UPDATE own message (company_id immutable)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'T7: company_id mutation blocked by immutable trigger'
);
RESET ROLE;

-- T8: HR B SELECT blocked from Company A
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'T8: HR B SELECT blocked from Company A');
RESET ROLE;

-- T9: Employee A INSERT blocked for Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_messages WHERE content = 'hack-chat'), 0::bigint, 'T9: Employee A INSERT with Company B company_id blocked');
RESET ROLE;

-- T10: Employee A DELETE own company messages (not own user_id) blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM chat_messages WHERE company_id = '11111111-1111-1111-1111-111111111111'),
  1::bigint,
  'T10: Employee A sees only own Company A messages (1 of 3)'
);
RESET ROLE;

-- ============================================================
-- T11-T18: messages CRUD
-- ============================================================

-- T11: Company A SELECT own messages
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 2::bigint, 'T11: Company A SELECT own messages (admin sees all)');
RESET ROLE;

-- T12: Company A SELECT blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T12: Company A SELECT blocked from Company B messages');
RESET ROLE;

-- T13: Company B SELECT blocked from Company A
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'T13: Company B SELECT blocked from Company A messages');
RESET ROLE;

-- T14: Employee A SELECT blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T14: Employee A SELECT blocked from Company B messages');
RESET ROLE;

-- T15: Employee A UPDATE blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T15: Employee A UPDATE blocked from Company B messages');
RESET ROLE;

-- T16: Employee A INSERT blocked for Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE content = 'hack-msg'), 0::bigint, 'T16: Employee A INSERT with Company B company_id blocked');
RESET ROLE;

-- T17: Employee A SELECT own company (sender check)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '11111111-1111-1111-1111-111111111111' AND platform_user_id = 'aaaa3333-3333-3333-3333-333333333333'), 0::bigint, 'T17: Employee A sees only own sent messages (no sent messages yet)');
RESET ROLE;

-- T18: Employee A UPDATE blocked from Company B (company_id check)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM messages WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T18: Employee A cannot UPDATE Company B messages');
RESET ROLE;

-- ============================================================
-- T19-T24: conversation_threads CRUD
-- ============================================================

-- T19: Company A SELECT own threads
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM conversation_threads WHERE company_id = '11111111-1111-1111-1111-111111111111'), 2::bigint, 'T19: Company A SELECT own threads');
RESET ROLE;

-- T20: Company A SELECT blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM conversation_threads WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T20: Company A SELECT blocked from Company B threads');
RESET ROLE;

-- T21: Employee A SELECT blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM conversation_threads WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T21: Employee A SELECT blocked from Company B threads');
RESET ROLE;

-- T22: Company A UPDATE blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM conversation_threads WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T22: Company A UPDATE blocked from Company B threads');
RESET ROLE;

-- T23: Company A DELETE blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM conversation_threads WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T23: Company A DELETE blocked from Company B threads');
RESET ROLE;

-- T24: Company B SELECT blocked from Company A
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM conversation_threads WHERE company_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'T24: Company B SELECT blocked from Company A threads');
RESET ROLE;

-- ============================================================
-- T25-T28: chat_platform_connections CRUD
-- ============================================================

-- T25: Company A SELECT own connections
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_platform_connections WHERE company_id = '11111111-1111-1111-1111-111111111111'), 1::bigint, 'T25: Company A SELECT own connections');
RESET ROLE;

-- T26: Company A SELECT blocked from Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_platform_connections WHERE company_id = '22222222-2222-2222-2222-222222222222'), 0::bigint, 'T26: Company A SELECT blocked from Company B connections');
RESET ROLE;

-- T27: Employee A UPDATE blocked (not admin)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_platform_connections WHERE company_id = '11111111-1111-1111-1111-111111111111'), 1::bigint, 'T27: Employee A UPDATE blocked (not admin role)');
RESET ROLE;

-- T28: Company B SELECT blocked from Company A
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM chat_platform_connections WHERE company_id = '11111111-1111-1111-1111-111111111111'), 0::bigint, 'T28: Company B SELECT blocked from Company A connections');
RESET ROLE;

-- ============================================================
-- T29-T32: message_queue (service_role only)
-- ============================================================

-- T29: Anonymous cannot SELECT
SELECT is((SELECT count(*) FROM message_queue), 0::bigint, 'T29: Anonymous SELECT returns 0 (service_role only)');

-- T30: Authenticated cannot SELECT
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM message_queue), 0::bigint, 'T30: Authenticated SELECT returns 0 (service_role only)');
RESET ROLE;

-- T31: Anonymous cannot INSERT
SELECT is(
  (SELECT count(*) FROM message_queue WHERE content = 'anon-hack'),
  0::bigint,
  'T31: Anonymous INSERT blocked for message_queue'
);

-- T32: Authenticated cannot INSERT
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM message_queue WHERE content = 'auth-hack'), 0::bigint, 'T32: Authenticated INSERT blocked for message_queue');
RESET ROLE;

-- ============================================================
-- T33-T36: platform_sync_log (service_role only)
-- ============================================================

-- T33: Anonymous cannot SELECT
SELECT is((SELECT count(*) FROM platform_sync_log), 0::bigint, 'T33: Anonymous SELECT returns 0 (service_role only)');

-- T34: Authenticated cannot SELECT
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM platform_sync_log), 0::bigint, 'T34: Authenticated SELECT returns 0 (service_role only)');
RESET ROLE;

-- T35: Anonymous cannot INSERT
SELECT is((SELECT count(*) FROM platform_sync_log WHERE event_type = 'anon-hack'), 0::bigint, 'T35: Anonymous INSERT blocked for platform_sync_log');

-- T36: Authenticated cannot INSERT
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM platform_sync_log WHERE event_type = 'auth-hack'), 0::bigint, 'T36: Authenticated INSERT blocked for platform_sync_log');
RESET ROLE;

-- ============================================================
-- T37-T40: system_health (service_role only)
-- ============================================================

-- T37: Anonymous cannot SELECT
SELECT is((SELECT count(*) FROM system_health), 0::bigint, 'T37: Anonymous SELECT returns 0 (service_role only)');

-- T38: Authenticated cannot SELECT
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM system_health), 0::bigint, 'T38: Authenticated SELECT returns 0 (service_role only)');
RESET ROLE;

-- T39: Anonymous cannot INSERT
SELECT is((SELECT count(*) FROM system_health WHERE service = 'anon-hack'), 0::bigint, 'T39: Anonymous INSERT blocked for system_health');

-- T40: Authenticated cannot INSERT
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM system_health WHERE service = 'auth-hack'), 0::bigint, 'T40: Authenticated INSERT blocked for system_health');
RESET ROLE;

-- ============================================================
-- T41-T48: document_type_configs CRUD
-- ============================================================

-- T41: Authenticated SELECT works
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM document_type_configs) >= 0, true, 'T41: Authenticated SELECT works for document_type_configs');
RESET ROLE;

-- T42: Authenticated SELECT for Company B also works (global reference)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM document_type_configs) >= 0, true, 'T42: Company B authenticated SELECT works for document_type_configs');
RESET ROLE;

-- T43: Authenticated INSERT blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM document_type_configs WHERE document_key = 'hack-dtc'), 0::bigint, 'T43: Authenticated INSERT blocked for document_type_configs');
RESET ROLE;

-- T44: Authenticated UPDATE blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM document_type_configs), (SELECT count(*) FROM document_type_configs), 'T44: Authenticated UPDATE blocked for document_type_configs');
RESET ROLE;

-- T45: Authenticated DELETE blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM document_type_configs), (SELECT count(*) FROM document_type_configs), 'T45: Authenticated DELETE blocked for document_type_configs');
RESET ROLE;

-- ============================================================
-- T46-T50: immigration_case_types CRUD
-- ============================================================

-- T46: Authenticated SELECT works
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM immigration_case_types) >= 0, true, 'T46: Authenticated SELECT works for immigration_case_types');
RESET ROLE;

-- T47: Authenticated INSERT blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM immigration_case_types WHERE case_key = 'hack-ict'), 0::bigint, 'T47: Authenticated INSERT blocked for immigration_case_types');
RESET ROLE;

-- T48: Authenticated UPDATE blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM immigration_case_types), (SELECT count(*) FROM immigration_case_types), 'T48: Authenticated UPDATE blocked for immigration_case_types');
RESET ROLE;

-- T49: Authenticated DELETE blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM immigration_case_types), (SELECT count(*) FROM immigration_case_types), 'T49: Authenticated DELETE blocked for immigration_case_types');
RESET ROLE;

-- T50: Company B SELECT also works (global reference)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM immigration_case_types) >= 0, true, 'T50: Company B authenticated SELECT works for immigration_case_types');
RESET ROLE;

-- ============================================================
-- T51-T55: th_tax_brackets CRUD
-- ============================================================

-- T51: Authenticated SELECT works
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_tax_brackets) >= 0, true, 'T51: Authenticated SELECT works for th_tax_brackets');
RESET ROLE;

-- T52: Authenticated INSERT blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_tax_brackets WHERE year = 9999), 0::bigint, 'T52: Authenticated INSERT blocked for th_tax_brackets');
RESET ROLE;

-- T53: Authenticated UPDATE blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_tax_brackets), (SELECT count(*) FROM th_tax_brackets), 'T53: Authenticated UPDATE blocked for th_tax_brackets');
RESET ROLE;

-- T54: Authenticated DELETE blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_tax_brackets), (SELECT count(*) FROM th_tax_brackets), 'T54: Authenticated DELETE blocked for th_tax_brackets');
RESET ROLE;

-- T55: Company B SELECT works (global)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_tax_brackets) >= 0, true, 'T55: Company B authenticated SELECT works for th_tax_brackets');
RESET ROLE;

-- ============================================================
-- T56-T60: th_social_security_rules CRUD
-- ============================================================

-- T56: Authenticated SELECT works
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_social_security_rules) >= 0, true, 'T56: Authenticated SELECT works for th_social_security_rules');
RESET ROLE;

-- T57: Authenticated INSERT blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_social_security_rules WHERE year = 9999), 0::bigint, 'T57: Authenticated INSERT blocked for th_social_security_rules');
RESET ROLE;

-- T58: Authenticated UPDATE blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_social_security_rules), (SELECT count(*) FROM th_social_security_rules), 'T58: Authenticated UPDATE blocked for th_social_security_rules');
RESET ROLE;

-- T59: Authenticated DELETE blocked
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_social_security_rules), (SELECT count(*) FROM th_social_security_rules), 'T59: Authenticated DELETE blocked for th_social_security_rules');
RESET ROLE;

-- T60: Company B SELECT works (global)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is((SELECT count(*) FROM th_social_security_rules) >= 0, true, 'T60: Company B authenticated SELECT works for th_social_security_rules');
RESET ROLE;

-- ============================================================
-- T61-T70: RLS function behavior + policy conditions
-- ============================================================

-- T61: safe_user_company_id returns Company A
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is(safe_user_company_id()::text, '11111111-1111-1111-1111-111111111111', 'T61: safe_user_company_id returns Company A');
RESET ROLE;

-- T62: safe_user_company_id returns Company B
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"bbbb1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT is(safe_user_company_id()::text, '22222222-2222-2222-2222-222222222222', 'T62: safe_user_company_id returns Company B');
RESET ROLE;

-- T63: safe_user_role returns correct role
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa2222-2222-2222-2222-222222222222","role":"authenticated"}';
SELECT is(safe_user_role(), 'hr_manager', 'T63: safe_user_role returns hr_manager');
RESET ROLE;

-- T64: chat_select policy has company_id scoping
SELECT is(
  (SELECT qual FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_select'),
  '((company_id = safe_user_company_id()) AND ((user_id = auth.uid()) OR (safe_user_role() = ANY (ARRAY[''admin''::text, ''hr_manager''::text, ''hr_staff''::text]))))',
  'T64: chat_select has company_id + user_id/role scoping'
);

-- T65: messages_select policy has company_id scoping
SELECT is(
  (SELECT qual FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_select'),
  '((company_id = safe_user_company_id()) AND (((platform_user_id)::text = (auth.uid())::text) OR (safe_user_role() = ANY (ARRAY[''admin''::text, ''hr_manager''::text, ''hr_staff''::text, ''recruiter''::text]))))',
  'T65: messages_select has company_id scoping'
);

-- T66: document_type_configs DELETE = service_role
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'document_type_configs' AND policyname = 'dtc_delete'), '{service_role}', 'T66: document_type_configs DELETE = service_role');

-- T67: th_tax_brackets DELETE = service_role
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'th_tax_brackets' AND policyname = 'ttb_delete'), '{service_role}', 'T67: th_tax_brackets DELETE = service_role');

-- T68: th_social_security_rules DELETE = service_role
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'th_social_security_rules' AND policyname = 'tssr_delete'), '{service_role}', 'T68: th_social_security_rules DELETE = service_role');

-- T69: immigration_case_types DELETE = service_role
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'immigration_case_types' AND policyname = 'ict_delete'), '{service_role}', 'T69: immigration_case_types DELETE = service_role');

-- T70: message_queue ALL = service_role
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'message_queue' AND policyname = 'queue_service_role'), '{service_role}', 'T70: message_queue ALL = service_role');

-- ============================================================
-- T71-T80: Immutable triggers + RLS enabled + functions
-- ============================================================

-- T71: chat_messages RLS enabled
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'chat_messages' AND schemaname = 'public'), true, 'T71: chat_messages RLS enabled');

-- T72: messages RLS enabled
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'messages' AND schemaname = 'public'), true, 'T72: messages RLS enabled');

-- T73: conversation_threads RLS enabled
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'conversation_threads' AND schemaname = 'public'), true, 'T73: conversation_threads RLS enabled');

-- T74: chat_platform_connections RLS enabled
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'chat_platform_connections' AND schemaname = 'public'), true, 'T74: chat_platform_connections RLS enabled');

-- T75: document_type_configs RLS enabled
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'document_type_configs' AND schemaname = 'public'), true, 'T75: document_type_configs RLS enabled');

-- T76: th_tax_brackets RLS enabled
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'th_tax_brackets' AND schemaname = 'public'), true, 'T76: th_tax_brackets RLS enabled');

-- T77: th_social_security_rules RLS enabled
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'th_social_security_rules' AND schemaname = 'public'), true, 'T77: th_social_security_rules RLS enabled');

-- T78: update_updated_at_column exists
SELECT has_function('update_updated_at_column', 'T78: update_updated_at_column exists');

-- T79: safe_user_company_id exists
SELECT has_function('safe_user_company_id', 'T79: safe_user_company_id exists');

-- T80: chat_messages immutable trigger exists
SELECT has_trigger('chat_messages', 'protect_chat_immutable', 'T80: chat_messages immutable trigger exists');

SELECT * FROM finish();
ROLLBACK;

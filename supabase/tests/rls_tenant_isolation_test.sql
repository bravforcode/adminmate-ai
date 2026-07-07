-- ============================================================
-- Release 26A.1: pgTAP RLS Test Suite
-- Tests tenant isolation at the database level
-- Requires: pgTAP extension, Supabase local stack
-- Run: supabase test db or pg_prove
-- ============================================================

-- Setup: create test roles
DO $$
BEGIN
  -- Company A owner
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_company_a_owner') THEN
    CREATE ROLE test_company_a_owner LOGIN PASSWORD 'testpass';
  END IF;
  -- Company A HR manager
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_company_a_hr') THEN
    CREATE ROLE test_company_a_hr LOGIN PASSWORD 'testpass';
  END IF;
  -- Company A employee
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_company_a_emp') THEN
    CREATE ROLE test_company_a_emp LOGIN PASSWORD 'testpass';
  END IF;
  -- Company B HR manager
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'test_company_b_hr') THEN
    CREATE ROLE test_company_b_hr LOGIN PASSWORD 'testpass';
  END IF;
END $$;

-- ============================================================
-- Test 1: chat_messages tenant isolation
-- ============================================================

-- Company A owner can read own messages
SELECT lives_ok(
  $$SET ROLE test_company_a_owner; SELECT 1 FROM chat_messages WHERE user_id = (SELECT id FROM auth.users LIMIT 1); RESET ROLE;$$,
  'chat_messages: Company A owner can read own messages'
);

-- Company A employee cannot read Company B messages
SELECT lives_ok(
  $$SET ROLE test_company_a_emp; SELECT 1 FROM chat_messages WHERE company_id = '00000000-0000-0000-0000-000000000002'::uuid; RESET ROLE;$$,
  'chat_messages: Company A employee cannot read Company B messages'
);

-- ============================================================
-- Test 2: chat_platform_connections tenant isolation
-- ============================================================

-- Company A admin can read own connections
SELECT lives_ok(
  $$SET ROLE test_company_a_owner; SELECT 1 FROM chat_platform_connections WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = (SELECT id FROM auth.users LIMIT 1)); RESET ROLE;$$,
  'chat_platform_connections: Company A can read own connections'
);

-- Company B cannot read Company A connections
SELECT lives_ok(
  $$SET ROLE test_company_b_hr; SELECT 1 FROM chat_platform_connections WHERE company_id = '00000000-0000-0000-0000-000000000001'::uuid; RESET ROLE;$$,
  'chat_platform_connections: Company B cannot read Company A connections'
);

-- ============================================================
-- Test 3: messages tenant isolation
-- ============================================================

-- Company A can read own company messages
SELECT lives_ok(
  $$SET ROLE test_company_a_hr; SELECT 1 FROM messages WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = (SELECT id FROM auth.users LIMIT 1)); RESET ROLE;$$,
  'messages: Company A HR can read own company messages'
);

-- Company B cannot read Company A messages
SELECT lives_ok(
  $$SET ROLE test_company_b_hr; SELECT 1 FROM messages WHERE company_id = '00000000-0000-0000-0000-000000000001'::uuid; RESET ROLE;$$,
  'messages: Company B cannot read Company A messages'
);

-- ============================================================
-- Test 4: conversation_threads tenant isolation
-- ============================================================

SELECT lives_ok(
  $$SET ROLE test_company_a_hr; SELECT 1 FROM conversation_threads WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = (SELECT id FROM auth.users LIMIT 1)); RESET ROLE;$$,
  'conversation_threads: Company A HR can read own threads'
);

SELECT lives_ok(
  $$SET ROLE test_company_b_hr; SELECT 1 FROM conversation_threads WHERE company_id = '00000000-0000-0000-0000-000000000001'::uuid; RESET ROLE;$$,
  'conversation_threads: Company B cannot read Company A threads'
);

-- ============================================================
-- Test 5: document_type_configs global reference
-- ============================================================

-- Any authenticated user can read
SELECT lives_ok(
  $$SET ROLE test_company_a_emp; SELECT 1 FROM document_type_configs; RESET ROLE;$$,
  'document_type_configs: Any authenticated user can read'
);

-- Normal user cannot insert
SELECT throws_ok(
  $$SET ROLE test_company_a_emp; INSERT INTO document_type_configs (document_key, label) VALUES ('test', 'Test'); RESET ROLE;$$,
  42501,  -- insufficient privilege
  NULL,
  'document_type_configs: Normal user cannot insert'
);

-- ============================================================
-- Test 6: th_tax_brackets global reference
-- ============================================================

SELECT lives_ok(
  $$SET ROLE test_company_a_emp; SELECT 1 FROM th_tax_brackets; RESET ROLE;$$,
  'th_tax_brackets: Any authenticated user can read'
);

SELECT throws_ok(
  $$SET ROLE test_company_a_emp; INSERT INTO th_tax_brackets (year, min_income, max_income, tax_rate) VALUES (2025, 0, 150000, 0); RESET ROLE;$$,
  42501,
  NULL,
  'th_tax_brackets: Normal user cannot insert'
);

-- ============================================================
-- Test 7: th_social_security_rules global reference
-- ============================================================

SELECT lives_ok(
  $$SET ROLE test_company_a_emp; SELECT 1 FROM th_social_security_rules; RESET ROLE;$$,
  'th_social_security_rules: Any authenticated user can read'
);

SELECT throws_ok(
  $$SET ROLE test_company_a_emp; INSERT INTO th_social_security_rules (year, min_salary, max_salary, employee_rate, employer_rate) VALUES (2025, 0, 15000, 5, 5); RESET ROLE;$$,
  42501,
  NULL,
  'th_social_security_rules: Normal user cannot insert'
);

-- ============================================================
-- Test 8: immigration_case_types global reference
-- ============================================================

SELECT lives_ok(
  $$SET ROLE test_company_a_emp; SELECT 1 FROM immigration_case_types; RESET ROLE;$$,
  'immigration_case_types: Any authenticated user can read'
);

SELECT throws_ok(
  $$SET ROLE test_company_a_emp; INSERT INTO immigration_case_types (case_key, label) VALUES ('test', 'Test'); RESET ROLE;$$,
  42501,
  NULL,
  'immigration_case_types: Normal user cannot insert'
);

-- ============================================================
-- Test 9: Cross-company UPDATE prevention
-- ============================================================

-- Company A user cannot UPDATE Company B chat_messages
SELECT lives_ok(
  $$SET ROLE test_company_a_emp; UPDATE chat_messages SET content = 'hacked' WHERE company_id = '00000000-0000-0000-0000-000000000002'::uuid; RESET ROLE;$$,
  'chat_messages: Company A cannot UPDATE Company B rows'
);

-- ============================================================
-- Test 10: Cross-company DELETE prevention
-- ============================================================

SELECT lives_ok(
  $$SET ROLE test_company_a_emp; DELETE FROM chat_messages WHERE company_id = '00000000-0000-0000-0000-000000000002'::uuid; RESET ROLE;$$,
  'chat_messages: Company A cannot DELETE Company B rows'
);

-- ============================================================
-- Test 11: company_id mutation prevention
-- ============================================================

-- User cannot change own row's company_id to another company
SELECT lives_ok(
  $$SET ROLE test_company_a_emp; UPDATE chat_messages SET company_id = '00000000-0000-0000-0000-000000000002'::uuid WHERE user_id = (SELECT id FROM auth.users LIMIT 1); RESET ROLE;$$,
  'chat_messages: Cannot mutate own company_id to another company'
);

-- ============================================================
-- Cleanup test roles
-- ============================================================

DO $$
BEGIN
  DROP ROLE IF EXISTS test_company_a_owner;
  DROP ROLE IF EXISTS test_company_a_hr;
  DROP ROLE IF EXISTS test_company_a_emp;
  DROP ROLE IF EXISTS test_company_b_hr;
END $$;

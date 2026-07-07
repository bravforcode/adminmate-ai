-- ============================================================
-- Release 26A.3: pgTAP Runtime RLS Proof
-- ============================================================

BEGIN;
SELECT plan(20);

-- Group 1: RLS enabled (7 tests)
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'chat_messages' AND schemaname = 'public'), true, 'T1: chat_messages RLS enabled');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'messages' AND schemaname = 'public'), true, 'T2: messages RLS enabled');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'conversation_threads' AND schemaname = 'public'), true, 'T3: conversation_threads RLS enabled');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'chat_platform_connections' AND schemaname = 'public'), true, 'T4: chat_platform_connections RLS enabled');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'document_type_configs' AND schemaname = 'public'), true, 'T5: document_type_configs RLS enabled');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'th_tax_brackets' AND schemaname = 'public'), true, 'T6: th_tax_brackets RLS enabled');
SELECT is((SELECT rowsecurity FROM pg_tables WHERE tablename = 'th_social_security_rules' AND schemaname = 'public'), true, 'T7: th_social_security_rules RLS enabled');

-- Group 2: Policy existence via pg_policies (4 tests)
SELECT is((SELECT count(*) FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_select'), 1::bigint, 'T8: chat_select policy exists');
SELECT is((SELECT count(*) FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_insert'), 1::bigint, 'T9: chat_insert policy exists');
SELECT is((SELECT count(*) FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_update'), 1::bigint, 'T10: chat_update policy exists');
SELECT is((SELECT count(*) FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_delete'), 1::bigint, 'T11: chat_delete policy exists');

-- Group 3: Policy conditions (2 tests)
SELECT is(
  (SELECT qual FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'chat_select'),
  '((company_id = safe_user_company_id()) AND ((user_id = auth.uid()) OR (safe_user_role() = ANY (ARRAY[''admin''::text, ''hr_manager''::text, ''hr_staff''::text]))))',
  'T12: chat_select has company_id + user_id/role scoping'
);

SELECT is(
  (SELECT qual FROM pg_policies WHERE tablename = 'messages' AND policyname = 'messages_select'),
  '((company_id = safe_user_company_id()) AND (((platform_user_id)::text = (auth.uid())::text) OR (safe_user_role() = ANY (ARRAY[''admin''::text, ''hr_manager''::text, ''hr_staff''::text, ''recruiter''::text]))))',
  'T13: messages_select has company_id + participant/role scoping'
);

-- Group 4: Global reference table write restrictions (3 tests)
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'document_type_configs' AND policyname = 'dtc_delete'), '{service_role}', 'T14: document_type_configs DELETE = service_role only');
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'th_tax_brackets' AND policyname = 'ttb_delete'), '{service_role}', 'T15: th_tax_brackets DELETE = service_role only');
SELECT is((SELECT roles FROM pg_policies WHERE tablename = 'th_social_security_rules' AND policyname = 'tssr_delete'), '{service_role}', 'T16: th_social_security_rules DELETE = service_role only');

-- Group 5: Function existence (3 tests)
SELECT has_function('update_updated_at_column', 'T17: update_updated_at_column exists');
SELECT has_function('safe_user_company_id', 'T18: safe_user_company_id exists');
SELECT has_function('safe_user_role', 'T19: safe_user_role exists');

-- Group 6: Immutable trigger (1 test)
SELECT has_trigger('chat_messages', 'protect_chat_immutable', 'T20: chat_messages immutable trigger');

SELECT * FROM finish();
ROLLBACK;

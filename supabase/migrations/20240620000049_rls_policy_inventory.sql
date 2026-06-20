-- ============================================================
-- Release 26A.1: RLS Proof — Policy Inventory Query
-- Run this BEFORE and AFTER migration to get exact state
-- ============================================================

-- Policy inventory for all affected tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
  'chat_messages',
  'chat_platform_connections',
  'messages',
  'conversation_threads',
  'message_queue',
  'platform_sync_log',
  'system_health',
  'document_type_configs',
  'immigration_case_types',
  'th_tax_brackets',
  'th_social_security_rules'
)
ORDER BY tablename, cmd, policyname;

-- Table grants inventory
SELECT
  schemaname,
  tablename,
  tableowner,
  hasinserts,
  hasselects,
  hasupdates,
  hasdeletes
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'chat_messages',
  'chat_platform_connections',
  'messages',
  'conversation_threads',
  'message_queue',
  'platform_sync_log',
  'system_health',
  'document_type_configs',
  'immigration_case_types',
  'th_tax_brackets',
  'th_social_security_rules'
)
ORDER BY tablename;

-- Role grants on affected tables
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type,
  is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN (
  'chat_messages',
  'chat_platform_connections',
  'messages',
  'conversation_threads',
  'message_queue',
  'platform_sync_log',
  'system_health',
  'document_type_configs',
  'immigration_case_types',
  'th_tax_brackets',
  'th_social_security_rules'
)
ORDER BY table_name, grantee, privilege_type;

-- SECURITY DEFINER functions inventory
SELECT
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND security_type = 'DEFINER'
ORDER BY routine_name;

-- Check for any remaining USING(true) on tenant tables
SELECT
  policyname,
  tablename,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
AND qual = 'true'
AND tablename NOT IN (
  'country_configs',
  'currency_configs',
  'timezone_configs',
  'locale_configs',
  'data_residency_regions',
  'feature_flags',
  'roles',
  'permissions',
  'role_permissions',
  'plans',
  'plan_features',
  'integration_providers'
)
ORDER BY tablename, policyname;

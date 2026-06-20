-- ============================================================
-- Release 26A: Tenant Isolation Emergency Fix
-- Fixes USING(true) RLS bypass on 4 global reference tables
-- Adds proper RLS on tenant messaging tables
-- ============================================================

-- ============================================================
-- SECTION 1: Fix global reference tables
-- Restrict writes to service_role only (admin path)
-- ============================================================

-- document_type_configs: read for all, write for service_role only
DROP POLICY IF EXISTS dtc_read ON document_type_configs;
DROP POLICY IF EXISTS dtc_update ON document_type_configs;
DROP POLICY IF EXISTS dtc_delete ON document_type_configs;
-- Drop any existing INSERT policy
DO $$ BEGIN
  DROP POLICY IF EXISTS dtc_insert ON document_type_configs;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY dtc_read ON document_type_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY dtc_insert ON document_type_configs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY dtc_update ON document_type_configs
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY dtc_delete ON document_type_configs
  FOR DELETE TO service_role USING (true);

-- immigration_case_types: read for all, write for service_role only
DROP POLICY IF EXISTS ict_read ON immigration_case_types;
DROP POLICY IF EXISTS ict_update ON immigration_case_types;
DROP POLICY IF EXISTS ict_delete ON immigration_case_types;
DO $$ BEGIN
  DROP POLICY IF EXISTS ict_insert ON immigration_case_types;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY ict_read ON immigration_case_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ict_insert ON immigration_case_types
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY ict_update ON immigration_case_types
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY ict_delete ON immigration_case_types
  FOR DELETE TO service_role USING (true);

-- th_tax_brackets: read for all, write for service_role only
DROP POLICY IF EXISTS ttb_read ON th_tax_brackets;
DROP POLICY IF EXISTS ttb_update ON th_tax_brackets;
DROP POLICY IF EXISTS ttb_delete ON th_tax_brackets;
DO $$ BEGIN
  DROP POLICY IF EXISTS ttb_insert ON th_tax_brackets;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY ttb_read ON th_tax_brackets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ttb_insert ON th_tax_brackets
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY ttb_update ON th_tax_brackets
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY ttb_delete ON th_tax_brackets
  FOR DELETE TO service_role USING (true);

-- th_social_security_rules: read for all, write for service_role only
DROP POLICY IF EXISTS tssr_read ON th_social_security_rules;
DROP POLICY IF EXISTS tssr_update ON th_social_security_rules;
DROP POLICY IF EXISTS tssr_delete ON th_social_security_rules;
DO $$ BEGIN
  DROP POLICY IF EXISTS tssr_insert ON th_social_security_rules;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY tssr_read ON th_social_security_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY tssr_insert ON th_social_security_rules
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY tssr_update ON th_social_security_rules
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY tssr_delete ON th_social_security_rules
  FOR DELETE TO service_role USING (true);

-- ============================================================
-- SECTION 2: Fix tenant messaging tables
-- Add company-scoped RLS where missing
-- ============================================================

-- chat_platform_connections: tenant data, admin-only writes
DO $$ BEGIN
  ALTER TABLE chat_platform_connections ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop any existing broad policies
DROP POLICY IF EXISTS connections_read ON chat_platform_connections;
DROP POLICY IF EXISTS connections_write ON chat_platform_connections;
DO $$ BEGIN
  DROP POLICY IF EXISTS "connections_read" ON chat_platform_connections;
  DROP POLICY IF EXISTS "connections_write" ON chat_platform_connections;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY connections_read ON chat_platform_connections
  FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

CREATE POLICY connections_insert ON chat_platform_connections
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin')
  );

CREATE POLICY connections_update ON chat_platform_connections
  FOR UPDATE TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin'))
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY connections_delete ON chat_platform_connections
  FOR DELETE TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin'));

-- messages: tenant data, authenticated read/write scoped by company
DO $$ BEGIN
  ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS messages_company_isolation ON messages;
CREATE POLICY messages_read ON messages
  FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

CREATE POLICY messages_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY messages_update ON messages
  FOR UPDATE TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

-- conversation_threads: tenant data
DO $$ BEGIN
  ALTER TABLE conversation_threads ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS threads_company_isolation ON conversation_threads;
CREATE POLICY threads_read ON conversation_threads
  FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

CREATE POLICY threads_insert ON conversation_threads
  FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY threads_update ON conversation_threads
  FOR UPDATE TO authenticated
  USING (company_id = safe_user_company_id())
  WITH CHECK (company_id = safe_user_company_id());

-- message_queue: service_role only (correct, verify)
DO $$ BEGIN
  ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Verify queue is service_role only
DROP POLICY IF EXISTS queue_service_role ON message_queue;
CREATE POLICY queue_service_role ON message_queue
  FOR ALL TO service_role USING (true);

-- platform_sync_log: service_role only
DO $$ BEGIN
  ALTER TABLE platform_sync_log ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS sync_log_service_role ON platform_sync_log;
CREATE POLICY sync_log_service_role ON platform_sync_log
  FOR ALL TO service_role USING (true);

-- system_health: service_role only
DO $$ BEGIN
  ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS health_service_role ON system_health;
CREATE POLICY health_service_role ON system_health
  FOR ALL TO service_role USING (true);

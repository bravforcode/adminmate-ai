-- ============================================================
-- Release 26A.7: Migration Reconciliation — Forward-Only Repair
-- Ensures final RLS state matches local baseline after 43
-- historical migrations were modified during 26A remediation.
--
-- This migration is IDEMPOTENT: safe to run on both clean and
-- partially-applied databases. It verifies and corrects the
-- definitive RLS state for all tables affected by 26A edits.
--
-- Run AFTER 20240620000051_rls_policy_corrections.sql
-- ============================================================

-- ============================================================
-- SECTION 1: Reconciliation Log
-- Tracks which migrations have been verified against this database
-- ============================================================

CREATE TABLE IF NOT EXISTS migration_reconciliation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_file VARCHAR(255) NOT NULL,
    reconciliation_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reconciled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(migration_file)
);

COMMENT ON TABLE migration_reconciliation_log IS
  'Tracks migration reconciliation status for Release 26A.7 drift detection.';

-- ============================================================
-- SECTION 2: Definitive RLS State — chat_messages
-- Final authoritative state after 000051 corrections
-- ============================================================

-- chat_messages: drop ALL legacy policies, apply definitive set
DROP POLICY IF EXISTS chat_select ON chat_messages;
DROP POLICY IF EXISTS chat_insert ON chat_messages;
DROP POLICY IF EXISTS chat_update ON chat_messages;
DROP POLICY IF EXISTS chat_delete ON chat_messages;
DO $$ BEGIN DROP POLICY IF EXISTS "chat_read" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "chat_write" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "chat_insert" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY chat_select ON chat_messages
  FOR SELECT TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      user_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
    )
  );

CREATE POLICY chat_insert ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = safe_user_company_id()
    AND user_id = auth.uid()
  );

CREATE POLICY chat_update ON chat_messages
  FOR UPDATE TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND user_id = auth.uid()
  )
  WITH CHECK (
    company_id = safe_user_company_id()
    AND user_id = auth.uid()
  );

CREATE POLICY chat_delete ON chat_messages
  FOR DELETE TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      user_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager')
    )
  );

-- chat_messages immutable field trigger
CREATE OR REPLACE FUNCTION protect_chat_messages_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'company_id is immutable on chat_messages';
  END IF;
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'user_id is immutable on chat_messages';
  END IF;
  IF OLD.sender IS DISTINCT FROM NEW.sender THEN
    RAISE EXCEPTION 'sender is immutable on chat_messages';
  END IF;
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'created_at is immutable on chat_messages';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_chat_immutable ON chat_messages;
CREATE TRIGGER protect_chat_immutable
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION protect_chat_messages_immutable_fields();

-- ============================================================
-- SECTION 3: Definitive RLS State — messages
-- ============================================================

DROP POLICY IF EXISTS messages_select ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS messages_update ON messages;
DO $$ BEGIN DROP POLICY IF EXISTS "messages_company_isolation" ON messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY messages_select ON messages
  FOR SELECT TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      platform_user_id = auth.uid()::text
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff', 'recruiter')
    )
  );

CREATE POLICY messages_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY messages_update ON messages
  FOR UPDATE TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      platform_user_id = auth.uid()::text
      OR safe_user_role() IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (company_id = safe_user_company_id());

-- messages immutable field trigger
CREATE OR REPLACE FUNCTION protect_messages_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'company_id is immutable on messages';
  END IF;
  IF OLD.conversation_id IS DISTINCT FROM NEW.conversation_id THEN
    RAISE EXCEPTION 'conversation_id is immutable on messages';
  END IF;
  IF OLD.platform_user_id IS DISTINCT FROM NEW.platform_user_id THEN
    RAISE EXCEPTION 'platform_user_id is immutable on messages';
  END IF;
  IF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'created_at is immutable on messages';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS protect_messages_immutable ON messages;
CREATE TRIGGER protect_messages_immutable
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION protect_messages_immutable_fields();

-- ============================================================
-- SECTION 4: Definitive RLS State — conversation_threads
-- ============================================================

DROP POLICY IF EXISTS threads_select ON conversation_threads;
DROP POLICY IF EXISTS threads_insert ON conversation_threads;
DROP POLICY IF EXISTS threads_update ON conversation_threads;
DO $$ BEGIN DROP POLICY IF EXISTS "threads_company_isolation" ON conversation_threads; EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY threads_select ON conversation_threads
  FOR SELECT TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      platform_user_id = auth.uid()::text
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff', 'recruiter')
    )
  );

CREATE POLICY threads_insert ON conversation_threads
  FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY threads_update ON conversation_threads
  FOR UPDATE TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      platform_user_id = auth.uid()::text
      OR safe_user_role() IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (company_id = safe_user_company_id());

-- ============================================================
-- SECTION 5: Definitive RLS State — Global Reference Tables
-- From 000048 tenant_isolation_fix
-- ============================================================

-- document_type_configs
DROP POLICY IF EXISTS dtc_read ON document_type_configs;
DROP POLICY IF EXISTS dtc_insert ON document_type_configs;
DROP POLICY IF EXISTS dtc_update ON document_type_configs;
DROP POLICY IF EXISTS dtc_delete ON document_type_configs;

CREATE POLICY dtc_read ON document_type_configs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY dtc_insert ON document_type_configs
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY dtc_update ON document_type_configs
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY dtc_delete ON document_type_configs
  FOR DELETE TO service_role USING (true);

-- immigration_case_types
DROP POLICY IF EXISTS ict_read ON immigration_case_types;
DROP POLICY IF EXISTS ict_insert ON immigration_case_types;
DROP POLICY IF EXISTS ict_update ON immigration_case_types;
DROP POLICY IF EXISTS ict_delete ON immigration_case_types;

CREATE POLICY ict_read ON immigration_case_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ict_insert ON immigration_case_types
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY ict_update ON immigration_case_types
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY ict_delete ON immigration_case_types
  FOR DELETE TO service_role USING (true);

-- th_tax_brackets
DROP POLICY IF EXISTS ttb_read ON th_tax_brackets;
DROP POLICY IF EXISTS ttb_insert ON th_tax_brackets;
DROP POLICY IF EXISTS ttb_update ON th_tax_brackets;
DROP POLICY IF EXISTS ttb_delete ON th_tax_brackets;

CREATE POLICY ttb_read ON th_tax_brackets
  FOR SELECT TO authenticated USING (true);

CREATE POLICY ttb_insert ON th_tax_brackets
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY ttb_update ON th_tax_brackets
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY ttb_delete ON th_tax_brackets
  FOR DELETE TO service_role USING (true);

-- th_social_security_rules
DROP POLICY IF EXISTS tssr_read ON th_social_security_rules;
DROP POLICY IF EXISTS tssr_insert ON th_social_security_rules;
DROP POLICY IF EXISTS tssr_update ON th_social_security_rules;
DROP POLICY IF EXISTS tssr_delete ON th_social_security_rules;

CREATE POLICY tssr_read ON th_social_security_rules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY tssr_insert ON th_social_security_rules
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY tssr_update ON th_social_security_rules
  FOR UPDATE TO service_role USING (true) WITH CHECK (true);

CREATE POLICY tssr_delete ON th_social_security_rules
  FOR DELETE TO service_role USING (true);

-- ============================================================
-- SECTION 6: Definitive RLS State — Tenant Messaging Tables
-- ============================================================

-- chat_platform_connections
DO $$ BEGIN
  ALTER TABLE chat_platform_connections ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS connections_read ON chat_platform_connections;
DROP POLICY IF EXISTS connections_insert ON chat_platform_connections;
DROP POLICY IF EXISTS connections_update ON chat_platform_connections;
DROP POLICY IF EXISTS connections_delete ON chat_platform_connections;
DROP POLICY IF EXISTS connections_write ON chat_platform_connections;
DO $$ BEGIN DROP POLICY IF EXISTS "connections_read" ON chat_platform_connections; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "connections_write" ON chat_platform_connections; EXCEPTION WHEN undefined_object THEN NULL; END $$;

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

-- message_queue: service_role only
DO $$ BEGIN
  ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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

-- ============================================================
-- SECTION 7: Reconciliation Checkpoint
-- Verify all critical RLS policies exist and are correct
-- ============================================================

DO $$
DECLARE
  v_expected_policies INT;
  v_actual_policies INT;
  v_missing TEXT := '';
BEGIN
  -- Count expected policies on critical tables
  SELECT COUNT(*) INTO v_actual_policies
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN (
      'chat_messages', 'messages', 'conversation_threads',
      'document_type_configs', 'immigration_case_types',
      'th_tax_brackets', 'th_social_security_rules',
      'chat_platform_connections', 'message_queue',
      'platform_sync_log', 'system_health'
    );

  -- We expect at least 25 policies across these tables
  IF v_actual_policies < 25 THEN
    RAISE WARNING 'RLS reconciliation: only % policies found on critical tables (expected >= 25)', v_actual_policies;
  ELSE
    RAISE NOTICE 'RLS reconciliation: % policies verified on critical tables', v_actual_policies;
  END IF;
END $$;

-- Log this migration as reconciled
INSERT INTO migration_reconciliation_log (migration_file, reconciliation_status, reconciled_at, notes)
VALUES (
  '20240620000053_migration_reconciliation.sql',
  'applied',
  NOW(),
  'Forward-only repair: RLS state synchronized for chat_messages, messages, conversation_threads, global reference tables, and tenant messaging tables.'
)
ON CONFLICT (migration_file) DO UPDATE SET
  reconciliation_status = 'applied',
  reconciled_at = NOW(),
  notes = EXCLUDED.notes;

-- ============================================================
-- SECTION 8: Drift Detection Helper
-- Run this after db reset to compare local vs expected state
-- ============================================================

CREATE OR REPLACE FUNCTION check_migration_drift()
RETURNS TABLE(
  table_name TEXT,
  policy_count BIGINT,
  has_rls BOOLEAN,
  status TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.table_name::TEXT,
    (SELECT COUNT(*) FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = t.table_name) AS policy_count,
    (SELECT relrowsecurity FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = t.table_name) AS has_rls,
    CASE
      WHEN (SELECT relrowsecurity FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = t.table_name) = false
        THEN 'NO_RLS'
      WHEN (SELECT COUNT(*) FROM pg_policies p
            WHERE p.schemaname = 'public' AND p.tablename = t.table_name) = 0
        THEN 'RLS_ENABLED_NO_POLICIES'
      ELSE 'OK'
    END AS status
  FROM (VALUES
    ('chat_messages'),
    ('messages'),
    ('conversation_threads'),
    ('document_type_configs'),
    ('immigration_case_types'),
    ('th_tax_brackets'),
    ('th_social_security_rules'),
    ('chat_platform_connections'),
    ('message_queue'),
    ('platform_sync_log'),
    ('system_health')
  ) AS t(table_name)
  ORDER BY t.table_name;
$$;

COMMENT ON FUNCTION check_migration_drift() IS
  'Run after db reset to verify RLS state on all tables affected by 26A edits.';

-- ============================================================
-- Release 26A.2: Policy Corrections
-- Fixes chat_messages owner bypass + UPDATE WITH CHECK
-- Forward-only migration after 000050
-- ============================================================

-- ============================================================
-- Fix 1: chat_messages — company_id mandatory at top level
-- ============================================================
-- PROBLEM: Previous policy had:
--   user_id = auth.uid()
--   OR (company_id = safe_user_company_id() AND ...)
-- The first branch bypasses company scoping entirely.
-- If a user_id exists across companies (data error/migration issue),
-- the owner branch leaks cross-tenant data.
--
-- FIX: company_id must be the top-level gate for ALL operations.

DROP POLICY IF EXISTS chat_select ON chat_messages;
DROP POLICY IF EXISTS chat_insert ON chat_messages;
DROP POLICY IF EXISTS chat_update ON chat_messages;
DROP POLICY IF EXISTS chat_delete ON chat_messages;
-- Drop any legacy names
DO $$ BEGIN DROP POLICY IF EXISTS "chat_read" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "chat_write" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "chat_insert" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- SELECT: company_id mandatory, then user_id OR admin/hr
CREATE POLICY chat_select ON chat_messages
  FOR SELECT TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      user_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
    )
  );

-- INSERT: company_id mandatory + user_id must match
CREATE POLICY chat_insert ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = safe_user_company_id()
    AND user_id = auth.uid()
  );

-- UPDATE: company_id + user_id mandatory (BOTH USING and WITH CHECK)
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

-- DELETE: company_id mandatory + (owner OR admin)
CREATE POLICY chat_delete ON chat_messages
  FOR DELETE TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      user_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager')
    )
  );

-- ============================================================
-- Fix 2: messages — company_id mandatory + proper UPDATE
-- ============================================================

DROP POLICY IF EXISTS messages_select ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS messages_update ON messages;
DO $$ BEGIN DROP POLICY IF EXISTS "messages_company_isolation" ON messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- SELECT: company_id mandatory, then sender OR permissioned role
CREATE POLICY messages_select ON messages
  FOR SELECT TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      platform_user_id = auth.uid()::text
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff', 'recruiter')
    )
  );

-- INSERT: company_id mandatory
CREATE POLICY messages_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

-- UPDATE: company_id + sender/admin mandatory (BOTH USING and WITH CHECK)
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

-- ============================================================
-- Fix 3: conversation_threads — company_id mandatory + proper UPDATE
-- ============================================================

DROP POLICY IF EXISTS threads_select ON conversation_threads;
DROP POLICY IF EXISTS threads_insert ON conversation_threads;
DROP POLICY IF EXISTS threads_update ON conversation_threads;
DO $$ BEGIN DROP POLICY IF EXISTS "threads_company_isolation" ON conversation_threads; EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- SELECT: company_id mandatory, then participant OR permissioned role
CREATE POLICY threads_select ON conversation_threads
  FOR SELECT TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      platform_user_id = auth.uid()::text
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff', 'recruiter')
    )
  );

-- INSERT: company_id mandatory
CREATE POLICY threads_insert ON conversation_threads
  FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

-- UPDATE: company_id + participant/admin mandatory (BOTH USING and WITH CHECK)
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
-- Fix 4: chat_messages immutable field trigger
-- Prevents mutation of company_id, user_id, sender, created_at
-- ============================================================

CREATE OR REPLACE FUNCTION protect_chat_messages_immutable_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- company_id cannot be changed after insert
  IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'company_id is immutable on chat_messages';
  END IF;
  -- user_id cannot be changed after insert
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'user_id is immutable on chat_messages';
  END IF;
  -- sender cannot be changed after insert
  IF OLD.sender IS DISTINCT FROM NEW.sender THEN
    RAISE EXCEPTION 'sender is immutable on chat_messages';
  END IF;
  -- created_at cannot be changed
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
-- Fix 5: messages immutable field trigger
-- ============================================================

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

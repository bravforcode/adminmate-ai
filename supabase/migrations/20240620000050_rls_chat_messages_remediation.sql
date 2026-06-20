-- ============================================================
-- Release 26A.1: RLS Proof — Policy Remediation
-- Fixes chat_messages, messages, conversation_threads
-- with resource-level privacy controls
-- ============================================================

-- ============================================================
-- chat_messages: already has user_id scoping from 000004
-- Verify and tighten: no cross-user access, no cross-company
-- ============================================================

-- Current state from 000004_hardened_rls:
-- chat_read: user_id = auth.uid() OR role IN ('admin','hr')
-- chat_write: user_id = auth.uid()
-- These are already correct. Admin/HR can read all chats in their
-- company (via user_profiles.company_id check), but the policy
-- uses user_id directly, not company_id. Let's add company scoping.

DROP POLICY IF EXISTS chat_read ON chat_messages;
DROP POLICY IF EXISTS chat_write ON chat_messages;
-- Also drop any legacy policy names
DO $$ BEGIN DROP POLICY IF EXISTS "chat_read" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "chat_write" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN DROP POLICY IF EXISTS "chat_insert" ON chat_messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- SELECT: own messages + admin/HR can read company chat
CREATE POLICY chat_select ON chat_messages
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      company_id = safe_user_company_id()
      AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
    )
  );

-- INSERT: only own messages, must be in own company
CREATE POLICY chat_insert ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = safe_user_company_id()
  );

-- UPDATE: only own messages
CREATE POLICY chat_update ON chat_messages
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: only own messages or admin/hr
CREATE POLICY chat_delete ON chat_messages
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      company_id = safe_user_company_id()
      AND safe_user_role() IN ('admin', 'hr_manager')
    )
  );

-- ============================================================
-- messages: add resource-level privacy
-- Current: company_id scoping only
-- Add: sender ownership, participant scope
-- ============================================================

DROP POLICY IF EXISTS messages_read ON messages;
DROP POLICY IF EXISTS messages_insert ON messages;
DROP POLICY IF EXISTS messages_update ON messages;
DO $$ BEGIN DROP POLICY IF EXISTS "messages_company_isolation" ON messages; EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- SELECT: company members can read messages they sent or received
-- Admin/HR can read all company messages
CREATE POLICY messages_select ON messages
  FOR SELECT TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      -- Sender can always read own messages
      platform_user_id = auth.uid()::text
      -- Admin/HR can read all company messages
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
      -- Recruiter can read messages in their scope
      OR safe_user_role() = 'recruiter'
    )
  );

-- INSERT: must be in own company
CREATE POLICY messages_insert ON messages
  FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

-- UPDATE: only own messages or admin
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
-- conversation_threads: add resource-level privacy
-- ============================================================

DROP POLICY IF EXISTS threads_read ON conversation_threads;
DROP POLICY IF EXISTS threads_insert ON conversation_threads;
DROP POLICY IF EXISTS threads_update ON conversation_threads;
DO $$ BEGIN DROP POLICY IF EXISTS "threads_company_isolation" ON conversation_threads; EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- SELECT: company members can read threads they participate in
-- Admin/HR can read all company threads
CREATE POLICY threads_select ON conversation_threads
  FOR SELECT TO authenticated
  USING (
    company_id = safe_user_company_id()
    AND (
      -- Thread participant can read
      platform_user_id = auth.uid()::text
      -- Admin/HR can read all
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
      OR safe_user_role() = 'recruiter'
    )
  );

-- INSERT: must be in own company
CREATE POLICY threads_insert ON conversation_threads
  FOR INSERT TO authenticated
  WITH CHECK (company_id = safe_user_company_id());

-- UPDATE: participant or admin
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

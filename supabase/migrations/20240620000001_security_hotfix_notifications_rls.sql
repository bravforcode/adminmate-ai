-- RELEASE 1 — Task 1: Security Hotfix
-- Tighten notifications INSERT policy: user_id + company_id scoping.
-- Previous state: user_id = auth.uid() (from 20240104000001)
-- New state: user_id = auth.uid() AND company_id = safe_user_company_id()
-- Edge functions run as service_role (bypass RLS) so they are unaffected.

DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_insert_company_scoped" ON notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND company_id = safe_user_company_id()
  );

-- Verify: a cross-company insert attempt should fail.
-- (Tested in unit test, not runnable in migration)

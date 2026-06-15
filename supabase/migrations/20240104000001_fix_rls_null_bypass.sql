-- FIX P0: Remove RLS NULL company bypass.
-- Previously: (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL)
-- This allowed new users WITHOUT a profile to see ALL companies' data.
-- New policies require a non-NULL company_id match — unauthenticated or
-- profile-less users get zero rows (empty arrays), which is the intended
-- behaviour described in the original hardened_rls.sql header comment.

-- ============== JOBS ==============
DROP POLICY IF EXISTS "jobs_read" ON jobs;
CREATE POLICY "jobs_read" ON jobs FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== CANDIDATES ==============
DROP POLICY IF EXISTS "candidates_read" ON candidates;
CREATE POLICY "candidates_read" ON candidates FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== APPLICATIONS ==============
DROP POLICY IF EXISTS "applications_read" ON applications;
CREATE POLICY "applications_read" ON applications FOR SELECT TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
  );

-- ============== DOCUMENTS ==============
DROP POLICY IF EXISTS "documents_read" ON documents;
CREATE POLICY "documents_read" ON documents FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== INTERVIEWS ==============
DROP POLICY IF EXISTS "interviews_read" ON interviews;
CREATE POLICY "interviews_read" ON interviews FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== OFFERS ==============
DROP POLICY IF EXISTS "offers_read" ON offers;
CREATE POLICY "offers_read" ON offers FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== ONBOARDING_CHECKLISTS ==============
DROP POLICY IF EXISTS "onboarding_read" ON onboarding_checklists;
CREATE POLICY "onboarding_read" ON onboarding_checklists FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id());

-- ============== ONBOARDING_TASKS ==============
DROP POLICY IF EXISTS "onboarding_tasks_read" ON onboarding_tasks;
CREATE POLICY "onboarding_tasks_read" ON onboarding_tasks FOR SELECT TO authenticated
  USING (
    checklist_id IN (SELECT id FROM onboarding_checklists WHERE company_id = safe_user_company_id())
  );

-- ============== CV_DOCUMENTS ==============
DROP POLICY IF EXISTS "cv_read" ON cv_documents;
CREATE POLICY "cv_read" ON cv_documents FOR SELECT TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
  );

-- FIX P0: Notifications INSERT policy — users may only insert notifications for themselves.
DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

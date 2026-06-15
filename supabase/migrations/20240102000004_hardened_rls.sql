-- Production-hardened RLS: company-scoped, never 403 for valid users.
-- A user can only see/modify rows belonging to their own company_id.
-- New users (no company yet) get a NULL company_id and can still sign up,
-- create a company, and set their profile.queries against company-scoped
-- tables simply return empty arrays.

CREATE OR REPLACE FUNCTION safe_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION safe_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(role, 'member') FROM user_profiles WHERE id = auth.uid() LIMIT 1
$$;

-- ============== JOBS ==============
DROP POLICY IF EXISTS "jobs_read" ON jobs;
DROP POLICY IF EXISTS "jobs_write" ON jobs;
CREATE POLICY "jobs_read" ON jobs FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "jobs_write" ON jobs FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- ============== CANDIDATES ==============
DROP POLICY IF EXISTS "candidates_read" ON candidates;
DROP POLICY IF EXISTS "candidates_write" ON candidates;
CREATE POLICY "candidates_read" ON candidates FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "candidates_write" ON candidates FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'));

-- ============== APPLICATIONS ==============
DROP POLICY IF EXISTS "applications_read" ON applications;
DROP POLICY IF EXISTS "applications_write" ON applications;
CREATE POLICY "applications_read" ON applications FOR SELECT TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    OR safe_user_company_id() IS NULL
  );
CREATE POLICY "applications_write" ON applications FOR ALL TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr','recruiter')
  )
  WITH CHECK (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr','recruiter')
  );

-- ============== DOCUMENTS ==============
DROP POLICY IF EXISTS "documents_read" ON documents;
DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_read" ON documents FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "documents_write" ON documents FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- ============== INTERVIEWS ==============
DROP POLICY IF EXISTS "interviews_read" ON interviews;
DROP POLICY IF EXISTS "interviews_write" ON interviews;
CREATE POLICY "interviews_read" ON interviews FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "interviews_write" ON interviews FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr','recruiter'));

-- ============== OFFERS ==============
DROP POLICY IF EXISTS "offers_read" ON offers;
DROP POLICY IF EXISTS "offers_write" ON offers;
CREATE POLICY "offers_read" ON offers FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "offers_write" ON offers FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- ============== ONBOARDING_CHECKLISTS ==============
DROP POLICY IF EXISTS "onboarding_read" ON onboarding_checklists;
DROP POLICY IF EXISTS "onboarding_write" ON onboarding_checklists;
CREATE POLICY "onboarding_read" ON onboarding_checklists FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "onboarding_write" ON onboarding_checklists FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'))
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- ============== ONBOARDING_TASKS ==============
DROP POLICY IF EXISTS "onboarding_tasks_read" ON onboarding_tasks;
DROP POLICY IF EXISTS "onboarding_tasks_write" ON onboarding_tasks;
CREATE POLICY "onboarding_tasks_read" ON onboarding_tasks FOR SELECT TO authenticated
  USING (
    checklist_id IN (SELECT id FROM onboarding_checklists WHERE company_id = safe_user_company_id())
    OR safe_user_company_id() IS NULL
  );
CREATE POLICY "onboarding_tasks_write" ON onboarding_tasks FOR ALL TO authenticated
  USING (
    checklist_id IN (SELECT id FROM onboarding_checklists WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr')
  )
  WITH CHECK (
    checklist_id IN (SELECT id FROM onboarding_checklists WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr')
  );

-- ============== CV_DOCUMENTS ==============
DROP POLICY IF EXISTS "cv_read" ON cv_documents;
DROP POLICY IF EXISTS "cv_write" ON cv_documents;
CREATE POLICY "cv_read" ON cv_documents FOR SELECT TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    OR safe_user_company_id() IS NULL
  );
CREATE POLICY "cv_write" ON cv_documents FOR ALL TO authenticated
  USING (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr','recruiter')
  )
  WITH CHECK (
    candidate_id IN (SELECT id FROM candidates WHERE company_id = safe_user_company_id())
    AND safe_user_role() IN ('admin','hr','recruiter')
  );

-- ============== CHAT_MESSAGES ==============
DROP POLICY IF EXISTS "chat_read" ON chat_messages;
DROP POLICY IF EXISTS "chat_write" ON chat_messages;
CREATE POLICY "chat_read" ON chat_messages FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR safe_user_role() IN ('admin','hr'));
CREATE POLICY "chat_write" ON chat_messages FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============== NOTIFICATIONS ==============
DROP POLICY IF EXISTS "notif_read" ON notifications;
DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_read" ON notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR safe_user_role() = 'admin');
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============== PERFORMANCE INDEXES ==============
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_company_id ON jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_candidates_company_id ON candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_interviews_company_id ON interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_interviews_scheduled_at ON interviews(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_offers_company_id ON offers(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_company_id ON onboarding_checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_checklist_id ON onboarding_tasks(checklist_id);
CREATE INDEX IF NOT EXISTS idx_cv_documents_candidate_id ON cv_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at DESC);

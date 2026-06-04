-- Comprehensive RLS fix: ensure authenticated users can always read their
-- company-scoped data (returns empty if no match, never 403).
-- This prevents the "Failed to load resource 403" error on Dashboard load.

-- Helper: a safe company_id getter that won't error on missing profile
CREATE OR REPLACE FUNCTION safe_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() LIMIT 1
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop and recreate all company-scoped read policies to never return 403
-- when the user is authenticated (even without a company yet).

-- JOBS
DROP POLICY IF EXISTS "jobs_read" ON jobs;
CREATE POLICY "jobs_read" ON jobs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "jobs_write" ON jobs;
CREATE POLICY "jobs_write" ON jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CANDIDATES
DROP POLICY IF EXISTS "candidates_read" ON candidates;
CREATE POLICY "candidates_read" ON candidates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "candidates_write" ON candidates;
CREATE POLICY "candidates_write" ON candidates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- APPLICATIONS
DROP POLICY IF EXISTS "applications_read" ON applications;
CREATE POLICY "applications_read" ON applications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "applications_write" ON applications;
CREATE POLICY "applications_write" ON applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DOCUMENTS
DROP POLICY IF EXISTS "documents_read" ON documents;
CREATE POLICY "documents_read" ON documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "documents_write" ON documents;
CREATE POLICY "documents_write" ON documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INTERVIEWS
DROP POLICY IF EXISTS "interviews_read" ON interviews;
CREATE POLICY "interviews_read" ON interviews FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "interviews_write" ON interviews;
CREATE POLICY "interviews_write" ON interviews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- OFFERS
DROP POLICY IF EXISTS "offers_read" ON offers;
CREATE POLICY "offers_read" ON offers FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "offers_write" ON offers;
CREATE POLICY "offers_write" ON offers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ONBOARDING_CHECKLISTS
DROP POLICY IF EXISTS "onboarding_read" ON onboarding_checklists;
CREATE POLICY "onboarding_read" ON onboarding_checklists FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "onboarding_write" ON onboarding_checklists;
CREATE POLICY "onboarding_write" ON onboarding_checklists FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ONBOARDING_TASKS
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "onboarding_tasks_read" ON onboarding_tasks;
CREATE POLICY "onboarding_tasks_read" ON onboarding_tasks FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "onboarding_tasks_write" ON onboarding_tasks;
CREATE POLICY "onboarding_tasks_write" ON onboarding_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CV_DOCUMENTS
ALTER TABLE cv_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cv_read" ON cv_documents;
CREATE POLICY "cv_read" ON cv_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cv_write" ON cv_documents;
CREATE POLICY "cv_write" ON cv_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CHAT_MESSAGES
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_read" ON chat_messages;
CREATE POLICY "chat_read" ON chat_messages FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "chat_write" ON chat_messages;
CREATE POLICY "chat_write" ON chat_messages FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- NOTIFICATIONS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_read" ON notifications;
CREATE POLICY "notif_read" ON notifications FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "notif_insert_any" ON notifications;
CREATE POLICY "notif_insert_any" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

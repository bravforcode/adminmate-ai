ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "companies_read" ON companies FOR SELECT USING (id = get_user_company_id());
CREATE POLICY "companies_write" ON companies FOR ALL USING (id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_read" ON user_profiles FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin" ON user_profiles FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_read" ON jobs FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "jobs_write" ON jobs FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "candidates_read" ON candidates FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "candidates_write" ON candidates FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE cv_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cv_read" ON cv_documents FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "cv_write" ON cv_documents FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "apps_read" ON applications FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "apps_write" ON applications FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "interviews_read" ON interviews FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "interviews_write" ON interviews FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offers_read" ON offers FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "offers_write" ON offers FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "docs_read" ON documents FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "docs_write" ON documents FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE onboarding_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklists_read" ON onboarding_checklists FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "checklists_write" ON onboarding_checklists FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_read" ON onboarding_tasks FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "tasks_write" ON onboarding_tasks FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_read" ON chat_messages FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "chat_insert" ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_read" ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notif_update" ON notifications FOR UPDATE USING (user_id = auth.uid());

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_read" ON audit_logs FOR SELECT USING (company_id = get_user_company_id());

ALTER TABLE chat_platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "connections_read" ON chat_platform_connections FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "connections_write" ON chat_platform_connections FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

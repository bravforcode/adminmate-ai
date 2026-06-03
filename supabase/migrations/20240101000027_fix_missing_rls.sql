-- Fix missing RLS on tables that don't have policies yet

ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_read" ON ai_usage_log FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "ai_usage_insert" ON ai_usage_log FOR INSERT WITH CHECK (company_id = get_user_company_id());

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rate_limits_read" ON rate_limits FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "rate_limits_all" ON rate_limits FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_read" ON subscriptions FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "subscriptions_write" ON subscriptions FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

ALTER TABLE pdpa_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdpa_consents_read" ON pdpa_consents FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "pdpa_consents_insert" ON pdpa_consents FOR INSERT WITH CHECK (company_id = get_user_company_id());

ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deletion_read" ON data_deletion_requests FOR SELECT USING (company_id = get_user_company_id());
CREATE POLICY "deletion_insert" ON data_deletion_requests FOR INSERT WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "deletion_update" ON data_deletion_requests FOR UPDATE USING (company_id = get_user_company_id() AND is_admin_or_hr());

-- Fix audit_logs: add INSERT policy so systems can log
CREATE POLICY "audit_insert" ON audit_logs FOR INSERT WITH CHECK (company_id = get_user_company_id());

-- Fix notifications: tighten INSERT policy
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (
  user_id IS NOT NULL AND company_id IS NOT NULL
);

-- Fix chat_platform_connections RLS (was missing)
ALTER TABLE chat_platform_connections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "connections_read" ON chat_platform_connections;
CREATE POLICY "connections_read" ON chat_platform_connections FOR SELECT USING (company_id = get_user_company_id());
DROP POLICY IF EXISTS "connections_write" ON chat_platform_connections;
CREATE POLICY "connections_write" ON chat_platform_connections FOR ALL USING (company_id = get_user_company_id() AND is_admin_or_hr());

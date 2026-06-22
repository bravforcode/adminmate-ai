-- ============================================================
-- Release 26A.3: Fix observability tables missing RLS
-- Forward-only repair for tables created without RLS
-- ============================================================

-- audit_log_retention
ALTER TABLE audit_log_retention ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_retention_read ON audit_log_retention FOR SELECT TO authenticated USING (company_id = safe_user_company_id());
CREATE POLICY audit_retention_insert ON audit_log_retention FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY audit_retention_update ON audit_log_retention FOR UPDATE TO service_role USING (true) WITH CHECK (true);

-- idempotency_keys
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY idempotency_read ON idempotency_keys FOR SELECT TO authenticated USING (company_id = safe_user_company_id());
CREATE POLICY idempotency_insert ON idempotency_keys FOR INSERT TO service_role WITH CHECK (true);

-- dead_letter_queue
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY dlq_read ON dead_letter_queue FOR SELECT TO authenticated USING (company_id = safe_user_company_id());
CREATE POLICY dlq_insert ON dead_letter_queue FOR INSERT TO service_role WITH CHECK (true);

-- usage_metrics
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY usage_read ON usage_metrics FOR SELECT TO authenticated USING (company_id = safe_user_company_id());
CREATE POLICY usage_insert ON usage_metrics FOR INSERT TO service_role WITH CHECK (true);

-- tenant_quotas
ALTER TABLE tenant_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_quotas_read ON tenant_quotas FOR SELECT TO authenticated USING (company_id = safe_user_company_id());
CREATE POLICY tenant_quotas_insert ON tenant_quotas FOR INSERT TO service_role WITH CHECK (true);

-- cost_attribution
ALTER TABLE cost_attribution ENABLE ROW LEVEL SECURITY;
CREATE POLICY cost_read ON cost_attribution FOR SELECT TO authenticated USING (company_id = safe_user_company_id());
CREATE POLICY cost_insert ON cost_attribution FOR INSERT TO service_role WITH CHECK (true);

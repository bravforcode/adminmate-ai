-- ============================================================
-- Release 14: Integration Adapters
-- ============================================================

-- 1. Integration Providers (global catalog)
CREATE TABLE IF NOT EXISTS integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Integration Configs (per-company)
CREATE TABLE IF NOT EXISTS integration_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES integration_providers(id),
  config_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT false,
  config_status VARCHAR(30) NOT NULL DEFAULT 'not_configured',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, provider_id)
);

-- 3. Integration Sync Jobs
CREATE TABLE IF NOT EXISTS integration_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES integration_providers(id),
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Integration Event Logs
CREATE TABLE IF NOT EXISTS integration_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES integration_providers(id),
  event_type VARCHAR(100) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  payload_hash VARCHAR(64),
  status VARCHAR(30) NOT NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE integration_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_event_logs ENABLE ROW LEVEL SECURITY;

-- integration_providers: public read (global catalog)
CREATE POLICY integration_providers_read ON integration_providers
  FOR SELECT USING (true);

-- integration_configs: company members read; integration_write roles write
CREATE POLICY integration_configs_read ON integration_configs
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY integration_configs_insert ON integration_configs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND has_permission('integration', 'write')
  );

CREATE POLICY integration_configs_update ON integration_configs
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND has_permission('integration', 'write')
  );

CREATE POLICY integration_configs_delete ON integration_configs
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND has_permission('integration', 'write')
  );

-- integration_sync_jobs: company members read; integration_write roles insert
CREATE POLICY integration_sync_jobs_read ON integration_sync_jobs
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY integration_sync_jobs_insert ON integration_sync_jobs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND has_permission('integration', 'write')
  );

CREATE POLICY integration_sync_jobs_update ON integration_sync_jobs
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND has_permission('integration', 'write')
  );

-- integration_event_logs: company members read; integration_write roles insert
CREATE POLICY integration_event_logs_read ON integration_event_logs
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY integration_event_logs_insert ON integration_event_logs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND has_permission('integration', 'write')
  );

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_integration_providers_key ON integration_providers(provider_key);
CREATE INDEX IF NOT EXISTS idx_integration_providers_category ON integration_providers(category);
CREATE INDEX IF NOT EXISTS idx_integration_configs_company ON integration_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_configs_company_provider ON integration_configs(company_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_configs_status ON integration_configs(config_status);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_company ON integration_sync_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_company_provider ON integration_sync_jobs(company_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_status ON integration_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_integration_event_logs_company ON integration_event_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_event_logs_company_provider ON integration_event_logs(company_id, provider_id);
CREATE INDEX IF NOT EXISTS idx_integration_event_logs_hash ON integration_event_logs(payload_hash);

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER update_integration_configs_updated_at
  BEFORE UPDATE ON integration_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Seed Providers
-- ============================================================

INSERT INTO integration_providers (provider_key, name, category, description) VALUES
  ('google_calendar', 'Google Calendar', 'calendar', 'Sync events with Google Calendar'),
  ('microsoft_calendar', 'Microsoft Calendar', 'calendar', 'Sync events with Outlook / Microsoft 365 Calendar'),
  ('slack', 'Slack', 'messaging', 'Send notifications and messages via Slack'),
  ('teams', 'Microsoft Teams', 'messaging', 'Send notifications and messages via Microsoft Teams'),
  ('line', 'LINE', 'messaging', 'Send notifications via LINE Messaging API'),
  ('whatsapp', 'WhatsApp', 'messaging', 'Send notifications via WhatsApp Business API'),
  ('xero', 'Xero', 'accounting', 'Sync financial data with Xero'),
  ('quickbooks', 'QuickBooks', 'accounting', 'Sync financial data with QuickBooks')
ON CONFLICT (provider_key) DO NOTHING;

-- ============================================================
-- RBAC: integration permissions
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('integration', 'read',  'View integrations and sync status'),
  ('integration', 'write', 'Configure and manage integrations');

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'integration';

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'integration';

-- HR Manager: read/write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'integration';

-- HR Staff: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'integration'
  AND p.action = 'read';

-- Manager: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'integration'
  AND p.action = 'read';

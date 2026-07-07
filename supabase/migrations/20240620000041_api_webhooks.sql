-- ============================================================
-- Release 20: Public API + Webhooks + No-Code Workflow
-- API clients, hashed keys with scopes, webhook subscriptions
-- with HMAC-signed delivery, retry/backoff, and workflow engine.
-- ============================================================

-- 1. API Clients
CREATE TABLE IF NOT EXISTS api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  client_type VARCHAR(50) DEFAULT 'external',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY ac_read ON api_clients FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ac_insert ON api_clients FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ac_update ON api_clients FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ac_delete ON api_clients FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ac_company ON api_clients(company_id);
CREATE INDEX IF NOT EXISTS idx_ac_active ON api_clients(is_active);

CREATE TRIGGER update_ac_updated_at BEFORE UPDATE ON api_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. API Keys (hashed, never stored plaintext)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  key_hash VARCHAR(64) NOT NULL,
  key_prefix VARCHAR(8),
  scopes JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- API keys inherit company_id through client join; policy via subselect
CREATE POLICY ak_read ON api_keys FOR SELECT
  USING (client_id IN (SELECT id FROM api_clients WHERE company_id = safe_user_company_id()));
CREATE POLICY ak_insert ON api_keys FOR INSERT
  WITH CHECK (client_id IN (SELECT id FROM api_clients WHERE company_id = safe_user_company_id()));
CREATE POLICY ak_update ON api_keys FOR UPDATE
  USING (client_id IN (SELECT id FROM api_clients WHERE company_id = safe_user_company_id()));
CREATE POLICY ak_delete ON api_keys FOR DELETE
  USING (client_id IN (SELECT id FROM api_clients WHERE company_id = safe_user_company_id()));

CREATE INDEX IF NOT EXISTS idx_ak_client ON api_keys(client_id);
CREATE INDEX IF NOT EXISTS idx_ak_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_ak_active ON api_keys(is_active);

-- 3. Webhook Subscriptions
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
  event_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  url TEXT NOT NULL,
  secret_hash VARCHAR(64) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws_read ON webhook_subscriptions FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ws_insert ON webhook_subscriptions FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ws_update ON webhook_subscriptions FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ws_delete ON webhook_subscriptions FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ws_company ON webhook_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_ws_client ON webhook_subscriptions(client_id);
CREATE INDEX IF NOT EXISTS idx_ws_events ON webhook_subscriptions USING GIN (event_types);

CREATE TRIGGER update_ws_updated_at BEFORE UPDATE ON webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Webhook Delivery Attempts (retry queue)
CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_number INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending',
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhook_delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY wda_read ON webhook_delivery_attempts FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY wda_insert ON webhook_delivery_attempts FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY wda_update ON webhook_delivery_attempts FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY wda_delete ON webhook_delivery_attempts FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_wda_company ON webhook_delivery_attempts(company_id);
CREATE INDEX IF NOT EXISTS idx_wda_subscription ON webhook_delivery_attempts(subscription_id);
CREATE INDEX IF NOT EXISTS idx_wda_status_retry ON webhook_delivery_attempts(status, next_retry_at);

-- 5. Workflow Definitions (no-code automation)
CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(100) NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY wd_read ON workflow_definitions FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY wd_insert ON workflow_definitions FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY wd_update ON workflow_definitions FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY wd_delete ON workflow_definitions FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_wd_company ON workflow_definitions(company_id);
CREATE INDEX IF NOT EXISTS idx_wd_trigger ON workflow_definitions(trigger_type);
CREATE INDEX IF NOT EXISTS idx_wd_active ON workflow_definitions(is_active);

CREATE TRIGGER update_wd_updated_at BEFORE UPDATE ON workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Workflow Runs (execution log)
CREATE TABLE IF NOT EXISTS workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  trigger_data JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY wr_read ON workflow_runs FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY wr_insert ON workflow_runs FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY wr_update ON workflow_runs FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY wr_delete ON workflow_runs FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_wr_company ON workflow_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_wr_workflow ON workflow_runs(workflow_id);
CREATE INDEX IF NOT EXISTS idx_wr_status ON workflow_runs(status);

-- ============================================================
-- Expiry enforcement: expired keys cannot authenticate
-- ============================================================

CREATE OR REPLACE FUNCTION check_api_key_not_expired()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NOT NULL AND NEW.expires_at < NOW() THEN
    RAISE EXCEPTION 'API key has expired';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_api_key_expired
  BEFORE INSERT OR UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION check_api_key_not_expired();

-- ============================================================
-- Audit triggers
-- ============================================================

CREATE TRIGGER audit_api_clients_changes
  AFTER INSERT OR UPDATE OR DELETE ON api_clients
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_webhook_subscriptions_changes
  AFTER INSERT OR UPDATE OR DELETE ON webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_workflow_definitions_changes
  AFTER INSERT OR UPDATE OR DELETE ON workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- RBAC: api_key_read/write, webhook_read/write
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('api_key',  'read',  'View API clients and keys'),
  ('api_key',  'write', 'Create/edit/revoke API clients and keys'),
  ('webhook',  'read',  'View webhook subscriptions and deliveries'),
  ('webhook',  'write', 'Create/edit/delete webhook subscriptions');

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource IN ('api_key', 'webhook');

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource IN ('api_key', 'webhook');

-- HR Manager: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource IN ('api_key', 'webhook') AND p.action = 'read';

-- Manager: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource IN ('api_key', 'webhook') AND p.action = 'read';

-- Auditor: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource IN ('api_key', 'webhook') AND p.action = 'read';

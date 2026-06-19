-- ============================================================
-- Release 20B: Notification Center + Global Search
-- Tables: notifications_v2, notification_preferences_v2,
--         global_search_index
-- RBAC: notification_read/write, search_read
-- ============================================================

-- ============== 1. NOTIFICATIONS V2 ==============
CREATE TABLE IF NOT EXISTS notifications_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY nv2_read ON notifications_v2 FOR SELECT USING (
  company_id = safe_user_company_id() AND user_id = auth.uid()
);
CREATE POLICY nv2_insert ON notifications_v2 FOR INSERT WITH CHECK (
  company_id = safe_user_company_id()
);
CREATE POLICY nv2_update ON notifications_v2 FOR UPDATE USING (
  company_id = safe_user_company_id() AND user_id = auth.uid()
);
CREATE POLICY nv2_delete ON notifications_v2 FOR DELETE USING (
  company_id = safe_user_company_id() AND user_id = auth.uid()
);

CREATE INDEX idx_nv2_company_user ON notifications_v2(company_id, user_id);
CREATE INDEX idx_nv2_user_read ON notifications_v2(user_id, is_read);
CREATE INDEX idx_nv2_created ON notifications_v2(created_at DESC);
CREATE INDEX idx_nv2_type ON notifications_v2(notification_type);

-- ============== 2. NOTIFICATION PREFERENCES V2 ==============
CREATE TABLE IF NOT EXISTS notification_preferences_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel VARCHAR(30) NOT NULL CHECK (channel IN ('email', 'in_app', 'push')),
  notification_type VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, channel, notification_type)
);

ALTER TABLE notification_preferences_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY npv2_read ON notification_preferences_v2 FOR SELECT USING (
  company_id = safe_user_company_id() AND user_id = auth.uid()
);
CREATE POLICY npv2_insert ON notification_preferences_v2 FOR INSERT WITH CHECK (
  company_id = safe_user_company_id() AND user_id = auth.uid()
);
CREATE POLICY npv2_update ON notification_preferences_v2 FOR UPDATE USING (
  company_id = safe_user_company_id() AND user_id = auth.uid()
);
CREATE POLICY npv2_delete ON notification_preferences_v2 FOR DELETE USING (
  company_id = safe_user_company_id() AND user_id = auth.uid()
);

CREATE INDEX idx_npv2_user ON notification_preferences_v2(user_id);
CREATE INDEX idx_npv2_user_type ON notification_preferences_v2(user_id, notification_type);

CREATE TRIGGER update_npv2_updated_at BEFORE UPDATE ON notification_preferences_v2
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============== 3. GLOBAL SEARCH INDEX ==============
CREATE TABLE IF NOT EXISTS global_search_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  searchable_text TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE global_search_index ENABLE ROW LEVEL SECURITY;

CREATE POLICY gsi_read ON global_search_index FOR SELECT USING (
  company_id = safe_user_company_id()
);
CREATE POLICY gsi_insert ON global_search_index FOR INSERT WITH CHECK (
  company_id = safe_user_company_id()
);
CREATE POLICY gsi_update ON global_search_index FOR UPDATE USING (
  company_id = safe_user_company_id()
);
CREATE POLICY gsi_delete ON global_search_index FOR DELETE USING (
  company_id = safe_user_company_id()
);

CREATE INDEX idx_gsi_company_entity ON global_search_index(company_id, entity_type);
CREATE INDEX idx_gsi_company_search ON global_search_index USING gin(
  to_tsvector('english', searchable_text)
);
CREATE INDEX idx_gsi_entity_id ON global_search_index(entity_type, entity_id);

CREATE TRIGGER update_gsi_updated_at BEFORE UPDATE ON global_search_index
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============== 4. RBAC: notification + search permissions ==============
INSERT INTO permissions (resource, action, display_name) VALUES
  ('notification', 'read',   'View notifications'),
  ('notification', 'write',  'Manage notifications'),
  ('search',       'read',   'Use global search');

-- Owner: full notification + search
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND (p.resource, p.action) IN
  (('notification','read'), ('notification','write'), ('search','read'));

-- Admin: full notification + search
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND (p.resource, p.action) IN
  (('notification','read'), ('notification','write'), ('search','read'));

-- HR Manager: notification read/write + search
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND (p.resource, p.action) IN
  (('notification','read'), ('notification','write'), ('search','read'));

-- HR Staff: notification read + search
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND (p.resource, p.action) IN
  (('notification','read'), ('search','read'));

-- Recruiter: notification read + search
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'recruiter' AND (p.resource, p.action) IN
  (('notification','read'), ('search','read'));

-- Manager: notification read + search
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND (p.resource, p.action) IN
  (('notification','read'), ('search','read'));

-- Employee: notification read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND (p.resource, p.action) IN
  (('notification','read'), ('search','read'));

-- Auditor: notification read + search (read-only role)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND (p.resource, p.action) IN
  (('notification','read'), ('search','read'));

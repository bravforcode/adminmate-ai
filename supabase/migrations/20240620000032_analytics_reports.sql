-- ============================================================
-- Release 13: Analytics + Reports
-- ============================================================

-- 1. Report Definitions
CREATE TABLE IF NOT EXISTS report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  query_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, report_key)
);

-- 2. Dashboard Layouts
CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scheduled Reports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_def_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  schedule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Report Exports
CREATE TABLE IF NOT EXISTS report_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_def_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  format VARCHAR(20) NOT NULL DEFAULT 'csv',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  file_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

-- report_definitions: company members read; admin/hr write
CREATE POLICY report_definitions_read ON report_definitions
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY report_definitions_insert ON report_definitions
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  );

CREATE POLICY report_definitions_update ON report_definitions
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  );

CREATE POLICY report_definitions_delete ON report_definitions
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

-- dashboard_layouts: user owns own; HR/admin can read all for company
CREATE POLICY dashboard_layouts_read ON dashboard_layouts
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND (
      user_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
    )
  );

CREATE POLICY dashboard_layouts_insert ON dashboard_layouts
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND user_id = auth.uid()
  );

CREATE POLICY dashboard_layouts_update ON dashboard_layouts
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND (
      user_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY dashboard_layouts_delete ON dashboard_layouts
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND (
      user_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager')
    )
  );

-- scheduled_reports: company members read; admin/hr write
CREATE POLICY scheduled_reports_read ON scheduled_reports
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY scheduled_reports_insert ON scheduled_reports
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  );

CREATE POLICY scheduled_reports_update ON scheduled_reports
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  );

CREATE POLICY scheduled_reports_delete ON scheduled_reports
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

-- report_exports: company members read; creator can read own; admin/hr can create
CREATE POLICY report_exports_read ON report_exports
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND (
      created_by = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
    )
  );

CREATE POLICY report_exports_insert ON report_exports
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND created_by = auth.uid()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  );

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_report_definitions_company ON report_definitions(company_id);
CREATE INDEX idx_report_definitions_key ON report_definitions(company_id, report_key);
CREATE INDEX idx_dashboard_layouts_company ON dashboard_layouts(company_id);
CREATE INDEX idx_dashboard_layouts_user ON dashboard_layouts(user_id);
CREATE INDEX idx_scheduled_reports_company ON scheduled_reports(company_id);
CREATE INDEX idx_scheduled_reports_next_run ON scheduled_reports(next_run_at) WHERE is_active = true;
CREATE INDEX idx_report_exports_company ON report_exports(company_id);
CREATE INDEX idx_report_exports_status ON report_exports(status);
CREATE INDEX idx_report_exports_created_by ON report_exports(created_by);

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER update_report_definitions_updated_at
  BEFORE UPDATE ON report_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_layouts_updated_at
  BEFORE UPDATE ON dashboard_layouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scheduled_reports_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_report_definition_changes
  AFTER INSERT OR UPDATE OR DELETE ON report_definitions
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_scheduled_report_changes
  AFTER INSERT OR UPDATE OR DELETE ON scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_report_export_changes
  AFTER INSERT OR UPDATE OR DELETE ON report_exports
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- RBAC: analytics_reports permissions
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('analytics_reports', 'read',   'View reports and dashboards'),
  ('analytics_reports', 'write',  'Create/edit report definitions'),
  ('analytics_reports', 'export', 'Export reports to file');

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'analytics_reports';

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'analytics_reports';

-- HR Manager: read/write/export
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'analytics_reports';

-- HR Staff: read/write/export
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'analytics_reports'
  AND p.action IN ('read', 'write', 'export');

-- Manager: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'analytics_reports'
  AND p.action = 'read';

-- Employee: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'analytics_reports'
  AND p.action = 'read';

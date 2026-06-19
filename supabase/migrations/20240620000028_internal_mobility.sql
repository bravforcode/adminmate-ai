-- ============================================================
-- Release 10B: Internal Mobility + Internal Job Board
-- ============================================================

-- 1. Internal Jobs
CREATE TABLE IF NOT EXISTS internal_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  employment_type VARCHAR(50) DEFAULT 'full_time',
  status VARCHAR(30) DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Internal Applications
CREATE TABLE IF NOT EXISTS internal_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES internal_jobs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  status VARCHAR(30) DEFAULT 'submitted',
  cover_letter TEXT,
  manager_notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, job_id, employee_id)
);

-- 3. Internal Mobility Preferences
CREATE TABLE IF NOT EXISTS internal_mobility_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  preferred_departments JSONB DEFAULT '[]'::jsonb,
  preferred_locations JSONB DEFAULT '[]'::jsonb,
  open_to_remote BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id)
);

-- 4. Internal Transfer Requests
CREATE TABLE IF NOT EXISTS internal_transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES internal_applications(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  from_manager_id UUID REFERENCES auth.users(id),
  to_manager_id UUID REFERENCES auth.users(id),
  effective_date DATE,
  status VARCHAR(30) DEFAULT 'pending',
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE internal_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_mobility_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_transfer_requests ENABLE ROW LEVEL SECURITY;

-- internal_jobs: company members read, creators/admins/HR write
CREATE POLICY internal_jobs_read ON internal_jobs
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY internal_jobs_insert ON internal_jobs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  );

CREATE POLICY internal_jobs_update ON internal_jobs
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND (
      created_by = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
    )
  );

CREATE POLICY internal_jobs_delete ON internal_jobs
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

-- internal_applications
-- CRITICAL PRIVACY RULE: current manager CANNOT see employee's application
-- unless manager_notified = true or user is HR/admin.
CREATE POLICY internal_applications_read ON internal_applications
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND (
      employee_id = auth.uid()                          -- employee sees own
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')  -- HR sees all
      OR (
        safe_user_role() = 'manager'
        AND manager_notified = true                     -- manager only if opted-in
      )
    )
  );

CREATE POLICY internal_applications_insert ON internal_applications
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND employee_id = auth.uid()
  );

CREATE POLICY internal_applications_update ON internal_applications
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND (
      employee_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
    )
  );

-- internal_mobility_preferences: employee owns own prefs; HR can read for talent matching
CREATE POLICY internal_mobility_preferences_read ON internal_mobility_preferences
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND (
      employee_id = auth.uid()
      OR (is_visible = true AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff'))
    )
  );

CREATE POLICY internal_mobility_preferences_insert ON internal_mobility_preferences
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND employee_id = auth.uid()
  );

CREATE POLICY internal_mobility_preferences_update ON internal_mobility_preferences
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND employee_id = auth.uid()
  );

-- internal_transfer_requests
CREATE POLICY internal_transfer_requests_read ON internal_transfer_requests
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND (
      employee_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
      OR from_manager_id = auth.uid()
      OR to_manager_id = auth.uid()
    )
  );

CREATE POLICY internal_transfer_requests_insert ON internal_transfer_requests
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND employee_id = auth.uid()
  );

CREATE POLICY internal_transfer_requests_update ON internal_transfer_requests
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND (
      safe_user_role() IN ('admin', 'hr_manager')
      OR from_manager_id = auth.uid()
      OR to_manager_id = auth.uid()
    )
  );

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_internal_jobs_company ON internal_jobs(company_id);
CREATE INDEX idx_internal_jobs_status ON internal_jobs(status);
CREATE INDEX idx_internal_jobs_department ON internal_jobs(department_id);
CREATE INDEX idx_internal_applications_company ON internal_applications(company_id);
CREATE INDEX idx_internal_applications_job ON internal_applications(job_id);
CREATE INDEX idx_internal_applications_employee ON internal_applications(employee_id);
CREATE INDEX idx_internal_applications_status ON internal_applications(status);
CREATE INDEX idx_internal_mobility_prefs_company ON internal_mobility_preferences(company_id);
CREATE INDEX idx_internal_mobility_prefs_employee ON internal_mobility_preferences(employee_id);
CREATE INDEX idx_internal_transfer_requests_company ON internal_transfer_requests(company_id);
CREATE INDEX idx_internal_transfer_requests_employee ON internal_transfer_requests(employee_id);
CREATE INDEX idx_internal_transfer_requests_status ON internal_transfer_requests(status);
CREATE INDEX idx_internal_transfer_requests_application ON internal_transfer_requests(application_id);

-- ============================================================
-- Triggers
-- ============================================================

CREATE TRIGGER update_internal_jobs_updated_at
  BEFORE UPDATE ON internal_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_applications_updated_at
  BEFORE UPDATE ON internal_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_mobility_prefs_updated_at
  BEFORE UPDATE ON internal_mobility_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_internal_transfer_requests_updated_at
  BEFORE UPDATE ON internal_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_internal_job_changes
  AFTER INSERT OR UPDATE OR DELETE ON internal_jobs
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_internal_application_changes
  AFTER INSERT OR UPDATE OR DELETE ON internal_applications
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_internal_transfer_request_changes
  AFTER INSERT OR UPDATE OR DELETE ON internal_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- RBAC: internal_mobility permissions
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('internal_mobility', 'read',    'View internal job board'),
  ('internal_mobility', 'write',   'Create/edit internal jobs'),
  ('internal_mobility', 'approve', 'Approve internal transfers');

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'internal_mobility';

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'internal_mobility';

-- HR Manager: read/write/approve
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'internal_mobility';

-- HR Staff: read/write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'internal_mobility'
  AND p.action IN ('read', 'write');

-- Manager: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'internal_mobility'
  AND p.action = 'read';

-- Employee: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'internal_mobility'
  AND p.action = 'read';

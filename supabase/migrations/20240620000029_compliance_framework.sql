-- ============================================================
-- Release 11: Compliance Framework + Grievance + Whistleblower + Health & Safety
-- ============================================================

-- 1. Privacy Requests (GDPR/PDPA data subject requests)
CREATE TABLE IF NOT EXISTS privacy_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  request_type VARCHAR(50) NOT NULL,  -- 'access', 'rectification', 'erasure', 'portability', 'restrict_processing', 'object'
  status VARCHAR(30) DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'rejected'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,  -- 'candidate', 'application', 'employee', 'payroll', etc.
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  action VARCHAR(50) NOT NULL,  -- 'anonymize', 'delete', 'archive'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, entity_type)
);

-- 3. Legal Holds (blocks deletion/purge while active)
CREATE TABLE IF NOT EXISTS legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,  -- 'employee', 'candidate', 'payroll', 'grievance_case', etc.
  entity_id UUID NOT NULL,
  reason TEXT NOT NULL,
  placed_by UUID NOT NULL REFERENCES auth.users(id),
  placed_at TIMESTAMPTZ DEFAULT NOW(),
  released_by UUID REFERENCES auth.users(id),
  released_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'active',  -- 'active', 'released'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Grievance Cases
CREATE TABLE IF NOT EXISTS grievance_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  category VARCHAR(100) NOT NULL,  -- 'harassment', 'discrimination', 'workplace_safety', 'ethics', 'other'
  description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'open',  -- 'open', 'investigating', 'resolved', 'closed', 'escalated'
  assigned_to UUID REFERENCES auth.users(id),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Whistleblower Reports (anonymous, cannot be deanonymized)
CREATE TABLE IF NOT EXISTS whistleblower_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  anonymous_id VARCHAR(100) NOT NULL,  -- generated anonymous identifier, NOT linked to employee_id
  category VARCHAR(100) NOT NULL,  -- 'fraud', 'corruption', 'safety', 'legal_violation', 'other'
  description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'submitted',  -- 'submitted', 'under_review', 'investigating', 'resolved', 'dismissed'
  assigned_to UUID REFERENCES auth.users(id),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Health & Safety Incidents
CREATE TABLE IF NOT EXISTS health_safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id),
  incident_date DATE NOT NULL,
  location VARCHAR(255),
  description TEXT NOT NULL,
  severity VARCHAR(30) NOT NULL,  -- 'minor', 'moderate', 'serious', 'critical'
  status VARCHAR(30) DEFAULT 'reported',  -- 'reported', 'investigating', 'resolved', 'closed'
  investigated_by UUID REFERENCES auth.users(id),
  investigation_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_privacy_requests_company ON privacy_requests(company_id);
CREATE INDEX idx_privacy_requests_employee ON privacy_requests(employee_id);
CREATE INDEX idx_privacy_requests_status ON privacy_requests(status);
CREATE INDEX idx_privacy_requests_type ON privacy_requests(request_type);

CREATE INDEX idx_data_retention_company ON data_retention_policies(company_id);
CREATE INDEX idx_data_retention_active ON data_retention_policies(is_active) WHERE is_active = true;

CREATE INDEX idx_legal_holds_company ON legal_holds(company_id);
CREATE INDEX idx_legal_holds_entity ON legal_holds(entity_type, entity_id);
CREATE INDEX idx_legal_holds_active ON legal_holds(status) WHERE status = 'active';

CREATE INDEX idx_grievance_cases_company ON grievance_cases(company_id);
CREATE INDEX idx_grievance_cases_reporter ON grievance_cases(reporter_id);
CREATE INDEX idx_grievance_cases_status ON grievance_cases(status);

CREATE INDEX idx_whistleblower_company ON whistleblower_reports(company_id);
CREATE INDEX idx_whistleblower_status ON whistleblower_reports(status);
CREATE INDEX idx_whistleblower_anonymous ON whistleblower_reports(anonymous_id);

CREATE INDEX idx_safety_incidents_company ON health_safety_incidents(company_id);
CREATE INDEX idx_safety_incidents_reporter ON health_safety_incidents(reporter_id);
CREATE INDEX idx_safety_incidents_status ON health_safety_incidents(status);
CREATE INDEX idx_safety_incidents_date ON health_safety_incidents(incident_date);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievance_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE whistleblower_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_safety_incidents ENABLE ROW LEVEL SECURITY;

-- privacy_requests: company members read, admin/hr_manager write
CREATE POLICY privacy_requests_read ON privacy_requests
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND (
      employee_id = auth.uid()
      OR created_by = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY privacy_requests_insert ON privacy_requests
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND created_by = auth.uid()
  );

CREATE POLICY privacy_requests_update ON privacy_requests
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

-- data_retention_policies: admin/hr_manager only
CREATE POLICY data_retention_read ON data_retention_policies
  FOR SELECT USING (
    company_id = safe_user_company_id()
  );

CREATE POLICY data_retention_write ON data_retention_policies
  FOR ALL USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  )
  WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

-- legal_holds: company members read, admin/hr_manager write
CREATE POLICY legal_holds_read ON legal_holds
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'auditor')
  );

CREATE POLICY legal_holds_insert ON legal_holds
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE POLICY legal_holds_update ON legal_holds
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

-- grievance_cases: reporter sees own, admin/hr_manager sees all in company
CREATE POLICY grievance_cases_read ON grievance_cases
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND (
      reporter_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager')
      OR assigned_to = auth.uid()
    )
  );

CREATE POLICY grievance_cases_insert ON grievance_cases
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND reporter_id = auth.uid()
  );

CREATE POLICY grievance_cases_update ON grievance_cases
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

-- whistleblower_reports: strict — only admin/hr_manager can read/write
-- Anonymous reporters cannot be deanonymized
CREATE POLICY whistleblower_read ON whistleblower_reports
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE POLICY whistleblower_insert ON whistleblower_reports
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
  );

CREATE POLICY whistleblower_update ON whistleblower_reports
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

-- health_safety_incidents: reporter sees own, admin/hr_manager sees all
CREATE POLICY safety_incidents_read ON health_safety_incidents
  FOR SELECT USING (
    company_id = safe_user_company_id()
    AND (
      reporter_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager')
      OR investigated_by = auth.uid()
    )
  );

CREATE POLICY safety_incidents_insert ON health_safety_incidents
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND reporter_id = auth.uid()
  );

CREATE POLICY safety_incidents_update ON health_safety_incidents
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

-- ============================================================
-- RBAC: whistleblower permissions (admin/hr_manager only)
-- ============================================================
INSERT INTO permissions (resource, action, display_name) VALUES
  ('whistleblower', 'read',   'View whistleblower reports'),
  ('whistleblower', 'write',  'Manage whistleblower reports'),
  ('compliance', 'manage_retention',  'Manage data retention policies'),
  ('compliance', 'legal_hold', 'Place/remove legal holds'),
  ('compliance', 'privacy_request', 'Manage privacy requests'),
  ('health_safety', 'read',  'View safety incidents'),
  ('health_safety', 'write', 'Manage safety incidents');

-- Admin gets whistleblower + health_safety permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource IN ('whistleblower', 'health_safety')
  AND p.action IN ('read', 'write');

-- HR Manager gets whistleblower + health_safety permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource IN ('whistleblower', 'health_safety')
  AND p.action IN ('read', 'write');

-- Auditor gets read-only for whistleblower
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource = 'whistleblower' AND p.action = 'read';

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_compliance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_privacy_requests_updated_at
  BEFORE UPDATE ON privacy_requests
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER trg_data_retention_updated_at
  BEFORE UPDATE ON data_retention_policies
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER trg_grievance_cases_updated_at
  BEFORE UPDATE ON grievance_cases
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER trg_whistleblower_updated_at
  BEFORE UPDATE ON whistleblower_reports
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

CREATE TRIGGER trg_safety_incidents_updated_at
  BEFORE UPDATE ON health_safety_incidents
  FOR EACH ROW EXECUTE FUNCTION update_compliance_updated_at();

-- ============================================================
-- Release 7B: Global Mobility, Visa & Work Permit Tracking
-- 12 tables for immigration, travel, assignments, EOR
-- ============================================================

-- 1. Immigration Case Types (reference data)
CREATE TABLE IF NOT EXISTS immigration_case_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_key VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  description TEXT,
  requires_document_checklist BOOLEAN DEFAULT true,
  default_priority VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO immigration_case_types (case_key, label, description) VALUES
  ('visa_application', 'Visa Application', 'New visa application for employee'),
  ('work_permit', 'Work Permit', 'Work permit application or renewal'),
  ('visa_renewal', 'Visa Renewal', 'Renewal of existing visa'),
  ('visa_transfer', 'Visa Transfer', 'Transfer visa between employers/entities'),
  ('dependent_visa', 'Dependent Visa', 'Visa for employee dependents'),
  ('business_visitor', 'Business Visitor', 'Business visitor classification'),
  ('remote_work_authorization', 'Remote Work Authorization', 'Authorization for remote work from another country'),
  ('eor_sponsorship', 'EOR Sponsorship', 'Employer of Record sponsored worker')
ON CONFLICT (case_key) DO NOTHING;

-- 2. Immigration Cases
CREATE TABLE IF NOT EXISTS immigration_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  legal_entity_id UUID,
  case_type VARCHAR(50) NOT NULL,
  destination_country_code VARCHAR(10) NOT NULL,
  home_country_code VARCHAR(10),
  status VARCHAR(20) DEFAULT 'draft',
  priority VARCHAR(20) DEFAULT 'medium',
  assigned_to UUID REFERENCES user_profiles(id),
  notes TEXT,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  target_start_date DATE,
  expiry_date DATE,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE immigration_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY ic_read ON immigration_cases FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ic_insert ON immigration_cases FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ic_update ON immigration_cases FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ic_company ON immigration_cases(company_id);
CREATE INDEX IF NOT EXISTS idx_ic_employee ON immigration_cases(employee_id);
CREATE INDEX IF NOT EXISTS idx_ic_status ON immigration_cases(status);

CREATE TRIGGER update_ic_updated_at BEFORE UPDATE ON immigration_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Visa Applications
CREATE TABLE IF NOT EXISTS visa_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  immigration_case_id UUID NOT NULL REFERENCES immigration_cases(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  visa_type VARCHAR(100) NOT NULL,
  country_code VARCHAR(10) NOT NULL,
  application_number VARCHAR(100),
  application_date DATE,
  status VARCHAR(20) DEFAULT 'draft',
  valid_from DATE,
  valid_until DATE,
  entries_count INTEGER DEFAULT 1,
  notes TEXT,
  document_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY va_read ON visa_applications FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY va_insert ON visa_applications FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY va_update ON visa_applications FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_va_company ON visa_applications(company_id);
CREATE INDEX IF NOT EXISTS idx_va_case ON visa_applications(immigration_case_id);

CREATE TRIGGER update_va_updated_at BEFORE UPDATE ON visa_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Work Permits
CREATE TABLE IF NOT EXISTS work_permits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  immigration_case_id UUID REFERENCES immigration_cases(id) ON DELETE SET NULL,
  employee_id UUID NOT NULL REFERENCES employees(id),
  country_code VARCHAR(10) NOT NULL,
  permit_type VARCHAR(100) NOT NULL,
  permit_number VARCHAR(255),
  status VARCHAR(20) DEFAULT 'draft',
  valid_from DATE,
  valid_until DATE,
  renewal_required BOOLEAN DEFAULT false,
  renewal_deadline DATE,
  document_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE work_permits ENABLE ROW LEVEL SECURITY;
CREATE POLICY wp_read ON work_permits FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY wp_insert ON work_permits FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY wp_update ON work_permits FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_wp_company ON work_permits(company_id);
CREATE INDEX IF NOT EXISTS idx_wp_employee ON work_permits(employee_id);

CREATE TRIGGER update_wp_updated_at BEFORE UPDATE ON work_permits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Immigration Documents
CREATE TABLE IF NOT EXISTS immigration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  immigration_case_id UUID NOT NULL REFERENCES immigration_cases(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending',
  required BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES user_profiles(id),
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  expiry_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE immigration_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY idoc_read ON immigration_documents FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY idoc_insert ON immigration_documents FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY idoc_update ON immigration_documents FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_idoc_company ON immigration_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_idoc_case ON immigration_documents(immigration_case_id);

CREATE TRIGGER update_idoc_updated_at BEFORE UPDATE ON immigration_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Business Travel Requests
CREATE TABLE IF NOT EXISTS business_travel_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  destination_country_code VARCHAR(10) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  purpose TEXT NOT NULL,
  activity_type VARCHAR(50) DEFAULT 'business_meeting',
  risk_level VARCHAR(10) DEFAULT 'low',
  estimated_working_days INTEGER DEFAULT 0,
  approval_status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  compliance_notes TEXT,
  host_entity VARCHAR(255),
  inviter_contact VARCHAR(255),
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_travel_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY btr_read ON business_travel_requests FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY btr_insert ON business_travel_requests FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY btr_update ON business_travel_requests FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_btr_company ON business_travel_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_btr_employee ON business_travel_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_btr_status ON business_travel_requests(approval_status);

CREATE TRIGGER update_btr_updated_at BEFORE UPDATE ON business_travel_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Business Travel Day Counts
CREATE TABLE IF NOT EXISTS business_travel_day_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  country_code VARCHAR(10) NOT NULL,
  travel_date DATE NOT NULL,
  day_type VARCHAR(20) DEFAULT 'work',
  travel_request_id UUID REFERENCES business_travel_requests(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_travel_day_counts ENABLE ROW LEVEL SECURITY;
CREATE POLICY btcd_read ON business_travel_day_counts FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY btcd_insert ON business_travel_day_counts FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_btcd_employee ON business_travel_day_counts(employee_id);
CREATE INDEX IF NOT EXISTS idx_btcd_country ON business_travel_day_counts(country_code);

-- 8. Global Assignments
CREATE TABLE IF NOT EXISTS global_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  assignment_type VARCHAR(50) NOT NULL,
  source_country_code VARCHAR(10) NOT NULL,
  destination_country_code VARCHAR(10) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(20) DEFAULT 'planned',
  host_entity VARCHAR(255),
  cost_center VARCHAR(100),
  relocation_assistance BOOLEAN DEFAULT false,
  housing_assistance BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE global_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ga_read ON global_assignments FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ga_insert ON global_assignments FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ga_update ON global_assignments FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ga_company ON global_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_ga_employee ON global_assignments(employee_id);

CREATE TRIGGER update_ga_updated_at BEFORE UPDATE ON global_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. EOR Providers
CREATE TABLE IF NOT EXISTS eor_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_name VARCHAR(255) NOT NULL,
  provider_country VARCHAR(10),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  website VARCHAR(500),
  contract_start_date DATE,
  contract_end_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE eor_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY eorp_read ON eor_providers FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY eorp_insert ON eor_providers FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY eorp_update ON eor_providers FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_eorp_company ON eor_providers(company_id);

CREATE TRIGGER update_eorp_updated_at BEFORE UPDATE ON eor_providers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. EOR Worker Engagements
CREATE TABLE IF NOT EXISTS eor_worker_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  eor_provider_id UUID NOT NULL REFERENCES eor_providers(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  candidate_id UUID REFERENCES candidates(id),
  worker_country_code VARCHAR(10) NOT NULL,
  engagement_start DATE,
  engagement_end DATE,
  status VARCHAR(20) DEFAULT 'active',
  monthly_fee NUMERIC(12,2),
  fee_currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE eor_worker_engagements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ewe_read ON eor_worker_engagements FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ewe_insert ON eor_worker_engagements FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ewe_update ON eor_worker_engagements FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ewe_company ON eor_worker_engagements(company_id);
CREATE INDEX IF NOT EXISTS idx_ewe_provider ON eor_worker_engagements(eor_provider_id);

CREATE TRIGGER update_ewe_updated_at BEFORE UPDATE ON eor_worker_engagements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Mobility Alerts
CREATE TABLE IF NOT EXISTS mobility_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id),
  immigration_case_id UUID REFERENCES immigration_cases(id),
  work_permit_id UUID REFERENCES work_permits(id),
  alert_type VARCHAR(50) NOT NULL,
  alert_date DATE NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  dismissed_by UUID REFERENCES user_profiles(id),
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mobility_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY ma_read ON mobility_alerts FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ma_insert ON mobility_alerts FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ma_update ON mobility_alerts FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ma_company ON mobility_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_ma_employee ON mobility_alerts(employee_id);
CREATE INDEX IF NOT EXISTS idx_ma_date ON mobility_alerts(alert_date);

-- 12. Mobility Country Rules (reference data)
CREATE TABLE IF NOT EXISTS mobility_country_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  country_code VARCHAR(10) NOT NULL,
  rule_key VARCHAR(100) NOT NULL,
  rule_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, country_code, rule_key)
);

ALTER TABLE mobility_country_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY mcr_read ON mobility_country_rules FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY mcr_insert ON mobility_country_rules FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY mcr_update ON mobility_country_rules FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_mcr_company ON mobility_country_rules(company_id);

CREATE TRIGGER update_mcr_updated_at BEFORE UPDATE ON mobility_country_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. RBAC Permissions for mobility
INSERT INTO permissions (resource, action, description) VALUES
  ('mobility', 'read', 'View mobility cases'),
  ('mobility', 'write', 'Create and edit mobility cases'),
  ('mobility', 'approve', 'Approve travel and mobility requests'),
  ('mobility_document', 'read', 'View immigration documents'),
  ('mobility_document', 'write', 'Upload immigration documents'),
  ('mobility_eor', 'manage', 'Manage EOR providers and engagements'),
  ('mobility', 'export', 'Export mobility data')
ON CONFLICT (resource, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'mobility' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'mobility' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'mobility' AND p.action = 'approve'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'mobility_document' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'mobility_document' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'mobility_eor' AND p.action = 'manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'mobility' AND p.action = 'export'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'mobility' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'mobility' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'mobility' AND p.action = 'approve'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'mobility_document' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'mobility_document' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'mobility_eor' AND p.action = 'manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'mobility' AND p.action = 'export'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'mobility' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'mobility' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'mobility' AND p.action = 'approve'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'mobility_document' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'mobility_document' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'mobility_eor' AND p.action = 'manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'mobility' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'mobility' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'mobility_document' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'mobility_document' AND p.action = 'write'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'mobility' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'mobility' AND p.action = 'read'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================
-- Release 7: HRIS Core + Employee Directory + Org Chart
-- Central employee record system
-- ============================================================

-- 1. Employees (HR employment record)
CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_profile_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  legal_entity_id UUID,
  business_unit_id UUID,
  cost_center_id UUID,
  location_id UUID,
  department_id UUID,
  team_id UUID,
  manager_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  employee_number VARCHAR(50) NOT NULL,
  employment_status VARCHAR(20) DEFAULT 'draft',
  employment_type VARCHAR(20) DEFAULT 'full_time',
  hire_date DATE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  probation_end_date DATE,
  job_title VARCHAR(255) NOT NULL,
  position_level VARCHAR(50),
  work_email VARCHAR(255),
  personal_email VARCHAR(255),
  phone VARCHAR(50),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),
  preferred_language VARCHAR(5) DEFAULT 'en',
  country_code VARCHAR(10) DEFAULT 'TH',
  timezone VARCHAR(50) DEFAULT 'Asia/Bangkok',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_number)
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY emp_read ON employees FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY emp_insert ON employees FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY emp_update ON employees FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_emp_company ON employees(company_id);
CREATE INDEX idx_emp_user ON employees(user_profile_id);
CREATE INDEX idx_emp_candidate ON employees(candidate_id);
CREATE INDEX idx_emp_manager ON employees(manager_employee_id);
CREATE INDEX idx_emp_status ON employees(employment_status);
CREATE INDEX idx_emp_number ON employees(company_id, employee_number);

CREATE TRIGGER update_emp_updated_at BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Employee Profiles (personal/sensitive data)
CREATE TABLE IF NOT EXISTS employee_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  display_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  preferred_name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20),
  nationality VARCHAR(50),
  marital_status VARCHAR(20),
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country_code VARCHAR(10),
  profile_photo_document_id UUID,
  sensitive_fields JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employee_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY emp_prof_read ON employee_profiles FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY emp_prof_insert ON employee_profiles FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY emp_prof_update ON employee_profiles FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_emp_prof_company ON employee_profiles(company_id);
CREATE INDEX idx_emp_prof_employee ON employee_profiles(employee_id);

CREATE TRIGGER update_emp_prof_updated_at BEFORE UPDATE ON employee_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Employee Timeline Events
CREATE TABLE IF NOT EXISTS employee_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  effective_date DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employee_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY emp_timeline_read ON employee_timeline_events FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY emp_timeline_insert ON employee_timeline_events FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE INDEX idx_emp_timeline_company ON employee_timeline_events(company_id);
CREATE INDEX idx_emp_timeline_employee ON employee_timeline_events(employee_id);
CREATE INDEX idx_emp_timeline_type ON employee_timeline_events(event_type);

-- 4. Employee Change Requests
CREATE TABLE IF NOT EXISTS employee_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES user_profiles(id),
  request_type VARCHAR(50) NOT NULL,
  current_values JSONB DEFAULT '{}'::jsonb,
  requested_values JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(20) DEFAULT 'pending',
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES user_profiles(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employee_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY emp_cr_read ON employee_change_requests FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY emp_cr_insert ON employee_change_requests FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY emp_cr_update ON employee_change_requests FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_emp_cr_company ON employee_change_requests(company_id);
CREATE INDEX idx_emp_cr_employee ON employee_change_requests(employee_id);
CREATE INDEX idx_emp_cr_status ON employee_change_requests(status);

CREATE TRIGGER update_emp_cr_updated_at BEFORE UPDATE ON employee_change_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Employee Custom Field Definitions
CREATE TABLE IF NOT EXISTS employee_custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  field_key VARCHAR(100) NOT NULL,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(20) NOT NULL DEFAULT 'text',
  options JSONB,
  is_required BOOLEAN DEFAULT false,
  is_sensitive BOOLEAN DEFAULT false,
  applies_to VARCHAR(20) DEFAULT 'all',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, field_key)
);

ALTER TABLE employee_custom_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY emp_cf_def_read ON employee_custom_field_definitions FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY emp_cf_def_insert ON employee_custom_field_definitions FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY emp_cf_def_update ON employee_custom_field_definitions FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_emp_cf_def_company ON employee_custom_field_definitions(company_id);

CREATE TRIGGER update_emp_cf_def_updated_at BEFORE UPDATE ON employee_custom_field_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Employee Custom Field Values
CREATE TABLE IF NOT EXISTS employee_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES employee_custom_field_definitions(id) ON DELETE CASCADE,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, field_definition_id)
);

ALTER TABLE employee_custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY emp_cf_val_read ON employee_custom_field_values FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY emp_cf_val_insert ON employee_custom_field_values FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY emp_cf_val_update ON employee_custom_field_values FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_emp_cf_val_company ON employee_custom_field_values(company_id);
CREATE INDEX idx_emp_cf_val_employee ON employee_custom_field_values(employee_id);

CREATE TRIGGER update_emp_cf_val_updated_at BEFORE UPDATE ON employee_custom_field_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Org Chart Nodes
CREATE TABLE IF NOT EXISTS org_chart_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  department_id UUID,
  team_id UUID,
  position_title VARCHAR(255) NOT NULL,
  node_order INTEGER,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE org_chart_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY ocn_read ON org_chart_nodes FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ocn_insert ON org_chart_nodes FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ocn_update ON org_chart_nodes FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_ocn_company ON org_chart_nodes(company_id);
CREATE INDEX idx_ocn_employee ON org_chart_nodes(employee_id);
CREATE INDEX idx_ocn_manager ON org_chart_nodes(manager_employee_id);

CREATE TRIGGER update_ocn_updated_at BEFORE UPDATE ON org_chart_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Employee Documents (link to existing documents table)
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  visibility VARCHAR(20) DEFAULT 'hr',
  status VARCHAR(20) DEFAULT 'active',
  uploaded_by UUID REFERENCES user_profiles(id),
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY emp_doc_read ON employee_documents FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY emp_doc_insert ON employee_documents FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY emp_doc_update ON employee_documents FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_emp_doc_company ON employee_documents(company_id);
CREATE INDEX idx_emp_doc_employee ON employee_documents(employee_id);

CREATE TRIGGER update_emp_doc_updated_at BEFORE UPDATE ON employee_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Add sensitive fields to sensitive_field_registry
INSERT INTO sensitive_field_registry (company_id, field_name, description, is_active)
SELECT c.id, f.field_name, f.description, true
FROM companies c
CROSS JOIN (VALUES
  ('date_of_birth', 'Employee date of birth'),
  ('gender', 'Employee gender'),
  ('nationality', 'Employee nationality'),
  ('marital_status', 'Employee marital status'),
  ('emergency_contact_name', 'Emergency contact name'),
  ('emergency_contact_phone', 'Emergency contact phone')
) AS f(field_name, description)
WHERE NOT EXISTS (
  SELECT 1 FROM sensitive_field_registry sfr
  WHERE sfr.company_id = c.id AND sfr.field_name = f.field_name
);

-- 10. RBAC Permissions for HRIS
INSERT INTO permissions (id, resource, action, description) VALUES
  ('employee_read', 'employee', 'read', 'View employees'),
  ('employee_write', 'employee', 'write', 'Create and edit employees'),
  ('employee_create', 'employee', 'create', 'Create new employees'),
  ('employee_sensitive_read', 'employee', 'sensitive_read', 'View sensitive employee fields'),
  ('employee_timeline_read', 'employee_timeline', 'read', 'View employee timeline'),
  ('employee_timeline_write', 'employee_timeline', 'write', 'Create timeline events'),
  ('employee_change_request_read', 'employee_change_request', 'read', 'View change requests'),
  ('employee_change_request_write', 'employee_change_request', 'write', 'Create change requests'),
  ('employee_change_request_approve', 'employee_change_request', 'approve', 'Approve change requests'),
  ('org_chart_read', 'org_chart', 'read', 'View org chart'),
  ('org_chart_write', 'org_chart', 'write', 'Edit org chart'),
  ('employee_document_read', 'employee_document', 'read', 'View employee documents'),
  ('employee_document_write', 'employee_document', 'write', 'Upload employee documents'),
  ('employee_document_verify', 'employee_document', 'verify', 'Verify employee documents'),
  ('employee_custom_field_read', 'employee_custom_field', 'read', 'View custom fields'),
  ('employee_custom_field_write', 'employee_custom_field', 'write', 'Manage custom fields')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('owner', 'employee_read'), ('owner', 'employee_write'), ('owner', 'employee_create'),
  ('owner', 'employee_sensitive_read'), ('owner', 'employee_timeline_read'), ('owner', 'employee_timeline_write'),
  ('owner', 'employee_change_request_read'), ('owner', 'employee_change_request_write'), ('owner', 'employee_change_request_approve'),
  ('owner', 'org_chart_read'), ('owner', 'org_chart_write'),
  ('owner', 'employee_document_read'), ('owner', 'employee_document_write'), ('owner', 'employee_document_verify'),
  ('owner', 'employee_custom_field_read'), ('owner', 'employee_custom_field_write'),
  ('admin', 'employee_read'), ('admin', 'employee_write'), ('admin', 'employee_create'),
  ('admin', 'employee_sensitive_read'), ('admin', 'employee_timeline_read'), ('admin', 'employee_timeline_write'),
  ('admin', 'employee_change_request_read'), ('admin', 'employee_change_request_write'), ('admin', 'employee_change_request_approve'),
  ('admin', 'org_chart_read'), ('admin', 'org_chart_write'),
  ('admin', 'employee_document_read'), ('admin', 'employee_document_write'), ('admin', 'employee_document_verify'),
  ('admin', 'employee_custom_field_read'), ('admin', 'employee_custom_field_write'),
  ('hr_manager', 'employee_read'), ('hr_manager', 'employee_write'), ('hr_manager', 'employee_create'),
  ('hr_manager', 'employee_sensitive_read'), ('hr_manager', 'employee_timeline_read'), ('hr_manager', 'employee_timeline_write'),
  ('hr_manager', 'employee_change_request_read'), ('hr_manager', 'employee_change_request_write'), ('hr_manager', 'employee_change_request_approve'),
  ('hr_manager', 'org_chart_read'), ('hr_manager', 'org_chart_write'),
  ('hr_manager', 'employee_document_read'), ('hr_manager', 'employee_document_write'), ('hr_manager', 'employee_document_verify'),
  ('hr_manager', 'employee_custom_field_read'), ('hr_manager', 'employee_custom_field_write'),
  ('hr_staff', 'employee_read'), ('hr_staff', 'employee_write'), ('hr_staff', 'employee_create'),
  ('hr_staff', 'employee_timeline_read'), ('hr_staff', 'employee_timeline_write'),
  ('hr_staff', 'employee_change_request_read'), ('hr_staff', 'employee_change_request_approve'),
  ('hr_staff', 'employee_document_read'), ('hr_staff', 'employee_document_write'), ('hr_staff', 'employee_document_verify'),
  ('hr_staff', 'employee_custom_field_read'),
  ('manager', 'employee_read'), ('manager', 'org_chart_read'),
  ('employee', 'employee_read'), ('employee', 'employee_change_request_write')
ON CONFLICT (role_id, permission_id) DO NOTHING;

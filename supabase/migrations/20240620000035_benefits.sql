-- ============================================================
-- Release 15: Benefits Administration
-- Tables: benefit_plans, benefit_eligibility_rules,
--         benefit_enrollments, benefit_dependents,
--         benefit_open_enrollment_periods
-- ============================================================

-- 1. Benefit Plans
CREATE TABLE IF NOT EXISTS benefit_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) NOT NULL,
  description TEXT,
  provider VARCHAR(255),
  monthly_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (monthly_cost >= 0),
  employee_contribution NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (employee_contribution >= 0),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_plan_type CHECK (plan_type IN ('health', 'dental', 'vision', 'life', 'disability', 'retirement', 'other'))
);

ALTER TABLE benefit_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY bp_read ON benefit_plans FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY bp_insert ON benefit_plans FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY bp_update ON benefit_plans FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY bp_delete ON benefit_plans FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_bp_company ON benefit_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_bp_type ON benefit_plans(company_id, plan_type);
CREATE INDEX IF NOT EXISTS idx_bp_active ON benefit_plans(company_id, is_active);

CREATE TRIGGER update_bp_updated_at BEFORE UPDATE ON benefit_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Benefit Eligibility Rules
CREATE TABLE IF NOT EXISTS benefit_eligibility_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES benefit_plans(id) ON DELETE CASCADE,
  employment_type VARCHAR(50) NOT NULL,
  min_service_months INTEGER NOT NULL DEFAULT 0 CHECK (min_service_months >= 0),
  department_ids JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_employment_type CHECK (employment_type IN ('full_time', 'part_time', 'contract', 'intern', 'probation'))
);

ALTER TABLE benefit_eligibility_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY ber_read ON benefit_eligibility_rules FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ber_insert ON benefit_eligibility_rules FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ber_update ON benefit_eligibility_rules FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ber_delete ON benefit_eligibility_rules FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ber_company ON benefit_eligibility_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_ber_plan ON benefit_eligibility_rules(company_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_ber_employment ON benefit_eligibility_rules(company_id, employment_type);

-- 3. Benefit Enrollments
CREATE TABLE IF NOT EXISTS benefit_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES benefit_plans(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  coverage_start DATE,
  coverage_end DATE,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_enrollment_status CHECK (status IN ('pending', 'approved', 'denied', 'cancelled', 'expired')),
  CONSTRAINT valid_coverage_dates CHECK (coverage_end IS NULL OR coverage_end >= coverage_start)
);

ALTER TABLE benefit_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY be_read ON benefit_enrollments FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY be_insert ON benefit_enrollments FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY be_update ON benefit_enrollments FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY be_delete ON benefit_enrollments FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_be_company ON benefit_enrollments(company_id);
CREATE INDEX IF NOT EXISTS idx_be_plan ON benefit_enrollments(company_id, plan_id);
CREATE INDEX IF NOT EXISTS idx_be_employee ON benefit_enrollments(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_be_status ON benefit_enrollments(company_id, status);

CREATE TRIGGER update_be_updated_at BEFORE UPDATE ON benefit_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Benefit Dependents
CREATE TABLE IF NOT EXISTS benefit_dependents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  enrollment_id UUID NOT NULL REFERENCES benefit_enrollments(id) ON DELETE CASCADE,
  dependent_name VARCHAR(255) NOT NULL,
  relationship VARCHAR(50) NOT NULL,
  date_of_birth DATE NOT NULL,
  is_primary_caregiver BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_relationship CHECK (relationship IN ('spouse', 'child', 'parent', 'sibling', 'other'))
);

ALTER TABLE benefit_dependents ENABLE ROW LEVEL SECURITY;

CREATE POLICY bd_read ON benefit_dependents FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY bd_insert ON benefit_dependents FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY bd_update ON benefit_dependents FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY bd_delete ON benefit_dependents FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_bd_company ON benefit_dependents(company_id);
CREATE INDEX IF NOT EXISTS idx_bd_enrollment ON benefit_dependents(company_id, enrollment_id);
CREATE INDEX IF NOT EXISTS idx_bd_relationship ON benefit_dependents(company_id, relationship);

CREATE TRIGGER update_bd_updated_at BEFORE UPDATE ON benefit_dependents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Benefit Open Enrollment Periods
CREATE TABLE IF NOT EXISTS benefit_open_enrollment_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_enrollment_period_status CHECK (status IN ('upcoming', 'active', 'closed')),
  CONSTRAINT valid_enrollment_period_dates CHECK (end_date >= start_date)
);

ALTER TABLE benefit_open_enrollment_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY boep_read ON benefit_open_enrollment_periods FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY boep_insert ON benefit_open_enrollment_periods FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY boep_update ON benefit_open_enrollment_periods FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY boep_delete ON benefit_open_enrollment_periods FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_boep_company ON benefit_open_enrollment_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_boep_dates ON benefit_open_enrollment_periods(company_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_boep_status ON benefit_open_enrollment_periods(company_id, status);

CREATE TRIGGER update_boep_updated_at BEFORE UPDATE ON benefit_open_enrollment_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RBAC: Benefits-specific permissions
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('benefit', 'read',   'View benefit plans and enrollments'),
  ('benefit', 'write',  'Manage benefit plans and eligibility rules'),
  ('benefit', 'enroll', 'Enroll employees in benefit plans')
ON CONFLICT (resource, action) DO NOTHING;

-- hr_manager gets benefit read+write+enroll
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'benefit' AND p.action IN ('read', 'write', 'enroll');

-- hr_staff gets benefit read+enroll
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'benefit' AND p.action IN ('read', 'enroll');

-- admin gets benefit read+write+enroll
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'benefit' AND p.action IN ('read', 'write', 'enroll');

-- owner gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'benefit';

-- manager gets benefit read
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'benefit' AND p.action = 'read';

-- employee gets benefit read (own enrollments via RLS)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'benefit' AND p.action = 'read';

-- ============================================================
-- Release 19: Compensation & Workforce Planning
-- Salary bands, compensation cycles, reviews, headcount plans.
-- Salary data is highly sensitive — restricted to owner/admin/hr_manager.
-- Market data must be labeled as imported/reference.
-- ============================================================

-- 1. Salary Bands (market reference data, not actual salaries)
CREATE TABLE IF NOT EXISTS salary_bands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  job_family VARCHAR(100) NOT NULL,
  level VARCHAR(50) NOT NULL,
  min_salary NUMERIC(14,2) NOT NULL,
  mid_salary NUMERIC(14,2) NOT NULL,
  max_salary NUMERIC(14,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'THB',
  data_source VARCHAR(50) NOT NULL DEFAULT 'internal' CHECK (data_source IN ('internal', 'imported', 'market_reference')),
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE salary_bands ENABLE ROW LEVEL SECURITY;

-- Salary bands: owner/admin/hr_manager read+write; others no access
CREATE POLICY sb_read ON salary_bands FOR SELECT USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY sb_insert ON salary_bands FOR INSERT WITH CHECK (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY sb_update ON salary_bands FOR UPDATE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY sb_delete ON salary_bands FOR DELETE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin')
);

CREATE INDEX idx_sb_company ON salary_bands(company_id);
CREATE INDEX idx_sb_job_family ON salary_bands(job_family);
CREATE INDEX idx_sb_level ON salary_bands(level);
CREATE INDEX idx_sb_effective ON salary_bands(effective_from, effective_to);

CREATE TRIGGER update_sb_updated_at BEFORE UPDATE ON salary_bands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Compensation Cycles
CREATE TABLE IF NOT EXISTS compensation_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  cycle_year INTEGER NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  merit_budget_pct NUMERIC(5,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compensation_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY cc_read ON compensation_cycles FOR SELECT USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager', 'hr_staff')
);
CREATE POLICY cc_insert ON compensation_cycles FOR INSERT WITH CHECK (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY cc_update ON compensation_cycles FOR UPDATE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY cc_delete ON compensation_cycles FOR DELETE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin')
);

CREATE INDEX idx_cc_company ON compensation_cycles(company_id);
CREATE INDEX idx_cc_year ON compensation_cycles(cycle_year);
CREATE INDEX idx_cc_status ON compensation_cycles(status);

CREATE TRIGGER update_cc_updated_at BEFORE UPDATE ON compensation_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Compensation Reviews (actual salary decisions — most sensitive)
CREATE TABLE IF NOT EXISTS compensation_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES compensation_cycles(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_salary NUMERIC(14,2) NOT NULL,
  proposed_salary NUMERIC(14,2) NOT NULL,
  merit_increase_pct NUMERIC(5,2),
  reason TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE compensation_reviews ENABLE ROW LEVEL SECURITY;

-- Only owner/admin/hr_manager can see salary reviews
CREATE POLICY cr_read ON compensation_reviews FOR SELECT USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY cr_insert ON compensation_reviews FOR INSERT WITH CHECK (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY cr_update ON compensation_reviews FOR UPDATE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY cr_delete ON compensation_reviews FOR DELETE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin')
);

CREATE INDEX idx_cr_company ON compensation_reviews(company_id);
CREATE INDEX idx_cr_cycle ON compensation_reviews(cycle_id);
CREATE INDEX idx_cr_employee ON compensation_reviews(employee_id);
CREATE INDEX idx_cr_status ON compensation_reviews(status);

CREATE TRIGGER update_cr_updated_at BEFORE UPDATE ON compensation_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Headcount Plans
CREATE TABLE IF NOT EXISTS headcount_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  department_id UUID NOT NULL,
  plan_year INTEGER NOT NULL,
  planned_headcount INTEGER NOT NULL CHECK (planned_headcount >= 0),
  current_headcount INTEGER NOT NULL DEFAULT 0 CHECK (current_headcount >= 0),
  budget NUMERIC(14,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE headcount_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY hp_read ON headcount_plans FOR SELECT USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager', 'hr_staff')
);
CREATE POLICY hp_insert ON headcount_plans FOR INSERT WITH CHECK (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY hp_update ON headcount_plans FOR UPDATE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin', 'hr_manager')
);
CREATE POLICY hp_delete ON headcount_plans FOR DELETE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('owner', 'admin')
);

CREATE INDEX idx_hp_company ON headcount_plans(company_id);
CREATE INDEX idx_hp_department ON headcount_plans(department_id);
CREATE INDEX idx_hp_year ON headcount_plans(plan_year);

CREATE TRIGGER update_hp_updated_at BEFORE UPDATE ON headcount_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Audit triggers for all compensation tables
-- ============================================================

CREATE TRIGGER audit_salary_bands_changes
  AFTER INSERT OR UPDATE OR DELETE ON salary_bands
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_compensation_cycles_changes
  AFTER INSERT OR UPDATE OR DELETE ON compensation_cycles
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_compensation_reviews_changes
  AFTER INSERT OR UPDATE OR DELETE ON compensation_reviews
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_headcount_plans_changes
  AFTER INSERT OR UPDATE OR DELETE ON headcount_plans
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- RBAC: compensation_read / compensation_write / compensation_approve
-- Owner, admin, hr_manager only for salary data.
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('compensation', 'read',    'View compensation data (salary bands, reviews)'),
  ('compensation', 'write',   'Create/edit compensation cycles and reviews'),
  ('compensation', 'approve', 'Approve compensation reviews and salary changes');

-- Owner: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'compensation';

-- Admin: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'compensation';

-- HR Manager: read + write + approve
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'compensation';

-- HR Staff: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'compensation' AND p.action = 'read';

-- Manager: NO compensation access (salary data restricted)
-- Employee: NO compensation access (salary data restricted)
-- Auditor: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource = 'compensation' AND p.action = 'read';

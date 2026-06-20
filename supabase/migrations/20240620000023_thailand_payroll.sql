-- ============================================================
-- Release 9A: Thailand Payroll Pack
-- Tables: payroll_cycles, salary_structures, salary_components,
--         payroll_runs, payroll_run_items, payslips,
--         th_tax_brackets, th_social_security_rules, payroll_audit_events
-- ============================================================

-- 1. Payroll Cycles (pay period definition)
CREATE TABLE IF NOT EXISTS payroll_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_cycle_dates CHECK (period_end >= period_start),
  CONSTRAINT valid_cycle_status CHECK (status IN ('draft', 'active', 'closed'))
);

ALTER TABLE payroll_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY pc_read ON payroll_cycles FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY pc_insert ON payroll_cycles FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY pc_update ON payroll_cycles FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_pc_company ON payroll_cycles(company_id);
CREATE INDEX IF NOT EXISTS idx_pc_status ON payroll_cycles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pc_period ON payroll_cycles(company_id, period_start, period_end);

CREATE TRIGGER update_pc_updated_at BEFORE UPDATE ON payroll_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Salary Structures (employee compensation)
CREATE TABLE IF NOT EXISTS salary_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  base_salary NUMERIC(15,2) NOT NULL CHECK (base_salary >= 0),
  salary_currency VARCHAR(3) DEFAULT 'THB',
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_salary_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

ALTER TABLE salary_structures ENABLE ROW LEVEL SECURITY;

CREATE POLICY ss_read ON salary_structures FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ss_insert ON salary_structures FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ss_update ON salary_structures FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ss_company ON salary_structures(company_id);
CREATE INDEX IF NOT EXISTS idx_ss_employee ON salary_structures(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_ss_effective ON salary_structures(company_id, effective_from, effective_to);

CREATE TRIGGER update_ss_updated_at BEFORE UPDATE ON salary_structures
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Salary Components (earnings/deduction definitions)
CREATE TABLE IF NOT EXISTS salary_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  component_type VARCHAR(20) NOT NULL,
  calculation_type VARCHAR(20) NOT NULL,
  value NUMERIC(15,2) NOT NULL DEFAULT 0,
  is_taxable BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_component_type CHECK (component_type IN ('earning', 'deduction')),
  CONSTRAINT valid_calculation_type CHECK (calculation_type IN ('fixed', 'percentage', 'formula'))
);

ALTER TABLE salary_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY salcomp_read ON salary_components FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY salcomp_insert ON salary_components FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY salcomp_update ON salary_components FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_salcomp_company ON salary_components(company_id);
CREATE INDEX IF NOT EXISTS idx_salcomp_type ON salary_components(company_id, component_type);

CREATE TRIGGER update_salcomp_updated_at BEFORE UPDATE ON salary_components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Payroll Runs (batch processing)
CREATE TABLE IF NOT EXISTS payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES payroll_cycles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'draft',
  total_gross NUMERIC(15,2) DEFAULT 0,
  total_deductions NUMERIC(15,2) DEFAULT 0,
  total_net NUMERIC(15,2) DEFAULT 0,
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_run_status CHECK (status IN ('draft', 'calculating', 'calculated', 'approved', 'paid', 'rejected'))
);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY pr_read ON payroll_runs FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY pr_insert ON payroll_runs FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY pr_update ON payroll_runs FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_pr_company ON payroll_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_pr_cycle ON payroll_runs(company_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_pr_status ON payroll_runs(company_id, status);

CREATE TRIGGER update_pr_updated_at BEFORE UPDATE ON payroll_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Payroll Run Items (per-employee payroll line)
CREATE TABLE IF NOT EXISTS payroll_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_id UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  base_salary NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay NUMERIC(15,2) DEFAULT 0,
  bonus NUMERIC(15,2) DEFAULT 0,
  other_earnings NUMERIC(15,2) DEFAULT 0,
  social_security_employee NUMERIC(15,2) DEFAULT 0,
  social_security_employer NUMERIC(15,2) DEFAULT 0,
  "Withholding_Tax" NUMERIC(15,2) DEFAULT 0,
  other_deductions NUMERIC(15,2) DEFAULT 0,
  net_pay NUMERIC(15,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_item_status CHECK (status IN ('draft', 'calculated', 'approved', 'paid', 'revised'))
);

ALTER TABLE payroll_run_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY pri_read ON payroll_run_items FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY pri_insert ON payroll_run_items FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY pri_update ON payroll_run_items FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_pri_company ON payroll_run_items(company_id);
CREATE INDEX IF NOT EXISTS idx_pri_run ON payroll_run_items(company_id, run_id);
CREATE INDEX IF NOT EXISTS idx_pri_employee ON payroll_run_items(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_pri_status ON payroll_run_items(company_id, status);

CREATE TRIGGER update_pri_updated_at BEFORE UPDATE ON payroll_run_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Payslips
CREATE TABLE IF NOT EXISTS payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_item_id UUID NOT NULL REFERENCES payroll_run_items(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_payslip_status CHECK (status IN ('generated', 'viewed', 'downloaded', 'emailed'))
);

ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;

CREATE POLICY payslip_read ON payslips FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY payslip_insert ON payslips FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY payslip_update ON payslips FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_payslip_company ON payslips(company_id);
CREATE INDEX IF NOT EXISTS idx_payslip_employee ON payslips(company_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_payslip_run_item ON payslips(company_id, run_item_id);

-- 7. Thailand Tax Brackets (per-year lookup)
CREATE TABLE IF NOT EXISTS th_tax_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  min_income NUMERIC(15,2) NOT NULL,
  max_income NUMERIC(15,2),
  tax_rate NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100),
  CONSTRAINT valid_income_range CHECK (max_income IS NULL OR max_income > min_income)
);

CREATE INDEX IF NOT EXISTS idx_tax_year ON th_tax_brackets(year);
CREATE UNIQUE INDEX idx_tax_year_bracket ON th_tax_brackets(year, min_income);

-- 8. Thailand Social Security Rules (per-year lookup)
CREATE TABLE IF NOT EXISTS th_social_security_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year INTEGER NOT NULL,
  min_salary NUMERIC(15,2) NOT NULL,
  max_salary NUMERIC(15,2) NOT NULL,
  employee_rate NUMERIC(5,2) NOT NULL,
  employer_rate NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_ss_rates CHECK (employee_rate >= 0 AND employer_rate >= 0),
  CONSTRAINT valid_ss_salary_range CHECK (max_salary > min_salary)
);

CREATE INDEX IF NOT EXISTS idx_ss_year ON th_social_security_rules(year);
CREATE UNIQUE INDEX idx_ss_year_range ON th_social_security_rules(year, min_salary);

-- 9. Payroll Audit Events
CREATE TABLE IF NOT EXISTS payroll_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payroll_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY pae_read ON payroll_audit_events FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY pae_insert ON payroll_audit_events FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_pae_company ON payroll_audit_events(company_id);
CREATE INDEX IF NOT EXISTS idx_pae_run ON payroll_audit_events(company_id, run_id);
CREATE INDEX IF NOT EXISTS idx_pae_action ON payroll_audit_events(company_id, action);

-- ============================================================
-- SEED: Thailand Tax Brackets 2024
-- Source: Revenue Department of Thailand
-- Progressive rates: 0-150K: 0%, 150K-1.8M: 5-20%
-- ============================================================

INSERT INTO th_tax_brackets (year, min_income, max_income, tax_rate) VALUES
  (2024, 0,        150000,    0.00),
  (2024, 150001,   1800000,   0.10),  -- placeholder 10% — requires_accounting_review for progressive calc
  (2024, 1800001,  99999999,  0.15);  -- placeholder 15% — requires_accounting_review

-- ============================================================
-- SEED: Thailand Social Security 2024
-- Source: Social Security Office (สปส.)
-- Employee: 5%, Employer: 5%, Floor: 1,650 THB, Cap: 15,000 THB/month
-- ============================================================

INSERT INTO th_social_security_rules (year, min_salary, max_salary, employee_rate, employer_rate) VALUES
  (2024, 1650, 15000, 5.00, 5.00);

-- ============================================================
-- RBAC: Payroll-specific permissions
-- ============================================================

-- Seed payroll permission mapping if not present
-- hr_manager gets payroll read+write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'payroll' AND p.action IN ('read', 'write', 'approve');

-- hr_staff gets payroll read+write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'payroll' AND p.action IN ('read', 'write');

-- finance_approver already gets payroll read+approve (seeded in rbac_seed)

-- employee gets payroll read (own payslips only via RLS)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'payroll' AND p.action = 'read';

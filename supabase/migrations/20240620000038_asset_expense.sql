-- ============================================================
-- Release 18: Asset & Expense Management
-- Track company assets, assignments, returns, maintenance.
-- Expense claims with policy enforcement, approval workflow,
-- receipts, and reimbursement handoff to payroll.
-- Asset return links to offboarding (Release 6B).
-- ============================================================

-- 1. Assets
CREATE TABLE IF NOT EXISTS assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(50) NOT NULL DEFAULT 'other',
  serial_number VARCHAR(255),
  purchase_date DATE,
  purchase_price NUMERIC(12,2),
  status VARCHAR(30) DEFAULT 'available',
  location VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY ast_read ON assets FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ast_insert ON assets FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ast_update ON assets FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ast_delete ON assets FOR DELETE USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr_manager'));

CREATE INDEX idx_ast_company ON assets(company_id);
CREATE INDEX idx_ast_status ON assets(status);
CREATE INDEX idx_ast_type ON assets(asset_type);
CREATE INDEX idx_ast_serial ON assets(serial_number) WHERE serial_number IS NOT NULL;

CREATE TRIGGER update_ast_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Asset Assignments
CREATE TABLE IF NOT EXISTS asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  condition_notes TEXT,
  status VARCHAR(30) DEFAULT 'assigned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE asset_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY asga_read ON asset_assignments FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY asga_insert ON asset_assignments FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY asga_update ON asset_assignments FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY asga_delete ON asset_assignments FOR DELETE USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr_manager'));

CREATE INDEX idx_asga_company ON asset_assignments(company_id);
CREATE INDEX idx_asga_asset ON asset_assignments(asset_id);
CREATE INDEX idx_asga_employee ON asset_assignments(employee_id);
CREATE INDEX idx_asga_status ON asset_assignments(status);

CREATE TRIGGER update_asga_updated_at BEFORE UPDATE ON asset_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Asset Maintenance Logs
CREATE TABLE IF NOT EXISTS asset_maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  maintenance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL,
  cost NUMERIC(12,2) DEFAULT 0,
  performed_by VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE asset_maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY aml_read ON asset_maintenance_logs FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY aml_insert ON asset_maintenance_logs FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY aml_update ON asset_maintenance_logs FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY aml_delete ON asset_maintenance_logs FOR DELETE USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr_manager'));

CREATE INDEX idx_aml_company ON asset_maintenance_logs(company_id);
CREATE INDEX idx_aml_asset ON asset_maintenance_logs(asset_id);

-- 4. Expense Policies
CREATE TABLE IF NOT EXISTS expense_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  policy_name VARCHAR(255) NOT NULL,
  max_amount NUMERIC(12,2) NOT NULL,
  requires_receipt BOOLEAN DEFAULT true,
  auto_approve_under NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY ep_read ON expense_policies FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ep_insert ON expense_policies FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ep_update ON expense_policies FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ep_delete ON expense_policies FOR DELETE USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr_manager'));

CREATE INDEX idx_ep_company ON expense_policies(company_id);
CREATE INDEX idx_ep_active ON expense_policies(is_active);

CREATE TRIGGER update_ep_updated_at BEFORE UPDATE ON expense_policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Expense Claims
CREATE TABLE IF NOT EXISTS expense_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_id UUID REFERENCES expense_policies(id) ON DELETE SET NULL,
  claim_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'THB',
  description TEXT,
  status VARCHAR(30) DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY ec_read ON expense_claims FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ec_insert ON expense_claims FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ec_update ON expense_claims FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_ec_company ON expense_claims(company_id);
CREATE INDEX idx_ec_employee ON expense_claims(employee_id);
CREATE INDEX idx_ec_status ON expense_claims(status);
CREATE INDEX idx_ec_policy ON expense_claims(policy_id);

CREATE TRIGGER update_ec_updated_at BEFORE UPDATE ON expense_claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Expense Receipts
CREATE TABLE IF NOT EXISTS expense_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  amount NUMERIC(12,2),
  receipt_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY er_read ON expense_receipts FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY er_insert ON expense_receipts FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY er_update ON expense_receipts FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY er_delete ON expense_receipts FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_er_company ON expense_receipts(company_id);
CREATE INDEX idx_er_claim ON expense_receipts(claim_id);

-- 7. Expense Reimbursements
CREATE TABLE IF NOT EXISTS expense_reimbursements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES expense_claims(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  payroll_run_id UUID REFERENCES payroll_runs(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE expense_reimbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY erre_read ON expense_reimbursements FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY erre_insert ON expense_reimbursements FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY erre_update ON expense_reimbursements FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_erre_company ON expense_reimbursements(company_id);
CREATE INDEX idx_erre_claim ON expense_reimbursements(claim_id);
CREATE INDEX idx_erre_employee ON expense_reimbursements(employee_id);
CREATE INDEX idx_erre_payroll ON expense_reimbursements(payroll_run_id) WHERE payroll_run_id IS NOT NULL;

CREATE TRIGGER update_erre_updated_at BEFORE UPDATE ON expense_reimbursements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Audit triggers for all asset & expense tables
-- ============================================================

CREATE TRIGGER audit_assets_changes
  AFTER INSERT OR UPDATE OR DELETE ON assets
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_asset_assignments_changes
  AFTER INSERT OR UPDATE OR DELETE ON asset_assignments
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_asset_maintenance_logs_changes
  AFTER INSERT OR UPDATE OR DELETE ON asset_maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_expense_policies_changes
  AFTER INSERT OR UPDATE OR DELETE ON expense_policies
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_expense_claims_changes
  AFTER INSERT OR UPDATE OR DELETE ON expense_claims
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_expense_receipts_changes
  AFTER INSERT OR UPDATE OR DELETE ON expense_receipts
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_expense_reimbursements_changes
  AFTER INSERT OR UPDATE OR DELETE ON expense_reimbursements
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- RBAC: asset_read/write, expense_read/write/approve
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('asset',         'read',    'View company assets and assignments'),
  ('asset',         'write',   'Create, edit, and assign assets'),
  ('expense',       'read',    'View expense claims and policies'),
  ('expense',       'write',   'Create and edit expense claims'),
  ('expense',       'approve', 'Approve or reject expense claims');

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource IN ('asset', 'expense');

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource IN ('asset', 'expense');

-- HR Manager: read/write/assign for assets, read/write/approve for expenses
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND (
  (p.resource = 'asset' AND p.action IN ('read', 'write'))
  OR (p.resource = 'expense' AND p.action IN ('read', 'write', 'approve'))
);

-- HR Staff: read for assets, read/write for expenses
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND (
  (p.resource = 'asset' AND p.action = 'read')
  OR (p.resource = 'expense' AND p.action IN ('read', 'write'))
);

-- Manager: read assets (team), read expenses (team)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND (
  (p.resource = 'asset' AND p.action = 'read')
  OR (p.resource = 'expense' AND p.action = 'read')
);

-- Employee: read own assets/expenses, write own expenses
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND (
  (p.resource = 'asset' AND p.action = 'read')
  OR (p.resource = 'expense' AND p.action IN ('read', 'write'))
);

-- Auditor: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.action = 'read'
  AND p.resource IN ('asset', 'expense');

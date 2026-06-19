-- ============================================================
-- Release 6B: Offboarding + Exit Management
-- Reverse workflow of onboarding
-- ============================================================

-- 1. Offboarding Templates
CREATE TABLE IF NOT EXISTS offboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  legal_entity_id UUID,
  country_code VARCHAR(10) NOT NULL DEFAULT 'TH',
  employee_type VARCHAR(20),
  offboarding_reason VARCHAR(30),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offboarding_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY obt_read ON offboarding_templates FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY obt_insert ON offboarding_templates FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY obt_update ON offboarding_templates FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY obt_delete ON offboarding_templates FOR DELETE USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr_manager'));

CREATE INDEX idx_obt_company ON offboarding_templates(company_id);

CREATE TRIGGER update_obt_updated_at BEFORE UPDATE ON offboarding_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Offboarding Template Items
CREATE TABLE IF NOT EXISTS offboarding_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES offboarding_templates(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL DEFAULT 'task',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT true,
  assigned_role VARCHAR(20) DEFAULT 'hr',
  sort_order INTEGER DEFAULT 0,
  due_days_before_last_day INTEGER,
  due_days_after_last_day INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offboarding_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY obti_read ON offboarding_template_items FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY obti_insert ON offboarding_template_items FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY obti_update ON offboarding_template_items FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY obti_delete ON offboarding_template_items FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_obti_template ON offboarding_template_items(template_id);

CREATE TRIGGER update_obti_updated_at BEFORE UPDATE ON offboarding_template_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Offboarding Cases
CREATE TABLE IF NOT EXISTS offboarding_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  manager_user_id UUID REFERENCES user_profiles(id),
  legal_entity_id UUID,
  template_id UUID REFERENCES offboarding_templates(id) ON DELETE SET NULL,
  offboarding_reason VARCHAR(30) NOT NULL,
  reason_notes TEXT,
  notice_date DATE,
  last_working_day DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  final_settlement_status VARCHAR(20) DEFAULT 'not_started',
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES user_profiles(id),
  override_completed BOOLEAN DEFAULT false,
  override_reason TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offboarding_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY obc_read ON offboarding_cases FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY obc_insert ON offboarding_cases FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY obc_update ON offboarding_cases FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_obc_company ON offboarding_cases(company_id);
CREATE INDEX idx_obc_employee ON offboarding_cases(employee_user_id);
CREATE INDEX idx_obc_status ON offboarding_cases(status);

CREATE TRIGGER update_obc_updated_at BEFORE UPDATE ON offboarding_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Offboarding Case Items
CREATE TABLE IF NOT EXISTS offboarding_case_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  offboarding_case_id UUID NOT NULL REFERENCES offboarding_cases(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES offboarding_template_items(id) ON DELETE SET NULL,
  item_type VARCHAR(20) NOT NULL DEFAULT 'task',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT true,
  assigned_role VARCHAR(20) DEFAULT 'hr',
  assigned_to UUID REFERENCES user_profiles(id),
  status VARCHAR(20) DEFAULT 'pending',
  due_date DATE,
  completed_by UUID REFERENCES user_profiles(id),
  completed_at TIMESTAMPTZ,
  skip_reason TEXT,
  block_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offboarding_case_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY obci_read ON offboarding_case_items FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY obci_insert ON offboarding_case_items FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY obci_update ON offboarding_case_items FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_obci_case ON offboarding_case_items(offboarding_case_id);
CREATE INDEX idx_obci_status ON offboarding_case_items(status);

CREATE TRIGGER update_obci_updated_at BEFORE UPDATE ON offboarding_case_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Offboarding Documents
CREATE TABLE IF NOT EXISTS offboarding_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  offboarding_case_id UUID NOT NULL REFERENCES offboarding_cases(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  generated_contract_id UUID,
  status VARCHAR(20) DEFAULT 'pending',
  required BOOLEAN DEFAULT true,
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offboarding_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY obd_read ON offboarding_documents FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY obd_insert ON offboarding_documents FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY obd_update ON offboarding_documents FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_obd_case ON offboarding_documents(offboarding_case_id);

CREATE TRIGGER update_obd_updated_at BEFORE UPDATE ON offboarding_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Offboarding Asset Returns
CREATE TABLE IF NOT EXISTS offboarding_asset_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  offboarding_case_id UUID NOT NULL REFERENCES offboarding_cases(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES user_profiles(id),
  asset_name VARCHAR(255) NOT NULL,
  asset_type VARCHAR(20) DEFAULT 'other',
  asset_identifier VARCHAR(255),
  return_required BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'pending',
  return_due_date DATE,
  returned_at TIMESTAMPTZ,
  received_by UUID REFERENCES user_profiles(id),
  condition_notes TEXT,
  deduction_amount NUMERIC(12,2),
  deduction_currency VARCHAR(3) DEFAULT 'THB',
  waiver_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offboarding_asset_returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY obar_read ON offboarding_asset_returns FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY obar_insert ON offboarding_asset_returns FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY obar_update ON offboarding_asset_returns FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_obar_case ON offboarding_asset_returns(offboarding_case_id);

CREATE TRIGGER update_obar_updated_at BEFORE UPDATE ON offboarding_asset_returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Offboarding Access Revocations
CREATE TABLE IF NOT EXISTS offboarding_access_revocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  offboarding_case_id UUID NOT NULL REFERENCES offboarding_cases(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES user_profiles(id),
  system_name VARCHAR(255) NOT NULL,
  access_type VARCHAR(20) DEFAULT 'app',
  revocation_required BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'pending',
  scheduled_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES user_profiles(id),
  failure_reason TEXT,
  skip_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE offboarding_access_revocations ENABLE ROW LEVEL SECURITY;
CREATE POLICY obar2_read ON offboarding_access_revocations FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY obar2_insert ON offboarding_access_revocations FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY obar2_update ON offboarding_access_revocations FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_obar2_case ON offboarding_access_revocations(offboarding_case_id);

CREATE TRIGGER update_obar2_updated_at BEFORE UPDATE ON offboarding_access_revocations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Exit Interviews
CREATE TABLE IF NOT EXISTS exit_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  offboarding_case_id UUID NOT NULL REFERENCES offboarding_cases(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES user_profiles(id),
  interviewer_user_id UUID REFERENCES user_profiles(id),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'not_required',
  feedback_summary TEXT,
  reason_for_leaving TEXT,
  would_recommend_company BOOLEAN,
  rehire_eligible BOOLEAN,
  private_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE exit_interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY ei_read ON exit_interviews FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ei_insert ON exit_interviews FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ei_update ON exit_interviews FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_ei_case ON exit_interviews(offboarding_case_id);

CREATE TRIGGER update_ei_updated_at BEFORE UPDATE ON exit_interviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Final Settlement Readiness
CREATE TABLE IF NOT EXISTS final_settlement_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  offboarding_case_id UUID NOT NULL REFERENCES offboarding_cases(id) ON DELETE CASCADE,
  employee_user_id UUID NOT NULL REFERENCES user_profiles(id),
  payroll_cycle_id UUID,
  status VARCHAR(20) DEFAULT 'not_started',
  blockers JSONB DEFAULT '[]'::jsonb,
  unpaid_leave_days NUMERIC(5,1),
  pending_expense_amount NUMERIC(12,2),
  asset_deduction_amount NUMERIC(12,2),
  notes TEXT,
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE final_settlement_readiness ENABLE ROW LEVEL SECURITY;
CREATE POLICY fsr_read ON final_settlement_readiness FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY fsr_insert ON final_settlement_readiness FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY fsr_update ON final_settlement_readiness FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_fsr_case ON final_settlement_readiness(offboarding_case_id);

CREATE TRIGGER update_fsr_updated_at BEFORE UPDATE ON final_settlement_readiness
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Seed default Thailand offboarding template
INSERT INTO offboarding_templates (company_id, name, description, country_code, is_default, is_active)
SELECT id, 'Thailand Default Offboarding', 'Standard SME offboarding checklist for Thailand', 'TH', true, true
FROM companies
WHERE NOT EXISTS (
  SELECT 1 FROM offboarding_templates ot WHERE ot.company_id = companies.id AND ot.is_default = true
);

-- 11. RBAC Permissions for offboarding
INSERT INTO permissions (id, resource, action, description) VALUES
  ('offboarding_read', 'offboarding', 'read', 'View offboarding cases'),
  ('offboarding_write', 'offboarding', 'write', 'Create and edit offboarding'),
  ('offboarding_approve', 'offboarding', 'approve', 'Approve offboarding completion'),
  ('offboarding_override', 'offboarding', 'override', 'Override offboarding completion requirements'),
  ('offboarding_template_read', 'offboarding_template', 'read', 'View offboarding templates'),
  ('offboarding_template_write', 'offboarding_template', 'write', 'Create and edit offboarding templates'),
  ('offboarding_asset_return', 'offboarding_asset', 'return', 'Mark assets as returned'),
  ('offboarding_access_revoke', 'offboarding_access', 'revoke', 'Revoke employee access'),
  ('exit_interview_read', 'exit_interview', 'read', 'View exit interviews'),
  ('exit_interview_write', 'exit_interview', 'write', 'Create and complete exit interviews'),
  ('final_settlement_read', 'final_settlement', 'read', 'View final settlement readiness'),
  ('final_settlement_write', 'final_settlement', 'write', 'Edit final settlement readiness'),
  ('final_settlement_approve', 'final_settlement', 'approve', 'Approve final settlement readiness')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('owner', 'offboarding_read'), ('owner', 'offboarding_write'), ('owner', 'offboarding_approve'),
  ('owner', 'offboarding_override'), ('owner', 'offboarding_template_read'), ('owner', 'offboarding_template_write'),
  ('owner', 'offboarding_asset_return'), ('owner', 'offboarding_access_revoke'),
  ('owner', 'exit_interview_read'), ('owner', 'exit_interview_write'),
  ('owner', 'final_settlement_read'), ('owner', 'final_settlement_write'), ('owner', 'final_settlement_approve'),
  ('admin', 'offboarding_read'), ('admin', 'offboarding_write'), ('admin', 'offboarding_approve'),
  ('admin', 'offboarding_override'), ('admin', 'offboarding_template_read'), ('admin', 'offboarding_template_write'),
  ('admin', 'offboarding_asset_return'), ('admin', 'offboarding_access_revoke'),
  ('admin', 'exit_interview_read'), ('admin', 'exit_interview_write'),
  ('admin', 'final_settlement_read'), ('admin', 'final_settlement_write'), ('admin', 'final_settlement_approve'),
  ('hr_manager', 'offboarding_read'), ('hr_manager', 'offboarding_write'), ('hr_manager', 'offboarding_approve'),
  ('hr_manager', 'offboarding_template_read'), ('hr_manager', 'offboarding_template_write'),
  ('hr_manager', 'offboarding_asset_return'), ('hr_manager', 'offboarding_access_revoke'),
  ('hr_manager', 'exit_interview_read'), ('hr_manager', 'exit_interview_write'),
  ('hr_manager', 'final_settlement_read'), ('hr_manager', 'final_settlement_write'), ('hr_manager', 'final_settlement_approve'),
  ('hr_staff', 'offboarding_read'), ('hr_staff', 'offboarding_write'),
  ('hr_staff', 'offboarding_asset_return'), ('hr_staff', 'exit_interview_read'), ('hr_staff', 'exit_interview_write'),
  ('manager', 'offboarding_read'), ('manager', 'exit_interview_read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

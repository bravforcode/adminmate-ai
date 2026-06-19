-- ============================================================
-- Release 6: Onboarding + Documents + Contract Templates
-- Builds on existing onboarding_checklists, onboarding_tasks,
-- documents, document_signatures, storage buckets
-- ============================================================

-- 1. Onboarding Templates
CREATE TABLE IF NOT EXISTS onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  legal_entity_id UUID,
  country_code VARCHAR(10) NOT NULL DEFAULT 'TH',
  employee_type VARCHAR(20) NOT NULL DEFAULT 'full_time',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE onboarding_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY ot_read ON onboarding_templates FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ot_insert ON onboarding_templates FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ot_update ON onboarding_templates FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ot_delete ON onboarding_templates FOR DELETE USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr_manager'));

CREATE INDEX idx_ot_company ON onboarding_templates(company_id);
CREATE INDEX idx_ot_country ON onboarding_templates(country_code);

CREATE TRIGGER update_ot_updated_at BEFORE UPDATE ON onboarding_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Onboarding Template Items
CREATE TABLE IF NOT EXISTS onboarding_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES onboarding_templates(id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL DEFAULT 'document',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  document_type VARCHAR(50),
  required BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  due_days_after_hire INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE onboarding_template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY oti_read ON onboarding_template_items FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY oti_insert ON onboarding_template_items FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY oti_update ON onboarding_template_items FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY oti_delete ON onboarding_template_items FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_oti_template ON onboarding_template_items(template_id);

CREATE TRIGGER update_oti_updated_at BEFORE UPDATE ON onboarding_template_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Onboarding Instances (per candidate/employee)
CREATE TABLE IF NOT EXISTS onboarding_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  legal_entity_id UUID,
  template_id UUID REFERENCES onboarding_templates(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'draft',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES user_profiles(id),
  override_completed BOOLEAN DEFAULT false,
  override_reason TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE onboarding_instances ENABLE ROW LEVEL SECURITY;
CREATE POLICY oi_read ON onboarding_instances FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY oi_insert ON onboarding_instances FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY oi_update ON onboarding_instances FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_oi_company ON onboarding_instances(company_id);
CREATE INDEX idx_oi_candidate ON onboarding_instances(candidate_id);
CREATE INDEX idx_oi_status ON onboarding_instances(status);

CREATE TRIGGER update_oi_updated_at BEFORE UPDATE ON onboarding_instances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Onboarding Instance Items
CREATE TABLE IF NOT EXISTS onboarding_instance_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  onboarding_instance_id UUID NOT NULL REFERENCES onboarding_instances(id) ON DELETE CASCADE,
  template_item_id UUID REFERENCES onboarding_template_items(id) ON DELETE SET NULL,
  item_type VARCHAR(20) NOT NULL DEFAULT 'document',
  title VARCHAR(255) NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT true,
  status VARCHAR(20) DEFAULT 'pending',
  due_date DATE,
  assigned_to UUID REFERENCES user_profiles(id),
  completed_by UUID REFERENCES user_profiles(id),
  completed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  skip_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE onboarding_instance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY oii_read ON onboarding_instance_items FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY oii_insert ON onboarding_instance_items FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY oii_update ON onboarding_instance_items FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_oii_instance ON onboarding_instance_items(onboarding_instance_id);
CREATE INDEX idx_oii_status ON onboarding_instance_items(status);

CREATE TRIGGER update_oii_updated_at BEFORE UPDATE ON onboarding_instance_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Onboarding Document Requests (secure upload flow)
CREATE TABLE IF NOT EXISTS onboarding_document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  onboarding_instance_id UUID NOT NULL REFERENCES onboarding_instances(id) ON DELETE CASCADE,
  onboarding_item_id UUID NOT NULL REFERENCES onboarding_instance_items(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  document_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  secure_upload_token_hash VARCHAR(64),
  token_expires_at TIMESTAMPTZ,
  requested_by UUID REFERENCES user_profiles(id),
  requested_at TIMESTAMPTZ,
  message_draft_id UUID,
  uploaded_document_id UUID,
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES user_profiles(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE onboarding_document_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY odr_read ON onboarding_document_requests FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY odr_insert ON onboarding_document_requests FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY odr_update ON onboarding_document_requests FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_odr_instance ON onboarding_document_requests(onboarding_instance_id);
CREATE INDEX idx_odr_token ON onboarding_document_requests(secure_upload_token_hash);

CREATE TRIGGER update_odr_updated_at BEFORE UPDATE ON onboarding_document_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Contract Templates
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  legal_entity_id UUID,
  country_code VARCHAR(10) NOT NULL DEFAULT 'TH',
  employee_type VARCHAR(20) NOT NULL DEFAULT 'full_time',
  template_key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  language_code VARCHAR(5) DEFAULT 'en',
  body_template TEXT NOT NULL,
  variables_schema JSONB DEFAULT '[]'::jsonb,
  version_number INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  requires_legal_review BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY ct_read ON contract_templates FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ct_insert ON contract_templates FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ct_update ON contract_templates FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ct_delete ON contract_templates FOR DELETE USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr_manager'));

CREATE INDEX idx_ct_company ON contract_templates(company_id);

CREATE TRIGGER update_ct_updated_at BEFORE UPDATE ON contract_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Generated Contracts
CREATE TABLE IF NOT EXISTS generated_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contract_template_id UUID NOT NULL REFERENCES contract_templates(id) ON DELETE CASCADE,
  onboarding_instance_id UUID REFERENCES onboarding_instances(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES offers(id) ON DELETE SET NULL,
  language_code VARCHAR(5) DEFAULT 'en',
  rendered_body TEXT NOT NULL,
  variables_snapshot JSONB DEFAULT '{}'::jsonb,
  ai_generated BOOLEAN DEFAULT false,
  ai_run_id UUID,
  status VARCHAR(20) DEFAULT 'draft',
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE generated_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY gc_read ON generated_contracts FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY gc_insert ON generated_contracts FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY gc_update ON generated_contracts FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_gc_company ON generated_contracts(company_id);
CREATE INDEX idx_gc_status ON generated_contracts(status);

CREATE TRIGGER update_gc_updated_at BEFORE UPDATE ON generated_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. E-Signature Requests
CREATE TABLE IF NOT EXISTS esignature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  generated_contract_id UUID NOT NULL REFERENCES generated_contracts(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL DEFAULT 'manual',
  provider_request_id VARCHAR(255),
  status VARCHAR(20) DEFAULT 'not_configured',
  signer_email VARCHAR(255),
  signer_name VARCHAR(255),
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE esignature_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY esr_read ON esignature_requests FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY esr_insert ON esignature_requests FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY esr_update ON esignature_requests FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_esr_company ON esignature_requests(company_id);
CREATE INDEX idx_esr_contract ON esignature_requests(generated_contract_id);

CREATE TRIGGER update_esr_updated_at BEFORE UPDATE ON esignature_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. Document Type Configuration
CREATE TABLE IF NOT EXISTS document_type_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  label_th VARCHAR(255),
  country_code VARCHAR(10),
  is_sensitive BOOLEAN DEFAULT false,
  requires_expiry_date BOOLEAN DEFAULT false,
  requires_verification BOOLEAN DEFAULT true,
  allowed_mime_types JSONB DEFAULT '["application/pdf","image/jpeg","image/png"]'::jsonb,
  max_file_size_mb INTEGER DEFAULT 10,
  retention_policy_key VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed document types
INSERT INTO document_type_configs (document_key, label, label_th, is_sensitive, requires_expiry_date) VALUES
  ('id_card', 'ID Card', 'บัตรประชาชน', true, false),
  ('house_registration', 'House Registration', 'สำเนาทะเบียนบ้าน', true, false),
  ('bank_account', 'Bank Account Details', 'ข้อมูลบัญชีธนาคาร', true, false),
  ('profile_photo', 'Profile Photo', 'รูปถ่าย', false, false),
  ('medical_certificate', 'Medical Certificate', 'ใบรับรองแพทย์', false, true),
  ('employment_contract', 'Employment Contract', 'สัญญาจ้างงาน', false, false),
  ('social_security', 'Social Security Document', 'เอกสารประกันสังคม', false, false),
  ('tax_form', 'Tax Form / Withholding', 'แบบฟอร์มภาษี', false, false),
  ('work_permit', 'Work Permit', 'ใบอนุญาตทำงาน', false, true),
  ('visa', 'Visa', 'วีซ่า', false, true),
  ('education_certificate', 'Education Certificate', 'ใบรับรองการศึกษา', false, false),
  ('professional_license', 'Professional License', 'ใบอนุญาตประกอบวิชาชีพ', false, true),
  ('other', 'Other Document', 'เอกสารอื่นๆ', false, false)
ON CONFLICT (document_key) DO NOTHING;

-- 10. Add new storage bucket for onboarding documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('onboarding-docs', 'onboarding-docs', false, 10485760,
   ARRAY['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
ON CONFLICT (id) DO NOTHING;

-- Storage policy for onboarding-docs (company-scoped)
CREATE POLICY "onboarding_docs_read_company" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'onboarding-docs'
    AND (storage.foldername(name))[1] = (auth.jwt()->>'company_id')
  );

CREATE POLICY "onboarding_docs_insert_company" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'onboarding-docs'
    AND (storage.foldername(name))[1] = (auth.jwt()->>'company_id')
  );

-- 11. RBAC Permissions for onboarding + contracts
INSERT INTO permissions (id, resource, action, description) VALUES
  ('onboarding_read', 'onboarding', 'read', 'View onboarding instances'),
  ('onboarding_write', 'onboarding', 'write', 'Create and edit onboarding'),
  ('onboarding_approve', 'onboarding', 'approve', 'Approve onboarding completion'),
  ('onboarding_override', 'onboarding', 'override', 'Override onboarding completion requirements'),
  ('document_request', 'document', 'request', 'Request documents from candidates/employees'),
  ('document_verify', 'document', 'verify', 'Verify uploaded documents'),
  ('document_reject', 'document', 'reject', 'Reject uploaded documents'),
  ('contract_template_read', 'contract_template', 'read', 'View contract templates'),
  ('contract_template_write', 'contract_template', 'write', 'Create and edit contract templates'),
  ('contract_generate', 'contract', 'generate', 'Generate contracts from templates'),
  ('contract_approve', 'contract', 'approve', 'Approve generated contracts'),
  ('contract_send_signature', 'contract', 'send_signature', 'Send contracts for e-signature'),
  ('esignature_send', 'esignature', 'send', 'Send e-signature requests')
ON CONFLICT (id) DO NOTHING;

-- Role mapping for onboarding permissions
INSERT INTO role_permissions (role_id, permission_id) VALUES
  ('owner', 'onboarding_read'), ('owner', 'onboarding_write'), ('owner', 'onboarding_approve'),
  ('owner', 'onboarding_override'), ('owner', 'document_request'), ('owner', 'document_verify'),
  ('owner', 'document_reject'), ('owner', 'contract_template_read'), ('owner', 'contract_template_write'),
  ('owner', 'contract_generate'), ('owner', 'contract_approve'), ('owner', 'contract_send_signature'),
  ('owner', 'esignature_send'),
  ('admin', 'onboarding_read'), ('admin', 'onboarding_write'), ('admin', 'onboarding_approve'),
  ('admin', 'onboarding_override'), ('admin', 'document_request'), ('admin', 'document_verify'),
  ('admin', 'document_reject'), ('admin', 'contract_template_read'), ('admin', 'contract_template_write'),
  ('admin', 'contract_generate'), ('admin', 'contract_approve'), ('admin', 'contract_send_signature'),
  ('admin', 'esignature_send'),
  ('hr_manager', 'onboarding_read'), ('hr_manager', 'onboarding_write'), ('hr_manager', 'onboarding_approve'),
  ('hr_manager', 'document_request'), ('hr_manager', 'document_verify'), ('hr_manager', 'document_reject'),
  ('hr_manager', 'contract_template_read'), ('hr_manager', 'contract_template_write'),
  ('hr_manager', 'contract_generate'), ('hr_manager', 'contract_approve'), ('hr_manager', 'contract_send_signature'),
  ('hr_manager', 'esignature_send'),
  ('hr_staff', 'onboarding_read'), ('hr_staff', 'onboarding_write'),
  ('hr_staff', 'document_request'), ('hr_staff', 'document_verify'),
  ('hr_staff', 'contract_template_read'), ('hr_staff', 'contract_generate')
ON CONFLICT (role_id, permission_id) DO NOTHING;

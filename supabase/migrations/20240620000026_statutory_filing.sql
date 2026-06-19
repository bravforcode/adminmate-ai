-- ============================================================
-- Release 9D: Statutory Filing + Government Submission Framework
-- Tables: statutory_report_definitions, statutory_filing_periods,
--         statutory_filings, statutory_filing_documents
-- CRITICAL: Default is manual file generation.
--           Direct submission requires configured provider.
-- ============================================================

-- 1. Statutory Report Definitions (template catalog per country)
CREATE TABLE IF NOT EXISTS statutory_report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  country_code VARCHAR(3) NOT NULL,
  description TEXT,
  frequency VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, report_key),
  CONSTRAINT valid_frequency CHECK (frequency IN ('monthly', 'quarterly', 'annually', 'one_off'))
);

ALTER TABLE statutory_report_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY srd_read ON statutory_report_definitions FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY srd_insert ON statutory_report_definitions FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY srd_update ON statutory_report_definitions FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_srd_company ON statutory_report_definitions(company_id);
CREATE INDEX idx_srd_country ON statutory_report_definitions(country_code);
CREATE INDEX idx_srd_active ON statutory_report_definitions(company_id, is_active);

CREATE TRIGGER update_srd_updated_at BEFORE UPDATE ON statutory_report_definitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Statutory Filing Periods (filing windows with due dates)
CREATE TABLE IF NOT EXISTS statutory_filing_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_def_id UUID NOT NULL REFERENCES statutory_report_definitions(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_period_dates CHECK (period_end >= period_start),
  CONSTRAINT valid_period_status CHECK (status IN ('open', 'in_progress', 'filed', 'overdue', 'closed'))
);

ALTER TABLE statutory_filing_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY sfp_read ON statutory_filing_periods FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY sfp_insert ON statutory_filing_periods FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY sfp_update ON statutory_filing_periods FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_sfp_company ON statutory_filing_periods(company_id);
CREATE INDEX idx_sfp_report_def ON statutory_filing_periods(report_def_id);
CREATE INDEX idx_sfp_status ON statutory_filing_periods(company_id, status);
CREATE INDEX idx_sfp_due ON statutory_filing_periods(due_date);

CREATE TRIGGER update_sfp_updated_at BEFORE UPDATE ON statutory_filing_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Statutory Filings (individual filing records)
CREATE TABLE IF NOT EXISTS statutory_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_id UUID NOT NULL REFERENCES statutory_filing_periods(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'draft',
  filed_at TIMESTAMPTZ,
  filed_by UUID REFERENCES user_profiles(id),
  acknowledgement_number VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_filing_status CHECK (status IN ('draft', 'ready', 'submitted', 'acknowledged', 'rejected', 'cancelled'))
);

ALTER TABLE statutory_filings ENABLE ROW LEVEL SECURITY;
CREATE POLICY sf_read ON statutory_filings FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY sf_insert ON statutory_filings FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY sf_update ON statutory_filings FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_sf_company ON statutory_filings(company_id);
CREATE INDEX idx_sf_period ON statutory_filings(period_id);
CREATE INDEX idx_sf_status ON statutory_filings(company_id, status);

CREATE TRIGGER update_sf_updated_at BEFORE UPDATE ON statutory_filings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Statutory Filing Documents (links generated files to a filing)
CREATE TABLE IF NOT EXISTS statutory_filing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  filing_id UUID NOT NULL REFERENCES statutory_filings(id) ON DELETE CASCADE,
  document_type VARCHAR(100) NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  file_url TEXT,
  status VARCHAR(20) DEFAULT 'generated',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_doc_status CHECK (status IN ('generated', 'approved', 'submitted', 'superseded'))
);

ALTER TABLE statutory_filing_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY sfd_read ON statutory_filing_documents FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY sfd_insert ON statutory_filing_documents FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY sfd_update ON statutory_filing_documents FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_sfd_company ON statutory_filing_documents(company_id);
CREATE INDEX idx_sfd_filing ON statutory_filing_documents(filing_id);
CREATE INDEX idx_sfd_document ON statutory_filing_documents(document_id);

CREATE TRIGGER update_sfd_updated_at BEFORE UPDATE ON statutory_filing_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RBAC: Statutory Filing permissions
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('statutory_filing', 'read',   'View statutory filings and reports'),
  ('statutory_filing', 'write',  'Create and manage statutory filings'),
  ('statutory_filing', 'submit', 'Submit statutory filings to government')
ON CONFLICT (resource, action) DO NOTHING;

-- Owner: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'statutory_filing';

-- Admin: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'statutory_filing';

-- HR Manager: read + write + submit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'statutory_filing' AND p.action IN ('read', 'write', 'submit');

-- HR Staff: read + write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'statutory_filing' AND p.action IN ('read', 'write');

-- Finance Approver: read + submit
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'finance_approver' AND p.resource = 'statutory_filing' AND p.action IN ('read', 'submit');

-- Employee: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'statutory_filing' AND p.action = 'read';

-- Auditor: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource = 'statutory_filing' AND p.action = 'read';

-- ============================================================
-- SEED: Thailand statutory filing types
-- These are definitions per-company; seeds use a sentinel
-- company_id that must be replaced per-tenant at runtime.
-- ============================================================

INSERT INTO statutory_report_definitions (id, company_id, report_key, name, country_code, description, frequency, is_active) VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'social_security_monthly', 'Social Security Monthly Filing (สปส.)', 'TH', 'Monthly social security contribution report for the Social Security Office. Employee and employer 5% contributions.', 'monthly', true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'withholding_tax_monthly', 'Withholding Tax Monthly Filing (ภ.ง.ด.1)', 'TH', 'Monthly withholding tax remittance form for the Revenue Department. Covers employee income tax deductions.', 'monthly', true),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'pink_card_annual', 'Pink Card Annual Filing (ประกันสังคม)', 'TH', 'Annual social security registration and employee census report.', 'annually', true)
ON CONFLICT (company_id, report_key) DO NOTHING;

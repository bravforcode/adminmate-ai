-- ============================================================
-- Release 19B: Vendor & Contractor / Non-Employee Workforce
-- Vendor companies, vendor workers, contractor engagements,
-- contractor invoices with approval workflow.
-- Contractor NOT treated as employee by default.
-- Access expiry tracked per engagement.
-- ============================================================

-- 1. Vendor Companies
CREATE TABLE IF NOT EXISTS vendor_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  country_code VARCHAR(10),
  status VARCHAR(30) DEFAULT 'active',
  contract_start DATE,
  contract_end DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY vc_read ON vendor_companies FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY vc_insert ON vendor_companies FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY vc_update ON vendor_companies FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY vc_delete ON vendor_companies FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_vc_company ON vendor_companies(company_id);
CREATE INDEX idx_vc_status ON vendor_companies(status);

CREATE TRIGGER update_vc_updated_at BEFORE UPDATE ON vendor_companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Vendor Workers (non-employee workers attached to a vendor)
CREATE TABLE IF NOT EXISTS vendor_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendor_companies(id) ON DELETE CASCADE,
  worker_name VARCHAR(255) NOT NULL,
  worker_email VARCHAR(255),
  role VARCHAR(100),
  start_date DATE,
  end_date DATE,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY vw_read ON vendor_workers FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY vw_insert ON vendor_workers FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY vw_update ON vendor_workers FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY vw_delete ON vendor_workers FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_vw_company ON vendor_workers(company_id);
CREATE INDEX idx_vw_vendor ON vendor_workers(vendor_id);
CREATE INDEX idx_vw_status ON vendor_workers(status);

CREATE TRIGGER update_vw_updated_at BEFORE UPDATE ON vendor_workers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Contractor Engagements (links a vendor worker or direct contractor to the company)
CREATE TABLE IF NOT EXISTS contractor_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendor_companies(id) ON DELETE CASCADE,
  employee_id UUID,
  contractor_name VARCHAR(255) NOT NULL,
  engagement_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_rate NUMERIC(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'THB',
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

ALTER TABLE contractor_engagements ENABLE ROW LEVEL SECURITY;

CREATE POLICY ce_read ON contractor_engagements FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ce_insert ON contractor_engagements FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ce_update ON contractor_engagements FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ce_delete ON contractor_engagements FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_ce_company ON contractor_engagements(company_id);
CREATE INDEX idx_ce_vendor ON contractor_engagements(vendor_id);
CREATE INDEX idx_ce_status ON contractor_engagements(status);
CREATE INDEX idx_ce_dates ON contractor_engagements(start_date, end_date);

CREATE TRIGGER update_ce_updated_at BEFORE UPDATE ON contractor_engagements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Contractor Invoices (approval workflow: pending → approved/rejected)
CREATE TABLE IF NOT EXISTS contractor_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  engagement_id UUID NOT NULL REFERENCES contractor_engagements(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'THB',
  invoice_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contractor_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY ci_read ON contractor_invoices FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ci_insert ON contractor_invoices FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ci_update ON contractor_invoices FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ci_delete ON contractor_invoices FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_ci_company ON contractor_invoices(company_id);
CREATE INDEX idx_ci_engagement ON contractor_invoices(engagement_id);
CREATE INDEX idx_ci_status ON contractor_invoices(status);
CREATE INDEX idx_ci_invoice_number ON contractor_invoices(invoice_number);

CREATE TRIGGER update_ci_updated_at BEFORE UPDATE ON contractor_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Access expiry enforcement:
-- Contractor engagements past end_date cannot be invoiced
-- ============================================================

CREATE OR REPLACE FUNCTION check_engagement_active_before_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM contractor_engagements ce
    WHERE ce.id = NEW.engagement_id
      AND ce.end_date < CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'Cannot invoice: engagement has expired';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM contractor_engagements ce
    WHERE ce.id = NEW.engagement_id
      AND ce.status != 'active'
  ) THEN
    RAISE EXCEPTION 'Cannot invoice: engagement is not active';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_engagement_active
  BEFORE INSERT ON contractor_invoices
  FOR EACH ROW EXECUTE FUNCTION check_engagement_active_before_invoice();

-- ============================================================
-- Audit triggers
-- ============================================================

CREATE TRIGGER audit_vendor_companies_changes
  AFTER INSERT OR UPDATE OR DELETE ON vendor_companies
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_vendor_workers_changes
  AFTER INSERT OR UPDATE OR DELETE ON vendor_workers
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_contractor_engagements_changes
  AFTER INSERT OR UPDATE OR DELETE ON contractor_engagements
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_contractor_invoices_changes
  AFTER INSERT OR UPDATE OR DELETE ON contractor_invoices
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- RBAC: contractor_read / contractor_write / contractor_approve
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('contractor', 'read',    'View vendors, workers, engagements'),
  ('contractor', 'write',   'Create/edit vendors, workers, engagements'),
  ('contractor', 'approve', 'Approve contractor invoices');

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'contractor';

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'contractor';

-- HR Manager: read/write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'contractor' AND p.action IN ('read', 'write');

-- HR Staff: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'contractor' AND p.action = 'read';

-- Finance Approver: read + approve
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'finance_approver' AND p.resource = 'contractor' AND p.action IN ('read', 'approve');

-- Manager: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'contractor' AND p.action = 'read';

-- Auditor: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource = 'contractor' AND p.action = 'read';

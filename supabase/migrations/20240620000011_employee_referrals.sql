-- ============================================================
-- Release 2: Employee Referral System + Recruiting Audit Fixes
-- ============================================================

-- Ensure update_updated_at_column() exists (may not be created yet)
-- This function is also defined in 000023_triggers.sql as update_updated_at()
-- Using CREATE OR REPLACE so it's safe if already exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure log_audit_changes() exists for audit triggers
CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (company_id, action, resource_type, resource_id, details)
    VALUES (NEW.company_id, TG_OP || '_' || TG_TABLE_NAME, TG_TABLE_NAME::text, NEW.id::text, row_to_json(NEW)::jsonb);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (company_id, action, resource_type, resource_id, details)
    VALUES (NEW.company_id, TG_OP || '_' || TG_TABLE_NAME, TG_TABLE_NAME::text, NEW.id::text, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (company_id, action, resource_type, resource_id, details)
    VALUES (OLD.company_id, TG_OP || '_' || TG_TABLE_NAME, TG_TABLE_NAME::text, OLD.id::text, row_to_json(OLD)::jsonb);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. Employee Referrals table
CREATE TABLE IF NOT EXISTS employee_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_name VARCHAR(255) NOT NULL,
  candidate_email VARCHAR(255),
  candidate_phone VARCHAR(50),
  candidate_linkedin TEXT,
  relationship VARCHAR(50) DEFAULT 'former_colleague',
  referral_notes TEXT,
  status VARCHAR(30) DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  interviewed_at TIMESTAMPTZ,
  hired_at TIMESTAMPTZ,
  bonus_amount NUMERIC(12,2),
  bonus_currency VARCHAR(3) DEFAULT 'THB',
  bonus_status VARCHAR(20) DEFAULT 'pending',
  bonus_paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE employee_referrals ENABLE ROW LEVEL SECURITY;

-- RLS: read for company members, write for referrer + admin/hr
CREATE POLICY employee_referrals_read ON employee_referrals
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY employee_referrals_insert ON employee_referrals
  FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY employee_referrals_update ON employee_referrals
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND (
      referrer_user_id = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
    )
  );

CREATE POLICY employee_referrals_delete ON employee_referrals
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE INDEX IF NOT EXISTS idx_referrals_company ON employee_referrals(company_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON employee_referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_job ON employee_referrals(job_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON employee_referrals(status);
CREATE UNIQUE INDEX idx_referrals_unique_referral ON employee_referrals(company_id, job_id, candidate_email);

-- updated_at trigger
CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON employee_referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger
CREATE TRIGGER audit_referral_changes
  AFTER INSERT OR UPDATE OR DELETE ON employee_referrals
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- 2. Fix cv_documents: add updated_at + audit trigger
ALTER TABLE cv_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE TRIGGER update_cv_documents_updated_at
  BEFORE UPDATE ON cv_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_cv_document_changes
  AFTER INSERT OR UPDATE OR DELETE ON cv_documents
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- 3. Fix interviews: add audit trigger (updated_at already exists)
CREATE TRIGGER audit_interview_changes
  AFTER INSERT OR UPDATE OR DELETE ON interviews
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- 4. Referral helper function: auto-status on candidate hire
CREATE OR REPLACE FUNCTION on_referral_candidate_hired()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'hired' AND OLD.status IS DISTINCT FROM 'hired' THEN
    UPDATE employee_referrals
    SET status = 'hired',
        hired_at = NOW(),
        updated_at = NOW()
    WHERE application_id = NEW.id
      AND status IN ('submitted', 'reviewed', 'interviewed');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_referral_on_hire
  AFTER UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION on_referral_candidate_hired();

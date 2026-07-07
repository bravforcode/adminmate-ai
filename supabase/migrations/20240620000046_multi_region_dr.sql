-- ============================================================
-- Release 23: Global Multi-Region, Data Residency, DR/BCP
-- ============================================================

-- 1. Data Residency Policies
-- Region setting cannot be changed without approval.
CREATE TABLE IF NOT EXISTS data_residency_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  region VARCHAR(10) NOT NULL,  -- 'us-east-1', 'eu-west-1', 'ap-southeast-1', etc.
  data_types JSONB NOT NULL DEFAULT '[]',  -- ['employee', 'payroll', 'candidate', etc.]
  is_active BOOLEAN DEFAULT true,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, region)
);

-- 2. Backup Jobs (audit trail for all backups)
CREATE TABLE IF NOT EXISTS backup_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  backup_type VARCHAR(50) NOT NULL,  -- 'full', 'incremental', 'snapshot'
  status VARCHAR(30) DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  size_bytes BIGINT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Restore Test Runs (drill tracking)
CREATE TABLE IF NOT EXISTS restore_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  backup_job_id UUID NOT NULL REFERENCES backup_jobs(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Disaster Recovery Plans
CREATE TABLE IF NOT EXISTS disaster_recovery_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_name VARCHAR(255) NOT NULL,
  rpo_hours INTEGER NOT NULL CHECK (rpo_hours >= 0),  -- Recovery Point Objective
  rto_hours INTEGER NOT NULL CHECK (rto_hours >= 0),  -- Recovery Time Objective
  last_tested_at TIMESTAMPTZ,
  next_test_due DATE,
  status VARCHAR(30) DEFAULT 'draft',  -- 'draft', 'active', 'archived'
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_data_residency_company ON data_residency_policies(company_id);
CREATE INDEX IF NOT EXISTS idx_data_residency_region ON data_residency_policies(region);
CREATE INDEX IF NOT EXISTS idx_data_residency_active ON data_residency_policies(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_backup_jobs_company ON backup_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_type ON backup_jobs(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_created ON backup_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_restore_test_company ON restore_test_runs(company_id);
CREATE INDEX IF NOT EXISTS idx_restore_test_backup ON restore_test_runs(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_restore_test_status ON restore_test_runs(status);

CREATE INDEX IF NOT EXISTS idx_dr_plans_company ON disaster_recovery_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_dr_plans_status ON disaster_recovery_plans(status);
CREATE INDEX IF NOT EXISTS idx_dr_plans_next_test ON disaster_recovery_plans(next_test_due);

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE data_residency_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE restore_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE disaster_recovery_plans ENABLE ROW LEVEL SECURITY;

-- data_residency_policies: company members read, admin/owner write
CREATE POLICY data_residency_read ON data_residency_policies
  FOR SELECT USING (
    company_id = safe_user_company_id()
  );

CREATE POLICY data_residency_insert ON data_residency_policies
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'owner')
  );

CREATE POLICY data_residency_update ON data_residency_policies
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'owner')
  );

CREATE POLICY data_residency_delete ON data_residency_policies
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() = 'owner'
  );

-- backup_jobs: company members read, admin/owner write
CREATE POLICY backup_jobs_read ON backup_jobs
  FOR SELECT USING (
    company_id = safe_user_company_id()
  );

CREATE POLICY backup_jobs_insert ON backup_jobs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'owner')
  );

CREATE POLICY backup_jobs_update ON backup_jobs
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'owner')
  );

-- restore_test_runs: company members read, admin/owner write
CREATE POLICY restore_test_read ON restore_test_runs
  FOR SELECT USING (
    company_id = safe_user_company_id()
  );

CREATE POLICY restore_test_insert ON restore_test_runs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'owner')
  );

CREATE POLICY restore_test_update ON restore_test_runs
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'owner')
  );

-- disaster_recovery_plans: company members read, admin/owner write
CREATE POLICY dr_plans_read ON disaster_recovery_plans
  FOR SELECT USING (
    company_id = safe_user_company_id()
  );

CREATE POLICY dr_plans_insert ON disaster_recovery_plans
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'owner')
  );

CREATE POLICY dr_plans_update ON disaster_recovery_plans
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'owner')
  );

CREATE POLICY dr_plans_delete ON disaster_recovery_plans
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() = 'owner'
  );

-- ============================================================
-- RBAC: dr_read/dr_write permissions (owner/admin only)
-- ============================================================
INSERT INTO permissions (resource, action, display_name) VALUES
  ('dr', 'read',   'View disaster recovery data'),
  ('dr', 'write',  'Manage disaster recovery policies and jobs');

-- Owner gets dr permissions (already has everything via wildcard)
-- Admin gets dr permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'dr' AND p.action IN ('read', 'write');

-- Auditor gets read-only for DR
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource = 'dr' AND p.action = 'read';

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_dr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_data_residency_updated_at
  BEFORE UPDATE ON data_residency_policies
  FOR EACH ROW EXECUTE FUNCTION update_dr_updated_at();

CREATE TRIGGER trg_dr_plans_updated_at
  BEFORE UPDATE ON disaster_recovery_plans
  FOR EACH ROW EXECUTE FUNCTION update_dr_updated_at();

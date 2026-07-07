-- ============================================================
-- Release 9C: Data Import/Export & Migration Tooling
-- Import jobs, column mappings, validation, row results,
-- export jobs, RBAC permissions, audit triggers
-- ============================================================

-- 1. Import Jobs
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'mapping', 'validating', 'importing', 'completed', 'failed')),
  total_rows INTEGER DEFAULT 0,
  processed_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ij_read ON import_jobs FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ij_insert ON import_jobs FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ij_update ON import_jobs FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ij_company ON import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_ij_status ON import_jobs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_ij_entity ON import_jobs(company_id, entity_type);

CREATE TRIGGER update_ij_updated_at BEFORE UPDATE ON import_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Import Files (uploaded source files)
CREATE TABLE IF NOT EXISTS import_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE import_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY ifile_read ON import_files FOR SELECT
  USING (import_job_id IN (SELECT id FROM import_jobs WHERE company_id = safe_user_company_id()));
CREATE POLICY ifile_insert ON import_files FOR INSERT
  WITH CHECK (import_job_id IN (SELECT id FROM import_jobs WHERE company_id = safe_user_company_id()));

CREATE INDEX IF NOT EXISTS idx_ifile_job ON import_files(import_job_id);

-- 3. Import Column Mappings
CREATE TABLE IF NOT EXISTS import_column_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  source_column VARCHAR(255) NOT NULL,
  target_field VARCHAR(255) NOT NULL,
  transform_rule JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE import_column_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY icm_read ON import_column_mappings FOR SELECT
  USING (import_job_id IN (SELECT id FROM import_jobs WHERE company_id = safe_user_company_id()));
CREATE POLICY icm_insert ON import_column_mappings FOR INSERT
  WITH CHECK (import_job_id IN (SELECT id FROM import_jobs WHERE company_id = safe_user_company_id()));
CREATE POLICY icm_delete ON import_column_mappings FOR DELETE
  USING (import_job_id IN (SELECT id FROM import_jobs WHERE company_id = safe_user_company_id()));

CREATE INDEX IF NOT EXISTS idx_icm_job ON import_column_mappings(import_job_id);

-- 4. Import Validation Errors
CREATE TABLE IF NOT EXISTS import_validation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  column_name VARCHAR(255),
  error_message TEXT NOT NULL,
  raw_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE import_validation_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY ive_read ON import_validation_errors FOR SELECT
  USING (import_job_id IN (SELECT id FROM import_jobs WHERE company_id = safe_user_company_id()));
CREATE POLICY ive_insert ON import_validation_errors FOR INSERT
  WITH CHECK (import_job_id IN (SELECT id FROM import_jobs WHERE company_id = safe_user_company_id()));

CREATE INDEX IF NOT EXISTS idx_ive_job ON import_validation_errors(import_job_id);
CREATE INDEX IF NOT EXISTS idx_ive_row ON import_validation_errors(import_job_id, row_number);

-- 5. Import Row Results
CREATE TABLE IF NOT EXISTS import_row_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  entity_id UUID,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE import_row_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY irr_read ON import_row_results FOR SELECT
  USING (import_job_id IN (SELECT id FROM import_jobs WHERE company_id = safe_user_company_id()));
CREATE POLICY irr_insert ON import_row_results FOR INSERT
  WITH CHECK (import_job_id IN (SELECT id FROM import_jobs WHERE company_id = safe_user_company_id()));

CREATE INDEX IF NOT EXISTS idx_irr_job ON import_row_results(import_job_id);
CREATE INDEX IF NOT EXISTS idx_irr_status ON import_row_results(import_job_id, status);

-- 6. Export Jobs
CREATE TABLE IF NOT EXISTS export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  filters JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  file_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE export_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ej_read ON export_jobs FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ej_insert ON export_jobs FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ej_update ON export_jobs FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_ej_company ON export_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_ej_status ON export_jobs(company_id, status);

-- ============================================================
-- RBAC Permissions: import/export
-- ============================================================
INSERT INTO permissions (resource, action, display_name) VALUES
  ('import_export', 'read',  'View import/export jobs and results'),
  ('import_export', 'write', 'Create and execute import/export jobs')
ON CONFLICT (resource, action) DO NOTHING;

-- Owner gets everything (already covered by wildcard)

-- Admin gets import_export read/write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'import_export';

-- HR Manager gets import_export read/write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'import_export';

-- HR Staff gets import_export read/write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'import_export';

-- Recruiter gets import_export read/write (candidates/jobs)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'recruiter' AND p.resource = 'import_export';

-- Finance Approver gets import_export read/write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'finance_approver' AND p.resource = 'import_export';

-- Auditor gets import_export read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.resource = 'import_export' AND p.action = 'read';

-- Employee gets import_export read only (limited visibility)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'import_export' AND p.action = 'read';

-- ============================================================
-- Audit trigger for import/export sensitive actions
-- ============================================================
CREATE OR REPLACE FUNCTION log_import_export_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (company_id, user_id, action, resource_type, resource_id, details)
  VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    TG_OP || '.' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object('operation', TG_OP, 'ts', NOW())
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_import_jobs
  AFTER INSERT OR UPDATE OR DELETE ON import_jobs
  FOR EACH ROW EXECUTE FUNCTION log_import_export_audit();

CREATE TRIGGER audit_export_jobs
  AFTER INSERT OR UPDATE OR DELETE ON export_jobs
  FOR EACH ROW EXECUTE FUNCTION log_import_export_audit();

CREATE TRIGGER audit_import_validation_errors
  AFTER INSERT ON import_validation_errors
  FOR EACH ROW EXECUTE FUNCTION log_import_export_audit();

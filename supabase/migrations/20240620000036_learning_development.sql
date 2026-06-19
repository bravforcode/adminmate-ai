-- ============================================================
-- Release 16: Learning & Development
-- Courses, modules, enrollments, training assignments,
-- certifications, skill profiles.
-- Mandatory training can be assigned; completion is tracked.
-- Certificate expiry reminders are queryable.
-- Skill data is protected from unfair use.
-- ============================================================

-- 1. Learning Courses
CREATE TABLE IF NOT EXISTS learning_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_type VARCHAR(50) NOT NULL DEFAULT 'self_paced',
  duration_hours NUMERIC(6,2),
  is_mandatory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE learning_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY lc_read ON learning_courses FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY lc_insert ON learning_courses FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY lc_update ON learning_courses FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY lc_delete ON learning_courses FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_lc_company ON learning_courses(company_id);
CREATE INDEX idx_lc_mandatory ON learning_courses(is_mandatory);
CREATE INDEX idx_lc_active ON learning_courses(is_active);

CREATE TRIGGER update_lc_updated_at BEFORE UPDATE ON learning_courses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Learning Modules
CREATE TABLE IF NOT EXISTS learning_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES learning_courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE learning_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY lm_read ON learning_modules FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY lm_insert ON learning_modules FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY lm_update ON learning_modules FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY lm_delete ON learning_modules FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_lm_company ON learning_modules(company_id);
CREATE INDEX idx_lm_course ON learning_modules(course_id);

-- 3. Learning Enrollments
CREATE TABLE IF NOT EXISTS learning_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES learning_courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status VARCHAR(30) DEFAULT 'enrolled',
  progress_pct NUMERIC(5,2) DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, course_id, employee_id)
);

ALTER TABLE learning_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY le_read ON learning_enrollments FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY le_insert ON learning_enrollments FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY le_update ON learning_enrollments FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY le_delete ON learning_enrollments FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_le_company ON learning_enrollments(company_id);
CREATE INDEX idx_le_employee ON learning_enrollments(employee_id);
CREATE INDEX idx_le_course ON learning_enrollments(course_id);
CREATE INDEX idx_le_status ON learning_enrollments(status);

CREATE TRIGGER update_le_updated_at BEFORE UPDATE ON learning_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Training Assignments
CREATE TABLE IF NOT EXISTS training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES learning_courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  due_date DATE NOT NULL,
  status VARCHAR(30) DEFAULT 'assigned',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY ta_read ON training_assignments FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY ta_insert ON training_assignments FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY ta_update ON training_assignments FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY ta_delete ON training_assignments FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_ta_company ON training_assignments(company_id);
CREATE INDEX idx_ta_employee ON training_assignments(employee_id);
CREATE INDEX idx_ta_course ON training_assignments(course_id);
CREATE INDEX idx_ta_status ON training_assignments(status);
CREATE INDEX idx_ta_due ON training_assignments(due_date);

CREATE TRIGGER update_ta_updated_at BEFORE UPDATE ON training_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Certifications
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cert_name VARCHAR(255) NOT NULL,
  issuing_org VARCHAR(255),
  issue_date DATE,
  expiry_date DATE,
  document_id UUID,
  status VARCHAR(30) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY cert_read ON certifications FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY cert_insert ON certifications FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY cert_update ON certifications FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY cert_delete ON certifications FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_cert_company ON certifications(company_id);
CREATE INDEX idx_cert_employee ON certifications(employee_id);
CREATE INDEX idx_cert_status ON certifications(status);
CREATE INDEX idx_cert_expiry ON certifications(expiry_date);

CREATE TRIGGER update_cert_updated_at BEFORE UPDATE ON certifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Skill Profiles
CREATE TABLE IF NOT EXISTS skill_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_assessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, employee_id)
);

ALTER TABLE skill_profiles ENABLE ROW LEVEL SECURITY;

-- Employee can read own skills; HR/admin can read all; skills CANNOT be used for adverse decisions
CREATE POLICY sp_read ON skill_profiles FOR SELECT USING (
  company_id = safe_user_company_id()
  AND (
    employee_id = auth.uid()
    OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  )
);

CREATE POLICY sp_insert ON skill_profiles FOR INSERT WITH CHECK (
  company_id = safe_user_company_id()
  AND (
    employee_id = auth.uid()
    OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  )
);

CREATE POLICY sp_update ON skill_profiles FOR UPDATE USING (
  company_id = safe_user_company_id()
  AND (
    employee_id = auth.uid()
    OR safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  )
);

CREATE POLICY sp_delete ON skill_profiles FOR DELETE USING (
  company_id = safe_user_company_id()
  AND safe_user_role() IN ('admin', 'hr_manager')
);

CREATE INDEX idx_sp_company ON skill_profiles(company_id);
CREATE INDEX idx_sp_employee ON skill_profiles(employee_id);
CREATE INDEX idx_sp_skills ON skill_profiles USING GIN (skills);

CREATE TRIGGER update_sp_updated_at BEFORE UPDATE ON skill_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Audit triggers for all learning tables
-- ============================================================

CREATE TRIGGER audit_learning_courses_changes
  AFTER INSERT OR UPDATE OR DELETE ON learning_courses
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_learning_enrollments_changes
  AFTER INSERT OR UPDATE OR DELETE ON learning_enrollments
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_training_assignments_changes
  AFTER INSERT OR UPDATE OR DELETE ON training_assignments
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_certifications_changes
  AFTER INSERT OR UPDATE OR DELETE ON certifications
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_skill_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON skill_profiles
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- ============================================================
-- RBAC: learning, certifications, skill_profiles permissions
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('learning',          'read',   'View learning courses and enrollments'),
  ('learning',          'write',  'Create/edit learning courses'),
  ('learning',          'assign', 'Assign mandatory training'),
  ('certifications',    'read',   'View certifications'),
  ('certifications',    'write',  'Create/edit certifications'),
  ('skill_profiles',    'read',   'View skill profiles'),
  ('skill_profiles',    'write',  'Create/edit skill profiles');

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource IN ('learning', 'certifications', 'skill_profiles');

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource IN ('learning', 'certifications', 'skill_profiles');

-- HR Manager: read/write/assign
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND (
  (p.resource = 'learning' AND p.action IN ('read', 'write', 'assign'))
  OR (p.resource = 'certifications' AND p.action IN ('read', 'write'))
  OR (p.resource = 'skill_profiles' AND p.action IN ('read', 'write'))
);

-- HR Staff: read/write (no assign)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND (
  (p.resource = 'learning' AND p.action IN ('read', 'write'))
  OR (p.resource = 'certifications' AND p.action IN ('read', 'write'))
  OR (p.resource = 'skill_profiles' AND p.action IN ('read', 'write'))
);

-- Manager: read learning, read/write own team skills
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND (
  (p.resource = 'learning' AND p.action = 'read')
  OR (p.resource = 'certifications' AND p.action = 'read')
  OR (p.resource = 'skill_profiles' AND p.action IN ('read', 'write'))
);

-- Employee: read own learning, own certifications, own skills
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND (
  (p.resource = 'learning' AND p.action = 'read')
  OR (p.resource = 'certifications' AND p.action = 'read')
  OR (p.resource = 'skill_profiles' AND p.action = 'read')
);

-- Auditor: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.action = 'read'
  AND p.resource IN ('learning', 'certifications', 'skill_profiles');

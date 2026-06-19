-- ============================================================
-- Release 10: Performance Management + PIP + 9-Box + Succession
-- Reviews, OKRs, PIP cases, 9-box assessments.
-- AI can summarize feedback and draft development plans.
-- AI CANNOT decide ratings or recommend termination.
-- ============================================================

-- 1. Performance Cycles
CREATE TABLE IF NOT EXISTS performance_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  cycle_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE performance_cycles ENABLE ROW LEVEL SECURITY;

CREATE POLICY perf_cycle_read ON performance_cycles FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY perf_cycle_insert ON performance_cycles FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY perf_cycle_update ON performance_cycles FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY perf_cycle_delete ON performance_cycles FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_perf_cycle_company ON performance_cycles(company_id);
CREATE INDEX idx_perf_cycle_status ON performance_cycles(status);

CREATE TRIGGER update_perf_cycle_updated_at BEFORE UPDATE ON performance_cycles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Performance Templates
CREATE TABLE IF NOT EXISTS performance_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  template_type VARCHAR(50) NOT NULL,
  criteria JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE performance_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY perf_tpl_read ON performance_templates FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY perf_tpl_insert ON performance_templates FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY perf_tpl_update ON performance_templates FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY perf_tpl_delete ON performance_templates FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_perf_tpl_company ON performance_templates(company_id);

CREATE TRIGGER update_perf_tpl_updated_at BEFORE UPDATE ON performance_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. OKR Objectives
CREATE TABLE IF NOT EXISTS okr_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  progress NUMERIC(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status VARCHAR(20) DEFAULT 'on_track',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE okr_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY okr_obj_read ON okr_objectives FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY okr_obj_insert ON okr_objectives FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY okr_obj_update ON okr_objectives FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY okr_obj_delete ON okr_objectives FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_okr_obj_company ON okr_objectives(company_id);
CREATE INDEX idx_okr_obj_employee ON okr_objectives(employee_id);
CREATE INDEX idx_okr_obj_cycle ON okr_objectives(cycle_id);

CREATE TRIGGER update_okr_obj_updated_at BEFORE UPDATE ON okr_objectives
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. OKR Key Results
CREATE TABLE IF NOT EXISTS okr_key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  objective_id UUID NOT NULL REFERENCES okr_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  current_value NUMERIC DEFAULT 0,
  unit VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE okr_key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY okr_kr_read ON okr_key_results FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY okr_kr_insert ON okr_key_results FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY okr_kr_update ON okr_key_results FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY okr_kr_delete ON okr_key_results FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_okr_kr_company ON okr_key_results(company_id);
CREATE INDEX idx_okr_kr_objective ON okr_key_results(objective_id);

CREATE TRIGGER update_okr_kr_updated_at BEFORE UPDATE ON okr_key_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. Performance Reviews
CREATE TABLE IF NOT EXISTS performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES user_profiles(id),
  review_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  overall_rating NUMERIC CHECK (overall_rating >= 1 AND overall_rating <= 5),
  comments TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY perf_rev_read ON performance_reviews FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY perf_rev_insert ON performance_reviews FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY perf_rev_update ON performance_reviews FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY perf_rev_delete ON performance_reviews FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX idx_perf_rev_company ON performance_reviews(company_id);
CREATE INDEX idx_perf_rev_employee ON performance_reviews(employee_id);
CREATE INDEX idx_perf_rev_cycle ON performance_reviews(cycle_id);
CREATE INDEX idx_perf_rev_reviewer ON performance_reviews(reviewer_id);
CREATE INDEX idx_perf_rev_status ON performance_reviews(status);

CREATE TRIGGER update_perf_rev_updated_at BEFORE UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Review Responses (per-criterion ratings with evidence)
CREATE TABLE IF NOT EXISTS review_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES performance_reviews(id) ON DELETE CASCADE,
  criterion_key VARCHAR(100) NOT NULL,
  rating NUMERIC CHECK (rating >= 1 AND rating <= 5),
  evidence TEXT,
  confidence VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE review_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY perf_resp_read ON review_responses FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY perf_resp_insert ON review_responses FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY perf_resp_update ON review_responses FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_perf_resp_company ON review_responses(company_id);
CREATE INDEX idx_perf_resp_review ON review_responses(review_id);

-- 7. PIP Cases
CREATE TABLE IF NOT EXISTS pip_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES user_profiles(id),
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  outcome TEXT,
  created_by UUID NOT NULL REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pip_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY pip_read ON pip_cases FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY pip_insert ON pip_cases FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY pip_update ON pip_cases FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_pip_company ON pip_cases(company_id);
CREATE INDEX idx_pip_employee ON pip_cases(employee_id);
CREATE INDEX idx_pip_manager ON pip_cases(manager_id);
CREATE INDEX idx_pip_status ON pip_cases(status);

CREATE TRIGGER update_pip_updated_at BEFORE UPDATE ON pip_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. 9-Box Assessments
-- box_position: 1-9 (3x3 grid: low/high performance × low/high potential)
CREATE TABLE IF NOT EXISTS nine_box_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES performance_cycles(id) ON DELETE CASCADE,
  performance_score NUMERIC CHECK (performance_score >= 1 AND performance_score <= 5),
  potential_score NUMERIC CHECK (potential_score >= 1 AND potential_score <= 5),
  box_position INTEGER CHECK (box_position >= 1 AND box_position <= 9),
  assessed_by UUID NOT NULL REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE nine_box_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY nine_box_read ON nine_box_assessments FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY nine_box_insert ON nine_box_assessments FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY nine_box_update ON nine_box_assessments FOR UPDATE USING (company_id = safe_user_company_id());

CREATE INDEX idx_nine_box_company ON nine_box_assessments(company_id);
CREATE INDEX idx_nine_box_employee ON nine_box_assessments(employee_id);
CREATE INDEX idx_nine_box_cycle ON nine_box_assessments(cycle_id);

-- ============================================================
-- RBAC: Performance, PIP, 9-Box Permissions
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('performance', 'read',    'View performance data'),
  ('performance', 'write',   'Create/edit performance reviews'),
  ('performance', 'approve', 'Approve performance ratings'),
  ('pip', 'read',    'View PIP cases'),
  ('pip', 'write',   'Create/edit PIP cases'),
  ('nine_box', 'read',  'View 9-box assessments'),
  ('nine_box', 'write', 'Create/edit 9-box assessments');

-- Owner: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource IN ('performance', 'pip', 'nine_box');

-- Admin: everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource IN ('performance', 'pip', 'nine_box');

-- HR Manager: read/write all, approve performance
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND (
  (p.resource = 'performance' AND p.action IN ('read', 'write', 'approve'))
  OR (p.resource = 'pip' AND p.action IN ('read', 'write'))
  OR (p.resource = 'nine_box' AND p.action IN ('read', 'write'))
);

-- HR Staff: read all, write performance
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND (
  (p.resource = 'performance' AND p.action IN ('read', 'write'))
  OR (p.resource = 'pip' AND p.action = 'read')
  OR (p.resource = 'nine_box' AND p.action = 'read')
);

-- Manager: read/write performance (for their reports), read PIP
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND (
  (p.resource = 'performance' AND p.action IN ('read', 'write'))
  OR (p.resource = 'pip' AND p.action = 'read')
  OR (p.resource = 'nine_box' AND p.action = 'read')
);

-- Employee: read own performance only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'performance' AND p.action = 'read';

-- Auditor: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor' AND p.action = 'read'
  AND p.resource IN ('performance', 'pip', 'nine_box');

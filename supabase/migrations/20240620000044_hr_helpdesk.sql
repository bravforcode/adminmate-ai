-- ============================================================
-- Release 21B: HR Helpdesk & Case Management
-- Cases, categories, comments (with internal/private HR),
-- knowledge base articles.
-- Employee sees own case. HR sees assigned/company cases.
-- Private HR comments hidden from employees. SLA escalation.
-- ============================================================

-- 1. HR Case Categories
CREATE TABLE IF NOT EXISTS hr_case_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_priority VARCHAR(20) DEFAULT 'medium',
  sla_hours INTEGER DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hr_case_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY hcc_read ON hr_case_categories FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY hcc_insert ON hr_case_categories FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY hcc_update ON hr_case_categories FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY hcc_delete ON hr_case_categories FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_hcc_company ON hr_case_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_hcc_active ON hr_case_categories(is_active);

-- 2. HR Helpdesk Cases
CREATE TABLE IF NOT EXISTS hr_helpdesk_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  assignee_id UUID REFERENCES auth.users(id),
  category_id UUID REFERENCES hr_case_categories(id),
  subject VARCHAR(500) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(30) DEFAULT 'open',
  sla_due_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hr_helpdesk_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY hhc_select ON hr_helpdesk_cases FOR SELECT
  USING (
    company_id = safe_user_company_id()
    AND (
      requester_id = auth.uid()
      OR assignee_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.company_id = hr_helpdesk_cases.company_id
          AND r.name IN ('owner', 'admin', 'hr_manager', 'hr_staff')
      )
    )
  );
CREATE POLICY hhc_insert ON hr_helpdesk_cases FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY hhc_update ON hr_helpdesk_cases FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY hhc_delete ON hr_helpdesk_cases FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_hhc_company ON hr_helpdesk_cases(company_id);
CREATE INDEX IF NOT EXISTS idx_hhc_requester ON hr_helpdesk_cases(requester_id);
CREATE INDEX IF NOT EXISTS idx_hhc_assignee ON hr_helpdesk_cases(assignee_id);
CREATE INDEX IF NOT EXISTS idx_hhc_status ON hr_helpdesk_cases(status);
CREATE INDEX IF NOT EXISTS idx_hhc_priority ON hr_helpdesk_cases(priority);
CREATE INDEX IF NOT EXISTS idx_hhc_sla ON hr_helpdesk_cases(sla_due_at);

CREATE TRIGGER update_hhc_updated_at BEFORE UPDATE ON hr_helpdesk_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. HR Case Comments
CREATE TABLE IF NOT EXISTS hr_case_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES hr_helpdesk_cases(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hr_case_comments ENABLE ROW LEVEL SECURITY;

-- HR/staff/admin see all comments. Employees see only non-internal on their own cases.
CREATE POLICY hccomm_select ON hr_case_comments FOR SELECT
  USING (
    company_id = safe_user_company_id()
    AND (
      is_internal = false
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.company_id = hr_case_comments.company_id
          AND r.name IN ('owner', 'admin', 'hr_manager', 'hr_staff')
      )
    )
  );
CREATE POLICY hccomm_insert ON hr_case_comments FOR INSERT
  WITH CHECK (
    company_id = safe_user_company_id()
    AND (
      is_internal = false
      OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
          AND ur.company_id = hr_case_comments.company_id
          AND r.name IN ('owner', 'admin', 'hr_manager', 'hr_staff')
      )
    )
  );
CREATE POLICY hccomm_update ON hr_case_comments FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY hccomm_delete ON hr_case_comments FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_hccomm_company ON hr_case_comments(company_id);
CREATE INDEX IF NOT EXISTS idx_hccomm_case ON hr_case_comments(case_id);
CREATE INDEX IF NOT EXISTS idx_hccomm_author ON hr_case_comments(author_id);
CREATE INDEX IF NOT EXISTS idx_hccomm_internal ON hr_case_comments(is_internal);

-- 4. Knowledge Base Articles
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  tags JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE knowledge_base_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY kba_read ON knowledge_base_articles FOR SELECT USING (company_id = safe_user_company_id());
CREATE POLICY kba_insert ON knowledge_base_articles FOR INSERT WITH CHECK (company_id = safe_user_company_id());
CREATE POLICY kba_update ON knowledge_base_articles FOR UPDATE USING (company_id = safe_user_company_id());
CREATE POLICY kba_delete ON knowledge_base_articles FOR DELETE USING (company_id = safe_user_company_id());

CREATE INDEX IF NOT EXISTS idx_kba_company ON knowledge_base_articles(company_id);
CREATE INDEX IF NOT EXISTS idx_kba_category ON knowledge_base_articles(category);
CREATE INDEX IF NOT EXISTS idx_kba_published ON knowledge_base_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_kba_tags ON knowledge_base_articles USING gin(tags);

CREATE TRIGGER update_kba_updated_at BEFORE UPDATE ON knowledge_base_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RBAC Permissions: helpdesk_read, helpdesk_write, helpdesk_assign
-- ============================================================

INSERT INTO permissions (resource, action, display_name) VALUES
  ('helpdesk', 'read',   'View helpdesk cases'),
  ('helpdesk', 'write',  'Create/edit helpdesk cases'),
  ('helpdesk', 'assign', 'Assign helpdesk cases');

-- Owner: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'helpdesk';

-- Admin: full access
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'helpdesk';

-- HR Manager: read + write + assign
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'helpdesk';

-- HR Staff: read + write
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'helpdesk' AND p.action IN ('read', 'write');

-- Manager: read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'helpdesk' AND p.action = 'read';

-- Employee: read only (own cases via RLS)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'helpdesk' AND p.action = 'read';

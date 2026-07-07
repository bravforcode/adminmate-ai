-- RELEASE 1 — Task 2: RBAC Foundation
-- Adds roles, permissions, and user_roles tables.
-- Legacy user_profiles.role column kept for backward compatibility during transition.

-- ============== ROLES ==============
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,  -- system roles cannot be deleted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============== PERMISSIONS ==============
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource VARCHAR(100) NOT NULL,       -- e.g. 'candidate', 'job', 'payroll'
    action VARCHAR(50) NOT NULL,          -- e.g. 'read', 'write', 'export', 'approve'
    display_name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(resource, action)
);

-- ============== ROLE_PERMISSIONS ==============
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- ============== USER_ROLES ==============
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,               -- optional: for time-boxed roles (auditor)
    UNIQUE(user_id, role_id, company_id)
);

-- ============== INDEXES ==============
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_company ON user_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_company ON user_roles(user_id, company_id);

-- ============== RLS ==============
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Roles: readable by all authenticated users (needed for UI role selection)
CREATE POLICY "roles_read" ON roles FOR SELECT TO authenticated USING (true);
-- Roles: only admins can manage system roles
CREATE POLICY "roles_write" ON roles FOR ALL TO authenticated
  USING (safe_user_role() = 'admin')
  WITH CHECK (safe_user_role() = 'admin');

-- Permissions: readable by all authenticated users
CREATE POLICY "permissions_read" ON permissions FOR SELECT TO authenticated USING (true);
-- Permissions: only admins can manage
CREATE POLICY "permissions_write" ON permissions FOR ALL TO authenticated
  USING (safe_user_role() = 'admin')
  WITH CHECK (safe_user_role() = 'admin');

-- Role permissions: readable by all authenticated users
CREATE POLICY "role_permissions_read" ON role_permissions FOR SELECT TO authenticated USING (true);
-- Role permissions: only admins can manage
CREATE POLICY "role_permissions_write" ON role_permissions FOR ALL TO authenticated
  USING (safe_user_role() = 'admin')
  WITH CHECK (safe_user_role() = 'admin');

-- User roles: users can read their own, admins can read all in company
CREATE POLICY "user_roles_read_own" ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR company_id = safe_user_company_id());
-- User roles: only admins can assign roles
CREATE POLICY "user_roles_write" ON user_roles FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() = 'admin')
  WITH CHECK (company_id = safe_user_company_id() AND safe_user_role() = 'admin');

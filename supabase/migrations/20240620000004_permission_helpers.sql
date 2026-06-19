-- RELEASE 1 — Task 4: Server-Side Permission Helpers
-- SQL functions for checking user permissions.
-- These must be used in addition to (not instead of) RLS policies.

-- ============== HAS_ROLE: Check if user has a specific role ==============
CREATE OR REPLACE FUNCTION has_role(p_role_name TEXT, p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = p_role_name
      AND (p_company_id IS NULL OR ur.company_id = p_company_id)
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  )
$$;

-- ============== HAS_PERMISSION: Check if user has a specific permission ==============
CREATE OR REPLACE FUNCTION has_permission(p_resource TEXT, p_action TEXT, p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.resource = p_resource
      AND p.action = p_action
      AND (p_company_id IS NULL OR ur.company_id = p_company_id)
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  )
$$;

-- ============== HAS_ANY_ROLE: Check if user has any of the given roles ==============
CREATE OR REPLACE FUNCTION has_any_role(p_role_names TEXT[], p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = ANY(p_role_names)
      AND (p_company_id IS NULL OR ur.company_id = p_company_id)
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  )
$$;

-- ============== USER_ROLE_NAMES: Get all role names for a user ==============
CREATE OR REPLACE FUNCTION user_role_names(p_user_id UUID DEFAULT auth.uid(), p_company_id UUID DEFAULT NULL)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ARRAY_AGG(DISTINCT r.name)
  FROM user_roles ur
  JOIN roles r ON r.id = ur.role_id
  WHERE ur.user_id = p_user_id
    AND (p_company_id IS NULL OR ur.company_id = p_company_id)
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
$$;

-- ============== MIGRATE_LEGACY_ROLE: One-time migration of user_profiles.role to user_roles ==============
-- Called per-company after Release 1 deployment.
CREATE OR REPLACE FUNCTION migrate_legacy_roles(p_company_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
  v_role_name TEXT;
BEGIN
  FOR v_row IN
    SELECT id, role FROM user_profiles WHERE company_id = p_company_id AND role IS NOT NULL
  LOOP
    -- Map legacy role names to new role names
    v_role_name := CASE v_row.role
      WHEN 'admin' THEN 'admin'
      WHEN 'hr' THEN 'hr_manager'
      WHEN 'manager' THEN 'manager'
      WHEN 'employee' THEN 'employee'
      WHEN 'recruiter' THEN 'recruiter'
      WHEN 'member' THEN 'employee'
      ELSE 'employee'
    END;

    INSERT INTO user_roles (user_id, role_id, company_id)
    SELECT v_row.id, r.id, p_company_id
    FROM roles r
    WHERE r.name = v_role_name
    ON CONFLICT (user_id, role_id, company_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

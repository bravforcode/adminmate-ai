-- RELEASE 1 — Stabilization: RBAC Legacy Fallback
-- Ensures existing users do not lose access when user_roles table is empty.
--
-- STRATEGY: Dual-mode transition
--   - If user has entries in user_roles → use RBAC (new system)
--   - If user has NO entries in user_roles → fall back to user_profiles.role (legacy)
--
-- This is a SAFETY NET. Call migrate_legacy_roles() per-company to populate
-- user_roles from legacy data. Once all companies are migrated, this fallback
-- can be removed.

-- ============== HELPER: Map legacy role name to new RBAC role name ==============
CREATE OR REPLACE FUNCTION map_legacy_role(p_legacy_role TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_legacy_role
    WHEN 'admin'     THEN 'admin'
    WHEN 'hr'        THEN 'hr_manager'
    WHEN 'manager'   THEN 'department_head'
    WHEN 'employee'  THEN 'employee'
    WHEN 'recruiter' THEN 'recruiter'
    WHEN 'member'    THEN 'employee'
    ELSE 'employee'
  END
$$;

-- ============== HAS_ROLE (with legacy fallback) ==============
CREATE OR REPLACE FUNCTION has_role(p_role_name TEXT, p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    -- NEW PATH: Check user_roles table first
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = p_role_name
      AND (p_company_id IS NULL OR ur.company_id = p_company_id)
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())

    UNION ALL

    -- LEGACY FALLBACK: If user has NO user_roles, check user_profiles.role
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur2
        WHERE ur2.user_id = auth.uid()
          AND (p_company_id IS NULL OR ur2.company_id = p_company_id)
      )
      AND map_legacy_role(up.role) = p_role_name
      AND (p_company_id IS NULL OR up.company_id = p_company_id)
  )
$$;

-- ============== HAS_PERMISSION (with legacy fallback) ==============
CREATE OR REPLACE FUNCTION has_permission(p_resource TEXT, p_action TEXT, p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    -- NEW PATH: Check RBAC permissions via user_roles
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON rp.role_id = ur.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
      AND p.resource = p_resource
      AND p.action = p_action
      AND (p_company_id IS NULL OR ur.company_id = p_company_id)
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())

    UNION ALL

    -- LEGACY FALLBACK: If user has NO user_roles, resolve permission from user_profiles.role
    SELECT 1
    FROM user_profiles up
    JOIN roles r ON r.name = map_legacy_role(up.role)
    JOIN role_permissions rp ON rp.role_id = r.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE up.id = auth.uid()
      AND p.resource = p_resource
      AND p.action = p_action
      AND (p_company_id IS NULL OR up.company_id = p_company_id)
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur2
        WHERE ur2.user_id = auth.uid()
          AND (p_company_id IS NULL OR ur2.company_id = p_company_id)
      )
  )
$$;

-- ============== HAS_ANY_ROLE (with legacy fallback) ==============
CREATE OR REPLACE FUNCTION has_any_role(p_role_names TEXT[], p_company_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    -- NEW PATH
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND r.name = ANY(p_role_names)
      AND (p_company_id IS NULL OR ur.company_id = p_company_id)
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())

    UNION ALL

    -- LEGACY FALLBACK
    SELECT 1
    FROM user_profiles up
    WHERE up.id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM user_roles ur2
        WHERE ur2.user_id = auth.uid()
          AND (p_company_id IS NULL OR ur2.company_id = p_company_id)
      )
      AND map_legacy_role(up.role) = ANY(p_role_names)
      AND (p_company_id IS NULL OR up.company_id = p_company_id)
  )
$$;

-- ============== USER_ROLE_NAMES (with legacy fallback) ==============
CREATE OR REPLACE FUNCTION user_role_names(p_user_id UUID DEFAULT auth.uid(), p_company_id UUID DEFAULT NULL)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- If user has RBAC entries, return those
  SELECT COALESCE(
    (
      SELECT ARRAY_AGG(DISTINCT r.name)
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = p_user_id
        AND (p_company_id IS NULL OR ur.company_id = p_company_id)
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    ),
    -- Legacy fallback: return mapped legacy role as single-element array
    (
      SELECT ARRAY[map_legacy_role(up.role)]
      FROM user_profiles up
      WHERE up.id = p_user_id
        AND NOT EXISTS (
          SELECT 1 FROM user_roles ur2
          WHERE ur2.user_id = p_user_id
            AND (p_company_id IS NULL OR ur2.company_id = p_company_id)
        )
    )
  )
$$;

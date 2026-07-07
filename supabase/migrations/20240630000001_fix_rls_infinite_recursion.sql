-- ============================================================
-- Fix: RLS infinite recursion in user_profiles + RLS functions
--
-- ROOT CAUSE 1: Migration 20240627000004 created circular recursion:
--   get_user_company_id() → SELECT safe_user_company_id()
--   safe_user_company_id() → SELECT get_user_company_id()
-- This caused "stack depth limit exceeded" (54001) on every RPC and
-- every table query that used these functions in RLS policies.
--
-- ROOT CAUSE 2: profiles_admin FOR ALL policy on user_profiles called
-- safe_user_company_id(), which queries user_profiles, creating
-- "infinite recursion detected in policy" (42P17) on any UPDATE.
--
-- ROOT CAUSE 3: profiles_read policy called get_user_company_id()
-- which queries user_profiles, creating recursive RLS evaluation.
--
-- FIX:
-- 1. Both functions now query user_profiles directly (no mutual recursion)
-- 2. profiles_admin split into INSERT/UPDATE/DELETE only (not SELECT)
--    to avoid recursion when the functions query user_profiles for SELECT
-- 3. profiles_read uses safe_user_company_id() which is now safe
-- ============================================================

-- STEP 1: Break the mutual recursion — both functions query directly
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() AND is_active = true
$$;

CREATE OR REPLACE FUNCTION safe_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() AND is_active = true
$$;

-- STEP 2: Fix profiles_read — use safe_user_company_id() directly
-- (now safe since it no longer creates mutual recursion)
DROP POLICY IF EXISTS "profiles_read" ON user_profiles;
DROP POLICY IF EXISTS profiles_read ON user_profiles;
DROP POLICY IF EXISTS profiles_own_read ON user_profiles;
DROP POLICY IF EXISTS profiles_admin_read ON user_profiles;

CREATE POLICY profiles_own_read ON user_profiles FOR SELECT USING (
  id = auth.uid()
);

CREATE POLICY profiles_admin_read ON user_profiles FOR SELECT USING (
  company_id = safe_user_company_id() AND safe_user_role() IN ('admin', 'hr')
);

-- STEP 3: Fix profiles_admin — split into non-SELECT policies
-- (FOR ALL included SELECT which caused recursion when functions queried user_profiles)
DROP POLICY IF EXISTS "profiles_admin" ON user_profiles;
DROP POLICY IF EXISTS profiles_admin ON user_profiles;
DROP POLICY IF EXISTS profiles_admin_insert ON user_profiles;
DROP POLICY IF EXISTS profiles_admin_update ON user_profiles;
DROP POLICY IF EXISTS profiles_admin_delete ON user_profiles;

-- No admin INSERT/UPDATE/DELETE on user_profiles — self-management via profiles_update_own,
-- and cross-user profile management via service_role only.

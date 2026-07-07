-- Phase 3: Consolidate RLS functions to a single canonical name: safe_user_company_id()
--
-- Background: Two functions exist:
--   get_user_company_id() (20240101000020) — SECURITY DEFINER, checks is_active=true
--   safe_user_company_id() (20240102000004) — SECURITY DEFINER, simpler LIMIT 1
--
-- safe_user_company_id() is used by all hardened policies (migration 000004).
-- get_user_company_id() was used by original policies (migration 000021) which are
-- now DROPPED by 000004. We keep safe_user_company_id() as the canonical name
-- and make get_user_company_id() a thin alias for any residual callers.

-- Step 1: Create alias so any external caller or stored procedure referencing
-- get_user_company_id() still works.
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT safe_user_company_id()
$$;

-- Step 2: Drop old policies that still reference get_user_company_id() directly.
-- These were created in 20240101000021 and may still exist if 000004's DROP
-- didn't fully clean up (e.g. policies with different names).

-- Companies
DROP POLICY IF EXISTS "companies_read" ON companies;
DROP POLICY IF EXISTS "companies_write" ON companies;

-- User profiles
DROP POLICY IF EXISTS "profiles_read" ON user_profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON user_profiles;
DROP POLICY IF EXISTS "profiles_admin" ON user_profiles;

-- Notifications (old permissive insert)
DROP POLICY IF EXISTS "notif_insert" ON notifications;

-- Audit logs
DROP POLICY IF EXISTS "audit_read" ON audit_logs;

-- Chat platform connections
DROP POLICY IF EXISTS "connections_read" ON chat_platform_connections;
DROP POLICY IF EXISTS "connections_write" ON chat_platform_connections;

-- Step 3: Re-create the dropped policies with safe_user_company_id()
CREATE POLICY "companies_read" ON companies FOR SELECT TO authenticated
  USING (id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "companies_write" ON companies FOR ALL TO authenticated
  USING (id = safe_user_company_id() AND safe_user_role() IN ('admin'));

CREATE POLICY "profiles_read" ON user_profiles FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_admin" ON user_profiles FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

-- Notifications: remove the permissive WITH CHECK (true) insert
-- The hardened version (000004) uses notif_insert_any with WITH CHECK (true)
-- but we should scope it. Keep existing notif_read from 000004.
-- (notif_read and notif_insert_any are already defined by 000004)

CREATE POLICY "audit_read" ON audit_logs FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);

CREATE POLICY "connections_read" ON chat_platform_connections FOR SELECT TO authenticated
  USING (company_id = safe_user_company_id() OR safe_user_company_id() IS NULL);
CREATE POLICY "connections_write" ON chat_platform_connections FOR ALL TO authenticated
  USING (company_id = safe_user_company_id() AND safe_user_role() IN ('admin','hr'));

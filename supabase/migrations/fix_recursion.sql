-- FIX: profiles_read subquery causes recursive RLS evaluation on user_profiles
-- PostgreSQL evaluates RLS recursively for subqueries in policies, causing infinite recursion.
-- 
-- Solution: 
-- 1. Remove the recursive profiles_read policy
-- 2. Use profiles_own_read (id = auth.uid()) for self-read
-- 3. Add admin read policy using safe_user_company_id() (now fixed, no longer mutually recursive)

-- Drop the recursive policies
DROP POLICY IF EXISTS profiles_read ON user_profiles;
DROP POLICY IF EXISTS profiles_own_read ON user_profiles;

-- Self-read: users can always see their own profile
CREATE POLICY profiles_own_read ON user_profiles FOR SELECT USING (
  id = auth.uid()
);

-- Admin/HR read: can see all profiles in their company
CREATE POLICY profiles_admin_read ON user_profiles FOR SELECT USING (
  company_id = safe_user_company_id() AND safe_user_role() IN ('admin', 'hr')
);

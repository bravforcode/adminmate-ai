-- Fix RLS so users can read their own profile even before joining a company
-- Without this, a newly registered user cannot fetch their profile, causing
-- the app to show a misleading "Unsupported provider" error.

DROP POLICY IF EXISTS "profiles_read" ON user_profiles;
CREATE POLICY "profiles_read" ON user_profiles FOR SELECT USING (
  id = auth.uid()  -- own profile
  OR company_id = get_user_company_id()  -- same-company profiles
);

-- Also allow INSERT on own profile (for the auth trigger / signup flow)
DROP POLICY IF EXISTS "profiles_insert_own" ON user_profiles;
CREATE POLICY "profiles_insert_own" ON user_profiles FOR INSERT WITH CHECK (id = auth.uid());

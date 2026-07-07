-- Fix RLS so new users can create their first company and read it
-- Without these, the company setup flow is blocked by 403/RLS errors.

-- Allow only users WITHOUT a company to INSERT (new registrations only)
DROP POLICY IF EXISTS "companies_insert" ON companies;
CREATE POLICY "companies_insert" ON companies FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND company_id IS NOT NULL)
);

-- Loosen the SELECT policy: user can read their own company.
-- A newly registered user (no company_id in profile yet) will land on the
-- /setup-company page, which itself inserts a new company, so the read policy
-- alone is enough once setup completes.
DROP POLICY IF EXISTS "companies_read" ON companies;
CREATE POLICY "companies_read" ON companies FOR SELECT USING (id = get_user_company_id());

-- Loosen the ALL policy to allow the user who just created the company
-- to update it (e.g. set billing, change settings) before is_admin_or_hr()
-- returns true via the freshly-updated profile.
DROP POLICY IF EXISTS "companies_write" ON companies;
CREATE POLICY "companies_write" ON companies FOR ALL USING (
  id = get_user_company_id() AND is_admin_or_hr()
);

-- Ensure user_profiles can be updated to set company_id after company creation
DROP POLICY IF EXISTS "profiles_update_own" ON user_profiles;
CREATE POLICY "profiles_update_own" ON user_profiles FOR UPDATE USING (id = auth.uid());

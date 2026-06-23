-- 33B.2: Account provisioning hardening
-- Improves handle_new_user() trigger to accept company_id and role from user metadata
-- Adds provisioning helper functions
-- Fixes the NULL company_id gap for invite flows

-- ============================================================
-- 1. Improved handle_new_user() trigger
-- ============================================================
-- Now accepts company_id and role from raw_user_meta_data
-- This supports invite flows where admin creates user with company context

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id UUID;
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  -- Extract from metadata with fallbacks
  v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'hr');
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.user_profiles (id, email, full_name, role, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_role,
    v_company_id  -- NULL if not provided (standard signup flow)
  )
  ON CONFLICT (id) DO UPDATE SET
    -- Update company_id if provided and currently NULL (invite flow)
    company_id = COALESCE(EXCLUDED.company_id, user_profiles.company_id),
    -- Update role if provided
    role = COALESCE(EXCLUDED.role, user_profiles.role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 2. Provisioning helper: check_user_provisioning_status()
-- ============================================================
-- Returns the provisioning status of a user

CREATE OR REPLACE FUNCTION check_user_provisioning_status(p_user_id UUID)
RETURNS TABLE (
  has_profile BOOLEAN,
  has_company BOOLEAN,
  company_id UUID,
  role VARCHAR(50),
  is_active BOOLEAN,
  provisioning_status VARCHAR(20)  -- 'complete', 'needs_company', 'needs_profile', 'inactive'
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (up.id IS NOT NULL) AS has_profile,
    (up.company_id IS NOT NULL AND c.id IS NOT NULL) AS has_company,
    up.company_id,
    up.role,
    up.is_active,
    CASE
      WHEN up.id IS NULL THEN 'needs_profile'::VARCHAR(20)
      WHEN up.company_id IS NULL OR c.id IS NULL THEN 'needs_company'::VARCHAR(20)
      WHEN up.is_active = false THEN 'inactive'::VARCHAR(20)
      ELSE 'complete'::VARCHAR(20)
    END AS provisioning_status
  FROM public.user_profiles up
  LEFT JOIN public.companies c ON c.id = up.company_id
  WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 3. Provisioning helper: link_user_to_company()
-- ============================================================
-- Safely links a user to a company (for invite flows)

CREATE OR REPLACE FUNCTION link_user_to_company(
  p_user_id UUID,
  p_company_id UUID,
  p_role VARCHAR(50) DEFAULT 'hr'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_company_exists BOOLEAN;
BEGIN
  -- Check company exists
  SELECT EXISTS(SELECT 1 FROM public.companies WHERE id = p_company_id) INTO v_company_exists;
  IF NOT v_company_exists THEN
    RAISE EXCEPTION 'Company not found: %', p_company_id;
  END IF;

  -- Check profile exists
  SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = p_user_id) INTO v_profile_exists;
  IF NOT v_profile_exists THEN
    RAISE EXCEPTION 'User profile not found: %', p_user_id;
  END IF;

  -- Link user to company
  UPDATE public.user_profiles
  SET company_id = p_company_id,
      role = p_role,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 4. Audit: check for orphaned profiles
-- ============================================================
-- Returns profiles without valid company references

CREATE OR REPLACE FUNCTION audit_orphaned_profiles()
RETURNS TABLE (
  user_id UUID,
  email VARCHAR(255),
  company_id UUID,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id AS user_id,
    up.email,
    up.company_id,
    up.created_at
  FROM public.user_profiles up
  LEFT JOIN public.companies c ON c.id = up.company_id
  WHERE up.company_id IS NOT NULL
    AND c.id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. Audit: check provisioning completeness
-- ============================================================
-- Returns provisioning stats

CREATE OR REPLACE FUNCTION audit_provisioning_completeness()
RETURNS TABLE (
  total_users BIGINT,
  with_profile BIGINT,
  with_company BIGINT,
  without_company BIGINT,
  orphaned_profiles BIGINT,
  provisioning_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT count(*) FROM auth.users) AS total_users,
    (SELECT count(*) FROM public.user_profiles) AS with_profile,
    (SELECT count(*) FROM public.user_profiles WHERE company_id IS NOT NULL) AS with_company,
    (SELECT count(*) FROM public.user_profiles WHERE company_id IS NULL) AS without_company,
    (SELECT count(*) FROM audit_orphaned_profiles()) AS orphaned_profiles,
    CASE
      WHEN (SELECT count(*) FROM public.user_profiles) = 0 THEN 0
      ELSE ROUND(
        (SELECT count(*) FROM public.user_profiles WHERE company_id IS NOT NULL)::NUMERIC /
        (SELECT count(*) FROM public.user_profiles)::NUMERIC * 100,
        2
      )
    END AS provisioning_rate;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 6. RLS policy: allow NULL company_id users to read own profile only
-- ============================================================
-- Ensures users without a company can still access their own profile
-- but cannot access other tenants' data

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "profiles_own_read" ON public.user_profiles;

-- Create policy for own profile read (regardless of company_id)
CREATE POLICY "profiles_own_read" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- 7. Add index for provisioning queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_company_id_null
  ON public.user_profiles (id)
  WHERE company_id IS NULL;

-- ============================================================
-- 8. Add comment documenting the trigger behavior
-- ============================================================

COMMENT ON FUNCTION handle_new_user() IS
  'Trigger on auth.users INSERT. Creates user_profiles row with company_id from metadata if provided. Supports invite flows (company_id in metadata) and standard signup (company_id = NULL, linked later via frontend).';

COMMENT ON FUNCTION check_user_provisioning_status(UUID) IS
  'Returns provisioning status for a user: complete, needs_company, needs_profile, or inactive.';

COMMENT ON FUNCTION link_user_to_company(UUID, UUID, VARCHAR(50)) IS
  'Safely links a user profile to a company. Used by invite flows and provisioning scripts.';

COMMENT ON FUNCTION audit_orphaned_profiles() IS
  'Returns user_profiles with company_id pointing to non-existent companies.';

COMMENT ON FUNCTION audit_provisioning_completeness() IS
  'Returns provisioning statistics: total users, with/without company, orphaned profiles, provisioning rate.';

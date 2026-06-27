-- Consolidate RLS helper functions: keep get_user_company_id() as the canonical
-- function (defined in 20240101000020) and alias safe_user_company_id() to it.
-- safe_user_company_id was created in 20240102000004 and is used by the majority
-- of later migrations; get_user_company_id is used by the consolidated schema.
-- Both names now point to the same SECURITY DEFINER implementation.

-- Ensure get_user_company_id() is the canonical form (safe, checks is_active)
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM user_profiles WHERE id = auth.uid() AND is_active = true
$$;

-- Alias safe_user_company_id -> get_user_company_id for backward compatibility
CREATE OR REPLACE FUNCTION safe_user_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT get_user_company_id()
$$;

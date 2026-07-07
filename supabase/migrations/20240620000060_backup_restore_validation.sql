-- Migration: 20240620000060_backup_restore_validation.sql
-- Release 33B.5: Backup/Restore Validation
-- Functions for schema integrity checks, backup verification, and restore completeness

BEGIN;

-- =============================================================================
-- 1. validate_backup_integrity()
--    Checks all tables exist, RLS enabled, functions have search_path
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_backup_integrity()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_tables JSONB := '[]'::JSONB;
  v_rls_issues JSONB := '[]'::JSONB;
  v_func_issues JSONB := '[]'::JSONB;
  v_rec RECORD;
  v_total_tables INT := 0;
  v_tables_with_rls INT := 0;
  v_rls_disabled INT := 0;
  v_total_funcs INT := 0;
  v_funcs_with_searchpath INT := 0;
  v_funcs_without_searchpath INT := 0;
BEGIN
  -- Check all public tables exist and have RLS enabled
  FOR v_rec IN
    SELECT c.relname AS table_name,
           c.reloptions,
           pg_catalog.pg_table_is_visible(c.oid) AS is_visible
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
    ORDER BY c.relname
  LOOP
    v_total_tables := v_total_tables + 1;
    IF v_rec.reloptions @> ARRAY['check_option=cascaded']::text[] 
       OR NOT (v_rec.reloptions @> ARRAY['check_option=local']::text[]) THEN
      -- Check RLS via pg_tables
      IF EXISTS (
        SELECT 1 FROM pg_tables t
        JOIN pg_namespace n ON n.oid = (SELECT relnamespace FROM pg_class WHERE relname = t.tablename)
        WHERE t.schemaname = 'public'
          AND t.tablename = v_rec.table_name
          AND t.rowsecurity = true
      ) THEN
        v_tables_with_rls := v_tables_with_rls + 1;
      ELSE
        v_rls_disabled := v_rls_disabled + 1;
        v_rls_issues := v_rls_issues || jsonb_build_object(
          'table', v_rec.table_name,
          'issue', 'RLS not enabled'
        );
      END IF;
    END IF;
  END LOOP;

  -- Simple approach: count tables with RLS enabled
  SELECT COUNT(*) INTO v_tables_with_rls
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = true;

  SELECT COUNT(*) INTO v_rls_disabled
  FROM pg_tables
  WHERE schemaname = 'public' AND rowsecurity = false;

  -- Check functions have search_path set
  FOR v_rec IN
    SELECT p.proname AS func_name,
           pg_get_functiondef(p.oid) AS func_def,
           p.proconfig AS config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    ORDER BY p.proname
  LOOP
    v_total_funcs := v_total_funcs + 1;
    -- Check if search_path is set in config or in function body
    IF (v_rec.config IS NOT NULL AND v_rec.config @> ARRAY['search_path=public']::text[])
       OR (v_rec.func_def ILIKE '%SET search_path%')
       OR (v_rec.func_def ILIKE '%SET search_path%') THEN
      v_funcs_with_searchpath := v_funcs_with_searchpath + 1;
    ELSE
      v_funcs_without_searchpath := v_funcs_without_searchpath + 1;
      v_func_issues := v_func_issues || jsonb_build_object(
        'function', v_rec.func_name,
        'issue', 'search_path not explicitly set'
      );
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'tables', jsonb_build_object(
      'total', v_total_tables,
      'with_rls', v_tables_with_rls,
      'rls_disabled', v_rls_disabled,
      'issues', v_rls_issues
    ),
    'functions', jsonb_build_object(
      'total', v_total_funcs,
      'with_search_path', v_funcs_with_searchpath,
      'without_search_path', v_funcs_without_searchpath,
      'issues', v_func_issues
    ),
    'overall_pass', (v_rls_disabled = 0 AND v_funcs_without_searchpath = 0)
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 2. validate_restore_completeness()
--    Checks migration count, table count, function count
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_restore_completeness()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_migration_count INT;
  v_table_count INT;
  v_view_count INT;
  v_function_count INT;
  v_policy_count INT;
  v_index_count INT;
BEGIN
  -- Count migrations (from schema_migrations if exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'schema_migrations'
  ) THEN
    SELECT COUNT(*) INTO v_migration_count
    FROM schema_migrations;
  ELSE
    -- Fallback: count migration files based on pg_stat_statements or known count
    v_migration_count := 0;
  END IF;

  -- Count tables
  SELECT COUNT(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  -- Count views
  SELECT COUNT(*) INTO v_view_count
  FROM information_schema.views
  WHERE table_schema = 'public';

  -- Count functions
  SELECT COUNT(*) INTO v_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

  -- Count RLS policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';

  -- Count indexes (excluding primary keys)
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE schemaname = 'public';

  v_result := jsonb_build_object(
    'migrations', v_migration_count,
    'tables', v_table_count,
    'views', v_view_count,
    'functions', v_function_count,
    'policies', v_policy_count,
    'indexes', v_index_count,
    'snapshot_timestamp', now()
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 3. export_schema_snapshot()
--    Returns JSONB with full schema metadata for backup verification
-- =============================================================================
CREATE OR REPLACE FUNCTION public.export_schema_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_tables JSONB := '[]'::JSONB;
  v_functions JSONB := '[]'::JSONB;
  v_policies JSONB := '[]'::JSONB;
  v_rec RECORD;
BEGIN
  -- Export table metadata
  FOR v_rec IN
    SELECT
      c.relname AS table_name,
      pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
      (SELECT COUNT(*) FROM pg_attribute WHERE attrelid = c.oid AND attnum > 0) AS column_count,
      c.reloptions AS options
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public'
    ORDER BY c.relname
  LOOP
    v_tables := v_tables || jsonb_build_object(
      'name', v_rec.table_name,
      'size', v_rec.total_size,
      'columns', v_rec.column_count,
      'has_rls', EXISTS (
        SELECT 1 FROM pg_tables t
        WHERE t.schemaname = 'public' AND t.tablename = v_rec.table_name AND t.rowsecurity = true
      )
    );
  END LOOP;

  -- Export function metadata
  FOR v_rec IN
    SELECT
      p.proname AS func_name,
      pg_get_function_result(p.oid) AS return_type,
      pg_get_function_arguments(p.oid) AS arguments,
      p.proconfig AS config
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
    ORDER BY p.proname
  LOOP
    v_functions := v_functions || jsonb_build_object(
      'name', v_rec.func_name,
      'return_type', v_rec.return_type,
      'arguments', v_rec.arguments,
      'has_search_path', (v_rec.config IS NOT NULL AND v_rec.config @> ARRAY['search_path=public']::text[])
    );
  END LOOP;

  -- Export policy metadata
  FOR v_rec IN
    SELECT
      tablename,
      policyname,
      cmd,
      qual IS NOT NULL AS has_using,
      with_check IS NOT NULL AS has_with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  LOOP
    v_policies := v_policies || jsonb_build_object(
      'table', v_rec.tablename,
      'policy', v_rec.policyname,
      'command', v_rec.cmd,
      'has_using', v_rec.has_using,
      'has_with_check', v_rec.has_with_check
    );
  END LOOP;

  v_result := jsonb_build_object(
    'snapshot_version', '1.0',
    'snapshot_timestamp', now(),
    'database', current_database(),
    'schema', 'public',
    'tables', v_tables,
    'functions', v_functions,
    'policies', v_policies,
    'checksum', md5(v_tables::text || v_functions::text || v_policies::text)
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- 4. compare_schema_snapshots(snapshot1, snapshot2)
--    Compares two snapshots and returns differences
-- =============================================================================
CREATE OR REPLACE FUNCTION public.compare_schema_snapshots(
  snapshot1 JSONB,
  snapshot2 JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_tables_added JSONB := '[]'::JSONB;
  v_tables_removed JSONB := '[]'::JSONB;
  v_tables_changed JSONB := '[]'::JSONB;
  v_funcs_added JSONB := '[]'::JSONB;
  v_funcs_removed JSONB := '[]'::JSONB;
  v_policies_added JSONB := '[]'::JSONB;
  v_policies_removed JSONB := '[]'::JSONB;
  v_item JSONB;
  v_found BOOLEAN;
  v_t1_tables JSONB;
  v_t2_tables JSONB;
  v_t1_funcs JSONB;
  v_t2_funcs JSONB;
  v_t1_policies JSONB;
  v_t2_policies JSONB;
BEGIN
  v_t1_tables := COALESCE(snapshot1 -> 'tables', '[]'::JSONB);
  v_t2_tables := COALESCE(snapshot2 -> 'tables', '[]'::JSONB);
  v_t1_funcs := COALESCE(snapshot1 -> 'functions', '[]'::JSONB);
  v_t2_funcs := COALESCE(snapshot2 -> 'functions', '[]'::JSONB);
  v_t1_policies := COALESCE(snapshot1 -> 'policies', '[]'::JSONB);
  v_t2_policies := COALESCE(snapshot2 -> 'policies', '[]'::JSONB);

  -- Find tables in snapshot2 but not in snapshot1 (added)
  FOR v_item IN SELECT jsonb_array_elements(v_t2_tables) LOOP
    v_found := false;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_t1_tables) t
      WHERE t ->> 'name' = v_item ->> 'name'
    ) THEN
      v_found := true;
    END IF;
    IF NOT v_found THEN
      v_tables_added := v_tables_added || v_item;
    END IF;
  END LOOP;

  -- Find tables in snapshot1 but not in snapshot2 (removed)
  FOR v_item IN SELECT jsonb_array_elements(v_t1_tables) LOOP
    v_found := false;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_t2_tables) t
      WHERE t ->> 'name' = v_item ->> 'name'
    ) THEN
      v_found := true;
    END IF;
    IF NOT v_found THEN
      v_tables_removed := v_tables_removed || v_item;
    END IF;
  END LOOP;

  -- Find functions in snapshot2 but not in snapshot1 (added)
  FOR v_item IN SELECT jsonb_array_elements(v_t2_funcs) LOOP
    v_found := false;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_t1_funcs) f
      WHERE f ->> 'name' = v_item ->> 'name'
    ) THEN
      v_found := true;
    END IF;
    IF NOT v_found THEN
      v_funcs_added := v_funcs_added || v_item;
    END IF;
  END LOOP;

  -- Find functions in snapshot1 but not in snapshot2 (removed)
  FOR v_item IN SELECT jsonb_array_elements(v_t1_funcs) LOOP
    v_found := false;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_t2_funcs) f
      WHERE f ->> 'name' = v_item ->> 'name'
    ) THEN
      v_found := true;
    END IF;
    IF NOT v_found THEN
      v_funcs_removed := v_funcs_removed || v_item;
    END IF;
  END LOOP;

  -- Find policies in snapshot2 but not in snapshot1 (added)
  FOR v_item IN SELECT jsonb_array_elements(v_t2_policies) LOOP
    v_found := false;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_t1_policies) p
      WHERE p ->> 'table' = v_item ->> 'table'
        AND p ->> 'policy' = v_item ->> 'policy'
    ) THEN
      v_found := true;
    END IF;
    IF NOT v_found THEN
      v_policies_added := v_policies_added || v_item;
    END IF;
  END LOOP;

  -- Find policies in snapshot1 but not in snapshot2 (removed)
  FOR v_item IN SELECT jsonb_array_elements(v_t1_policies) LOOP
    v_found := false;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_t2_policies) p
      WHERE p ->> 'table' = v_item ->> 'table'
        AND p ->> 'policy' = v_item ->> 'policy'
    ) THEN
      v_found := true;
    END IF;
    IF NOT v_found THEN
      v_policies_removed := v_policies_removed || v_item;
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'compare_timestamp', now(),
    'snapshot1_timestamp', snapshot1 ->> 'snapshot_timestamp',
    'snapshot2_timestamp', snapshot2 ->> 'snapshot_timestamp',
    'tables_added', jsonb_array_length(v_tables_added),
    'tables_removed', jsonb_array_length(v_tables_removed),
    'functions_added', jsonb_array_length(v_funcs_added),
    'functions_removed', jsonb_array_length(v_funcs_removed),
    'policies_added', jsonb_array_length(v_policies_added),
    'policies_removed', jsonb_array_length(v_policies_removed),
    'details', jsonb_build_object(
      'tables_added', v_tables_added,
      'tables_removed', v_tables_removed,
      'functions_added', v_funcs_added,
      'functions_removed', v_funcs_removed,
      'policies_added', v_policies_added,
      'policies_removed', v_policies_removed
    ),
    'is_identical', (
      jsonb_array_length(v_tables_added) = 0
      AND jsonb_array_length(v_tables_removed) = 0
      AND jsonb_array_length(v_funcs_added) = 0
      AND jsonb_array_length(v_funcs_removed) = 0
      AND jsonb_array_length(v_policies_added) = 0
      AND jsonb_array_length(v_policies_removed) = 0
    )
  );

  RETURN v_result;
END;
$$;

COMMIT;

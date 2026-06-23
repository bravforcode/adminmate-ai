-- ============================================================
-- Performance Validation Suite
-- Provides functions to audit index coverage, table stats,
-- slow query identification, and RLS index coverage.
-- ============================================================

SET search_path = public;

-- ============================================================
-- 1. get_table_stats()
--    Returns row counts, disk sizes, and dead tuple info for
--    all user tables in the public schema.
-- ============================================================

CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
  table_name       TEXT,
  row_count        BIGINT,
  dead_tuples      BIGINT,
  table_size_bytes BIGINT,
  table_size_pretty TEXT,
  index_size_bytes BIGINT,
  index_size_pretty TEXT,
  total_size_bytes  BIGINT,
  total_size_pretty TEXT,
  last_vacuum       TIMESTAMPTZ,
  last_autovacuum    TIMESTAMPTZ,
  last_analyze       TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::TEXT                                        AS table_name,
    COALESCE(s.n_live_tup, 0)::BIGINT                     AS row_count,
    COALESCE(s.n_dead_tup, 0)::BIGINT                     AS dead_tuples,
    pg_relation_size(c.oid)::BIGINT                       AS table_size_bytes,
    pg_size_pretty(pg_relation_size(c.oid))::TEXT         AS table_size_pretty,
    pg_indexes_size(c.oid)::BIGINT                        AS index_size_bytes,
    pg_size_pretty(pg_indexes_size(c.oid))::TEXT           AS index_size_pretty,
    (pg_relation_size(c.oid) + pg_indexes_size(c.oid))::BIGINT AS total_size_bytes,
    pg_size_pretty(pg_relation_size(c.oid) + pg_indexes_size(c.oid))::TEXT AS total_size_pretty,
    s.last_vacuum,
    s.last_autovacuum,
    s.last_analyze
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
  ORDER BY pg_relation_size(c.oid) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION get_table_stats() IS
  'Performance: Returns row counts, sizes, and vacuum stats for all public tables';

GRANT EXECUTE ON FUNCTION get_table_stats() TO authenticated;

-- ============================================================
-- 2. validate_query_performance()
--    Checks for missing indexes on frequently-queried columns
--    used by RLS policies, foreign keys, and common filters.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_query_performance()
RETURNS TABLE (
  check_category   TEXT,
  table_name       TEXT,
  column_name      TEXT,
  index_exists     BOOLEAN,
  recommended_index TEXT,
  severity         TEXT,
  details          TEXT
) AS $$
DECLARE
  v_rec RECORD;
  v_idx_exists BOOLEAN;
  v_index_name TEXT;
BEGIN
  -- ── Category: RLS company_id columns ──
  -- Every table with RLS using get_user_company_id() needs
  -- an index on company_id for fast policy evaluation.
  FOR v_rec IN
    SELECT
      t.table_name::TEXT AS tbl,
      c.column_name::TEXT AS col
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'company_id'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name
  LOOP
    SELECT EXISTS(
      SELECT 1
      FROM pg_indexes i
      WHERE i.schemaname = 'public'
        AND i.tablename = v_rec.tbl
        AND i.indexdef LIKE '%' || v_rec.col || '%'
    ) INTO v_idx_exists;

    v_index_name := 'idx_' || v_rec.tbl || '_company';

    IF NOT v_idx_exists THEN
      severity := 'CRITICAL';
      details := 'RLS policy uses company_id but no index found — full table scan on every query';
    ELSE
      severity := 'OK';
      details := 'Index covering company_id exists';
    END IF;

    RETURN QUERY SELECT
      'RLS_COVERAGE'::TEXT   AS check_category,
      v_rec.tbl              AS table_name,
      v_rec.col              AS column_name,
      v_idx_exists           AS index_exists,
      v_index_name           AS recommended_index,
      severity               AS severity,
      details                AS details;
  END LOOP;

  -- ── Category: Foreign key columns without indexes ──
  -- FK columns used in JOINs should be indexed.
  FOR v_rec IN
    SELECT
      tc.table_name::TEXT   AS tbl,
      kcu.column_name::TEXT AS col
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  LOOP
    SELECT EXISTS(
      SELECT 1
      FROM pg_indexes i
      WHERE i.schemaname = 'public'
        AND i.tablename = v_rec.tbl
        AND i.indexdef LIKE '%' || v_rec.col || '%'
    ) INTO v_idx_exists;

    v_index_name := 'idx_' || v_rec.tbl || '_' || v_rec.col;

    IF NOT v_idx_exists THEN
      severity := 'HIGH';
      details := 'Foreign key column lacks index — JOIN performance degraded';
    ELSE
      severity := 'OK';
      details := 'FK column is indexed';
    END IF;

    RETURN QUERY SELECT
      'FK_INDEX'::TEXT       AS check_category,
      v_rec.tbl              AS table_name,
      v_rec.col              AS column_name,
      v_idx_exists           AS index_exists,
      v_index_name           AS recommended_index,
      severity               AS severity,
      details                AS details;
  END LOOP;

  -- ── Category: Common filter columns (status, created_at, user_id) ──
  FOR v_rec IN
    SELECT
      t.table_name::TEXT AS tbl,
      c.column_name::TEXT AS col
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name IN ('status', 'created_at', 'user_id', 'email')
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name, c.column_name
  LOOP
    SELECT EXISTS(
      SELECT 1
      FROM pg_indexes i
      WHERE i.schemaname = 'public'
        AND i.tablename = v_rec.tbl
        AND i.indexdef LIKE '%' || v_rec.col || '%'
    ) INTO v_idx_exists;

    v_index_name := 'idx_' || v_rec.tbl || '_' || v_rec.col;

    IF NOT v_idx_exists THEN
      severity := 'MEDIUM';
      details := 'Frequently filtered column lacks index — sequential scans likely';
    ELSE
      severity := 'OK';
      details := 'Filter column is indexed';
    END IF;

    RETURN QUERY SELECT
      'FILTER_COVERAGE'::TEXT AS check_category,
      v_rec.tbl               AS table_name,
      v_rec.col               AS column_name,
      v_idx_exists            AS index_exists,
      v_index_name            AS recommended_index,
      severity                AS severity,
      details                 AS details;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION validate_query_performance() IS
  'Performance: Audits missing indexes on RLS, FK, and filter columns';

GRANT EXECUTE ON FUNCTION validate_query_performance() TO authenticated;

-- ============================================================
-- 3. identify_slow_queries()
--    Identifies tables with high dead-tuple ratios, bloat,
--    or missing indexes that would cause slow queries.
-- ============================================================

CREATE OR REPLACE FUNCTION identify_slow_queries()
RETURNS TABLE (
  issue_type       TEXT,
  table_name       TEXT,
  severity         TEXT,
  current_value    TEXT,
  threshold        TEXT,
  recommendation   TEXT
) AS $$
DECLARE
  v_rec RECORD;
  v_live BIGINT;
  v_dead BIGINT;
  v_ratio NUMERIC;
  v_total_idx BIGINT;
  v_has_rls BOOLEAN;
BEGIN
  -- ── High dead-tuple ratio (needs VACUUM) ──
  FOR v_rec IN
    SELECT
      s.relname::TEXT AS tbl,
      s.n_live_tup    AS live,
      s.n_dead_tup    AS dead
    FROM pg_stat_user_tables s
    JOIN pg_namespace n ON n.oid = (s.relid)::regclass::oid
    WHERE n.nspname = 'public'
      AND s.n_live_tup > 100
    ORDER BY s.n_dead_tup DESC
  LOOP
    IF v_rec.dead > 0 AND v_rec.live > 0 THEN
      v_ratio := (v_rec.dead::NUMERIC / (v_rec.live + v_rec.dead)) * 100;
      IF v_ratio > 20 THEN
        RETURN QUERY SELECT
          'HIGH_DEAD_TUPLES'::TEXT   AS issue_type,
          v_rec.tbl                  AS table_name,
          'HIGH'::TEXT               AS severity,
          ROUND(v_ratio, 1)::TEXT || '% dead (' || v_rec.dead || ' of ' || (v_rec.live + v_rec.dead) || ')' AS current_value,
          '< 20% dead tuples'        AS threshold,
          'Run VACUUM ANALYZE on ' || v_rec.tbl || ' to reclaim space and update statistics' AS recommendation;
      END IF;
    END IF;
  END LOOP;

  -- ── Large tables without any indexes (besides PK) ──
  FOR v_rec IN
    SELECT
      c.relname::TEXT AS tbl,
      s.n_live_tup AS live
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    LEFT JOIN pg_stat_user_tables s ON s.relid = c.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND COALESCE(s.n_live_tup, 0) > 100
  LOOP
    SELECT count(*)::BIGINT INTO v_total_idx
    FROM pg_indexes i
    WHERE i.schemaname = 'public'
      AND i.tablename = v_rec.tbl;

    IF v_total_idx <= 1 THEN
      RETURN QUERY SELECT
        'TABLE_NO_INDEXES'::TEXT   AS issue_type,
        v_rec.tbl                 AS table_name,
        'MEDIUM'::TEXT            AS severity,
        v_total_idx::TEXT || ' index(es)' AS current_value,
        '>= 2 indexes per table'  AS threshold,
        'Add indexes on frequently queried columns (company_id, status, created_at)' AS recommendation;
    END IF;
  END LOOP;

  -- ── Tables with RLS but no company_id index ──
  FOR v_rec IN
    SELECT
      t.table_name::TEXT AS tbl
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND EXISTS (
        SELECT 1 FROM pg_policies p
        WHERE p.schemaname = 'public'
          AND p.tablename = t.table_name
          AND p.qual LIKE '%get_user_company_id%'
      )
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM pg_indexes i
      WHERE i.schemaname = 'public'
        AND i.tablename = v_rec.tbl
        AND i.indexdef LIKE '%company_id%'
    ) INTO v_has_rls;

    IF NOT v_has_rls THEN
      RETURN QUERY SELECT
        'RLS_NO_COMPANY_INDEX'::TEXT AS issue_type,
        v_rec.tbl                    AS table_name,
        'CRITICAL'::TEXT             AS severity,
        'No company_id index'        AS current_value,
        'company_id index required'  AS threshold,
        'Add index on company_id for RLS policy performance' AS recommendation;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION identify_slow_queries() IS
  'Performance: Identifies tables likely to cause slow queries due to missing indexes or bloat';

GRANT EXECUTE ON FUNCTION identify_slow_queries() TO authenticated;

-- ============================================================
-- 4. validate_index_coverage()
--    Checks that every RLS policy filter column has a
--    corresponding index, ensuring policy evaluation is fast.
-- ============================================================

CREATE OR REPLACE FUNCTION validate_index_coverage()
RETURNS TABLE (
  table_name       TEXT,
  policy_name      TEXT,
  policy_cmd       TEXT,
  filter_columns   TEXT,
  covered_columns  TEXT,
  uncovered_columns TEXT,
  coverage_pct     NUMERIC,
  status           TEXT,
  recommendation   TEXT
) AS $$
DECLARE
  v_pol RECORD;
  v_has_company BOOLEAN;
  v_has_user BOOLEAN;
  v_has_auth BOOLEAN;
  v_covered TEXT := '';
  v_uncovered TEXT := '';
  v_total INTEGER;
  v_covered_count INTEGER;
  v_pol_rec RECORD;
BEGIN
  FOR v_pol IN
    SELECT
      p.tablename::TEXT  AS tbl,
      p.policyname::TEXT AS pname,
      p.cmd::TEXT        AS cmd,
      COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '') AS full_qual
    FROM pg_policies p
    WHERE p.schemaname = 'public'
    ORDER BY p.tablename, p.policyname
  LOOP
    v_covered := '';
    v_uncovered := '';
    v_total := 0;
    v_covered_count := 0;

    -- Check company_id usage
    IF v_pol.full_qual LIKE '%company_id%' THEN
      v_total := v_total + 1;
      v_has_company := EXISTS(
        SELECT 1 FROM pg_indexes i
        WHERE i.schemaname = 'public' AND i.tablename = v_pol.tbl
          AND i.indexdef LIKE '%company_id%'
      );
      IF v_has_company THEN
        v_covered_count := v_covered_count + 1;
        v_covered := v_covered || 'company_id ';
      ELSE
        v_uncovered := v_uncovered || 'company_id ';
      END IF;
    END IF;

    -- Check user_id usage
    IF v_pol.full_qual LIKE '%user_id%' THEN
      v_total := v_total + 1;
      v_has_user := EXISTS(
        SELECT 1 FROM pg_indexes i
        WHERE i.schemaname = 'public' AND i.tablename = v_pol.tbl
          AND i.indexdef LIKE '%user_id%'
      );
      IF v_has_user THEN
        v_covered_count := v_covered_count + 1;
        v_covered := v_covered || 'user_id ';
      ELSE
        v_uncovered := v_uncovered || 'user_id ';
      END IF;
    END IF;

    -- Check auth.uid() usage (maps to user_id)
    IF v_pol.full_qual LIKE '%auth.uid()%' THEN
      v_total := v_total + 1;
      v_has_auth := EXISTS(
        SELECT 1 FROM pg_indexes i
        WHERE i.schemaname = 'public' AND i.tablename = v_pol.tbl
          AND i.indexdef LIKE '%user_id%'
      );
      IF v_has_auth THEN
        v_covered_count := v_covered_count + 1;
        v_covered := v_covered || 'user_id(auth) ';
      ELSE
        v_uncovered := v_uncovered || 'user_id(auth) ';
      END IF;
    END IF;

    IF v_total = 0 THEN
      -- Policy doesn't reference indexed columns we check
      coverage_pct := 100;
      status := 'N/A';
      recommendation := 'Policy uses custom filter — manual review recommended';
    ELSE
      coverage_pct := ROUND((v_covered_count::NUMERIC / v_total) * 100, 1);
      IF coverage_pct = 100 THEN
        status := 'PASS';
        recommendation := 'All RLS filter columns are indexed';
      ELSIF coverage_pct >= 50 THEN
        status := 'PARTIAL';
        recommendation := 'Add indexes on: ' || TRIM(v_uncovered);
      ELSE
        status := 'FAIL';
        recommendation := 'CRITICAL: Missing indexes on: ' || TRIM(v_uncovered) || ' — full table scans on policy eval';
      END IF;
    END IF;

    RETURN QUERY SELECT
      v_pol.tbl               AS table_name,
      v_pol.pname             AS policy_name,
      v_pol.cmd               AS policy_cmd,
      TRIM(COALESCE(v_covered, '') || ' ' || COALESCE(v_uncovered, '')) AS filter_columns,
      TRIM(COALESCE(v_covered, '')) AS covered_columns,
      TRIM(COALESCE(v_uncovered, '')) AS uncovered_columns,
      coverage_pct            AS coverage_pct,
      status                  AS status,
      recommendation          AS recommendation;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION validate_index_coverage() IS
  'Performance: Validates that RLS policy filter columns have corresponding indexes';

GRANT EXECUTE ON FUNCTION validate_index_coverage() TO authenticated;

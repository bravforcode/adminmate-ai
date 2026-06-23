-- ============================================================
-- 33B.11: Performance Validation — pgTAP Tests
-- Verifies all performance validation functions work correctly
-- and that index coverage is adequate.
-- ============================================================

SELECT plan(14);

-- ============================================================
-- Test 1: get_table_stats() is callable
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM get_table_stats()$$,
  'get_table_stats is callable'
);

-- ============================================================
-- Test 2: get_table_stats() returns rows for existing tables
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM get_table_stats()) > 0,
  'get_table_stats returns at least one table entry'
);

-- ============================================================
-- Test 3: get_table_stats() has required columns
-- ============================================================

SELECT ok(
  (SELECT count(*)::INTEGER
   FROM pg_proc p
   JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'get_table_stats'
     AND p.proretset = true) = 1,
  'get_table_stats is a set-returning function'
);

-- ============================================================
-- Test 4: validate_query_performance() is callable
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM validate_query_performance()$$,
  'validate_query_performance is callable'
);

-- ============================================================
-- Test 5: validate_query_performance() returns rows
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_query_performance()) > 0,
  'validate_query_performance returns at least one check result'
);

-- ============================================================
-- Test 6: validate_query_performance() only returns valid severity
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_query_performance()
   WHERE severity NOT IN ('OK', 'CRITICAL', 'HIGH', 'MEDIUM')) = 0,
  'All severity values are valid (OK/CRITICAL/HIGH/MEDIUM)'
);

-- ============================================================
-- Test 7: validate_query_performance() covers RLS category
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_query_performance()
   WHERE check_category = 'RLS_COVERAGE') > 0,
  'RLS_COVERAGE category has entries'
);

-- ============================================================
-- Test 8: identify_slow_queries() is callable
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM identify_slow_queries()$$,
  'identify_slow_queries is callable'
);

-- ============================================================
-- Test 9: identify_slow_queries() returns valid issue types
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM identify_slow_queries()
   WHERE issue_type NOT IN ('HIGH_DEAD_TUPLES', 'TABLE_NO_INDEXES', 'RLS_NO_COMPANY_INDEX')) = 0,
  'All issue types are valid (HIGH_DEAD_TUPLES/TABLE_NO_INDEXES/RLS_NO_COMPANY_INDEX)'
);

-- ============================================================
-- Test 10: identify_slow_queries() has valid severity
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM identify_slow_queries()
   WHERE severity NOT IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')) = 0,
  'All identify_slow_queries severity values are valid'
);

-- ============================================================
-- Test 11: validate_index_coverage() is callable
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM validate_index_coverage()$$,
  'validate_index_coverage is callable'
);

-- ============================================================
-- Test 12: validate_index_coverage() returns rows
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_index_coverage()) > 0,
  'validate_index_coverage returns at least one policy coverage entry'
);

-- ============================================================
-- Test 13: validate_index_coverage() has valid status values
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_index_coverage()
   WHERE status NOT IN ('PASS', 'PARTIAL', 'FAIL', 'N/A')) = 0,
  'All validate_index_coverage status values are valid (PASS/PARTIAL/FAIL/N/A)'
);

-- ============================================================
-- Test 14: validate_index_coverage() coverage_pct is 0-100
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_index_coverage()
   WHERE coverage_pct < 0 OR coverage_pct > 100) = 0,
  'All coverage_pct values are between 0 and 100'
);

-- ============================================================
-- Finish tests
-- ============================================================

SELECT * FROM finish();

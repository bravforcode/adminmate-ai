-- ============================================================
-- 33B.10: Release Readiness Review — pgTAP Tests
-- Verifies all release readiness functions work correctly
-- and that gates A-L are properly evaluated.
-- ============================================================

SELECT plan(14);

-- ============================================================
-- Test 1: get_release_readiness_score() is callable
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM get_release_readiness_score()$$,
  'get_release_readiness_score is callable'
);

-- ============================================================
-- Test 2: validate_all_gates() returns 12 gates
-- ============================================================

SELECT is(
  (SELECT count(*)::INTEGER FROM validate_all_gates()),
  12,
  'validate_all_gates returns exactly 12 gates (A-L)'
);

-- ============================================================
-- Test 3: get_release_blockers() is callable
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM get_release_blockers()$$,
  'get_release_blockers is callable'
);

-- ============================================================
-- Test 4: generate_release_report() is callable
-- ============================================================

SELECT lives_ok(
  $$SELECT * FROM generate_release_report()$$,
  'generate_release_report is callable'
);

-- ============================================================
-- Test 5: Readiness score is between 0 and 100
-- ============================================================

SELECT ok(
  (SELECT overall_score FROM get_release_readiness_score()) >= 0
  AND (SELECT overall_score FROM get_release_readiness_score()) <= 100,
  'Readiness score is between 0 and 100'
);

-- ============================================================
-- Test 6: All gates have valid status values
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_all_gates()
   WHERE gate_status NOT IN ('PASS', 'PARTIAL', 'FAIL')) = 0,
  'All gates have valid status (PASS/PARTIAL/FAIL)'
);

-- ============================================================
-- Test 7: Gate IDs cover A through L
-- ============================================================

SELECT is(
  (SELECT string_agg(gate_id::TEXT, ',' ORDER BY gate_id) FROM validate_all_gates()),
  'A,B,C,D,E,F,G,H,I,J,K,L',
  'Gate IDs cover A through L'
);

-- ============================================================
-- Test 8: Each gate has a non-empty name
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_all_gates() WHERE gate_name IS NULL OR gate_name = '') = 0,
  'All gates have non-empty names'
);

-- ============================================================
-- Test 9: Each gate has a non-empty details text
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_all_gates() WHERE details IS NULL OR details = '') = 0,
  'All gates have non-empty details'
);

-- ============================================================
-- Test 10: Gate scores are between 0 and 100
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM validate_all_gates()
   WHERE gate_score < 0 OR gate_score > 100) = 0,
  'All gate scores are between 0 and 100'
);

-- ============================================================
-- Test 11: Blockers have valid blocker_type values (or NULL for no-blockers case)
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM get_release_blockers()
   WHERE blocker_type IS NOT NULL
     AND blocker_type NOT IN ('CRITICAL', 'HIGH', 'MEDIUM')) = 0,
  'All blockers have valid types (CRITICAL/HIGH/MEDIUM) or NULL for no-blockers case'
);

-- ============================================================
-- Test 12: Report has required sections
-- ============================================================

SELECT ok(
  (SELECT count(DISTINCT report_section) FROM generate_release_report()) >= 4,
  'Report has at least 4 sections (SUMMARY, GATES, BLOCKERS, SCHEMA_INVENTORY, FEATURES, RECOMMENDATION)'
);

-- ============================================================
-- Test 13: Report SUMMARY section has overall_score
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM generate_release_report()
   WHERE report_section = 'SUMMARY' AND report_key = 'overall_score') = 1,
  'Report SUMMARY section contains overall_score'
);

-- ============================================================
-- Test 14: Report RECOMMENDATION section has status
-- ============================================================

SELECT ok(
  (SELECT count(*) FROM generate_release_report()
   WHERE report_section = 'RECOMMENDATION' AND report_key = 'status') = 1,
  'Report RECOMMENDATION section contains status'
);

-- ============================================================
-- Finish tests
-- ============================================================

SELECT * FROM finish();

-- 33B.9: Pilot Readiness tests
-- Verifies pilot readiness assessment functions work correctly

SELECT plan(12);

-- ============================================================
-- Test 1-3: Functions exist and are callable
-- ============================================================

-- Test 1: get_pilot_readiness_checklist is callable
SELECT lives_ok(
  $$SELECT * FROM get_pilot_readiness_checklist()$$,
  'get_pilot_readiness_checklist is callable'
);

-- Test 2: validate_pilot_prerequisites is callable
SELECT lives_ok(
  $$SELECT * FROM validate_pilot_prerequisites()$$,
  'validate_pilot_prerequisites is callable'
);

-- Test 3: get_pilot_risk_assessment is callable
SELECT lives_ok(
  $$SELECT * FROM get_pilot_risk_assessment()$$,
  'get_pilot_risk_assessment is callable'
);

-- ============================================================
-- Test 4-6: Checklist structure and content
-- ============================================================

-- Test 4: Checklist returns JSONB with required fields
SELECT ok(
  (SELECT (get_pilot_readiness_checklist() ? 'checklist')
   AND (get_pilot_readiness_checklist() ? 'total_items')
   AND (get_pilot_readiness_checklist() ? 'passed')
   AND (get_pilot_readiness_checklist() ? 'failed')),
  'Checklist returns JSONB with checklist, total_items, passed, failed keys'
);

-- Test 5: Checklist has at least 5 items
SELECT ok(
  (SELECT (get_pilot_readiness_checklist()->>'total_items')::INT >= 5),
  'Checklist has at least 5 readiness items'
);

-- Test 6: Checklist RLS item exists
SELECT ok(
  (SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      (get_pilot_readiness_checklist()->'checklist')
    ) e WHERE e->>'item' = 'RLS Coverage'
  )),
  'Checklist includes RLS Coverage item'
);

-- ============================================================
-- Test 7-9: Prerequisites structure and validation
-- ============================================================

-- Test 7: Prerequisites returns JSONB with required fields
SELECT ok(
  (SELECT (validate_pilot_prerequisites() ? 'prerequisites')
   AND (validate_pilot_prerequisites() ? 'total')
   AND (validate_pilot_prerequisites() ? 'all_met')),
  'Prerequisites returns JSONB with prerequisites, total, all_met keys'
);

-- Test 8: Prerequisites has at least 5 items
SELECT ok(
  (SELECT (validate_pilot_prerequisites()->>'total')::INT >= 5),
  'Prerequisites has at least 5 prerequisite checks'
);

-- Test 9: RLS prerequisite is the first check
SELECT ok(
  (SELECT EXISTS (
    SELECT 1 FROM jsonb_array_elements(
      (validate_pilot_prerequisites()->'prerequisites')
    ) e WHERE e->>'prerequisite' LIKE '%RLS%'
  )),
  'Prerequisites includes RLS validation'
);

-- ============================================================
-- Test 10-11: Risk assessment structure
-- ============================================================

-- Test 10: Risk assessment returns JSONB with risk_score
SELECT ok(
  (SELECT (get_pilot_risk_assessment() ? 'risk_score')
   AND (get_pilot_risk_assessment() ? 'risk_level')
   AND (get_pilot_risk_assessment() ? 'pilot_ready')),
  'Risk assessment returns JSONB with risk_score, risk_level, pilot_ready'
);

-- Test 11: Risk score is between 0 and 100
SELECT ok(
  (SELECT (get_pilot_risk_assessment()->>'risk_score')::INT BETWEEN 0 AND 100),
  'Risk score is between 0 and 100'
);

-- ============================================================
-- Test 12: Generate report combines all sub-reports
-- ============================================================

-- Test 12: Report includes checklist, prerequisites, risk_assessment, verdict
SELECT ok(
  (SELECT (generate_pilot_report() ? 'checklist')
   AND (generate_pilot_report() ? 'prerequisites')
   AND (generate_pilot_report() ? 'risk_assessment')
   AND (generate_pilot_report() ? 'verdict')
   AND (generate_pilot_report() ? 'summary')),
  'Report includes checklist, prerequisites, risk_assessment, verdict, and summary'
);

-- ============================================================
-- Finish tests
-- ============================================================

SELECT * FROM finish();

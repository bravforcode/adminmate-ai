-- Test: 33b5_backup_restore_validation.sql
-- Release 33B.5: Backup/Restore Validation
-- 19 pgTAP tests for backup/restore validation functions

SET search_path = public, pgTAP;
SELECT plan(19);

-- =============================================================================
-- TEST 1: validate_backup_integrity() exists and returns JSONB
-- =============================================================================
SELECT has_function(
  'public',
  'validate_backup_integrity',
  'validate_backup_integrity() function exists'
);

SELECT is(
  pg_typeof(public.validate_backup_integrity())::TEXT,
  'jsonb'::TEXT,
  'validate_backup_integrity() returns JSONB'
);

-- =============================================================================
-- TEST 2: validate_backup_integrity() returns table count > 0
-- =============================================================================
SELECT ok(
  (public.validate_backup_integrity() -> 'tables' ->> 'total')::INT > 0,
  'validate_backup_integrity() reports table count > 0'
);

-- =============================================================================
-- TEST 3: validate_backup_integrity() tracks RLS status
-- =============================================================================
SELECT ok(
  public.validate_backup_integrity() ? 'tables',
  'validate_backup_integrity() includes tables key with RLS info'
);

-- =============================================================================
-- TEST 4: validate_backup_integrity() tracks function search_path
-- =============================================================================
SELECT ok(
  public.validate_backup_integrity() ? 'functions',
  'validate_backup_integrity() includes functions key with search_path info'
);

-- =============================================================================
-- TEST 5: validate_backup_integrity() returns overall_pass boolean
-- =============================================================================
SELECT ok(
  public.validate_backup_integrity() ? 'overall_pass',
  'validate_backup_integrity() includes overall_pass boolean'
);

-- =============================================================================
-- TEST 6: validate_restore_completeness() exists and returns JSONB
-- =============================================================================
SELECT has_function(
  'public',
  'validate_restore_completeness',
  'validate_restore_completeness() function exists'
);

SELECT is(
  pg_typeof(public.validate_restore_completeness())::TEXT,
  'jsonb'::TEXT,
  'validate_restore_completeness() returns JSONB'
);

-- =============================================================================
-- TEST 7: validate_restore_completeness() reports table count
-- =============================================================================
SELECT ok(
  (public.validate_restore_completeness() ->> 'tables')::INT > 0,
  'validate_restore_completeness() reports table count > 0'
);

-- =============================================================================
-- TEST 8: validate_restore_completeness() reports function count
-- =============================================================================
SELECT ok(
  (public.validate_restore_completeness() ->> 'functions')::INT > 0,
  'validate_restore_completeness() reports function count > 0'
);

-- =============================================================================
-- TEST 9: validate_restore_completeness() includes snapshot timestamp
-- =============================================================================
SELECT ok(
  (public.validate_restore_completeness() ->> 'snapshot_timestamp') IS NOT NULL,
  'validate_restore_completeness() includes snapshot_timestamp'
);

-- =============================================================================
-- TEST 10: export_schema_snapshot() exists and returns JSONB
-- =============================================================================
SELECT has_function(
  'public',
  'export_schema_snapshot',
  'export_schema_snapshot() function exists'
);

SELECT is(
  pg_typeof(public.export_schema_snapshot())::TEXT,
  'jsonb'::TEXT,
  'export_schema_snapshot() returns JSONB'
);

-- =============================================================================
-- TEST 11: export_schema_snapshot() contains required fields
-- =============================================================================
SELECT ok(
  public.export_schema_snapshot() ? 'snapshot_version'
  AND public.export_schema_snapshot() ? 'snapshot_timestamp'
  AND public.export_schema_snapshot() ? 'database'
  AND public.export_schema_snapshot() ? 'tables'
  AND public.export_schema_snapshot() ? 'functions'
  AND public.export_schema_snapshot() ? 'policies'
  AND public.export_schema_snapshot() ? 'checksum',
  'export_schema_snapshot() contains all required fields'
);

-- =============================================================================
-- TEST 12: export_schema_snapshot() includes tables array with entries
-- =============================================================================
SELECT ok(
  jsonb_array_length(public.export_schema_snapshot() -> 'tables') > 0,
  'export_schema_snapshot() includes tables array with entries'
);

-- =============================================================================
-- TEST 13: export_schema_snapshot() includes functions array with entries
-- =============================================================================
SELECT ok(
  jsonb_array_length(public.export_schema_snapshot() -> 'functions') > 0,
  'export_schema_snapshot() includes functions array with entries'
);

-- =============================================================================
-- TEST 14: compare_schema_snapshots() identical snapshots returns is_identical=true
-- =============================================================================
SELECT has_function(
  'public',
  'compare_schema_snapshots',
  'compare_schema_snapshots() function exists'
);

SELECT is(
  (public.compare_schema_snapshots(
    public.export_schema_snapshot(),
    public.export_schema_snapshot()
  ) ->> 'is_identical')::BOOLEAN,
  true,
  'compare_schema_snapshots() with identical snapshots returns is_identical=true'
);

-- =============================================================================
-- TEST 15: compare_schema_snapshots() different snapshots returns differences
-- =============================================================================
SELECT is(
  (public.compare_schema_snapshots(
    public.export_schema_snapshot(),
    jsonb_build_object(
      'tables', '[]'::jsonb,
      'functions', '[]'::jsonb,
      'policies', '[]'::jsonb
    )
  ) ->> 'is_identical')::BOOLEAN,
  false,
  'compare_schema_snapshots() with different snapshots returns is_identical=false'
);

-- =============================================================================
-- Finish
-- =============================================================================
SELECT * FROM finish();

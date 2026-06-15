-- Test: audit_logs append-only trigger
-- Run after migration: 20240105000003_audit_logs_append_only.sql
-- Usage: psql -U postgres -d <your_db> -f tests/test_audit_logs_append_only.sql

DO $$
DECLARE
  v_test_id UUID;
  v_passed INT := 0;
  v_failed INT := 0;
  v_count INT;
BEGIN
  RAISE NOTICE '=== TEST: audit_logs append-only ===';

  -- Test 1: Function exists
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_proc WHERE proname = 'prevent_audit_log_modification'
    ) THEN
      RAISE NOTICE '✓ Test 1 PASS: Function prevent_audit_log_modification exists';
      v_passed := v_passed + 1;
    ELSE
      RAISE NOTICE '✗ Test 1 FAIL: Function not found';
      v_failed := v_failed + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Test 1 FAIL: %', SQLERRM;
    v_failed := v_failed + 1;
  END;

  -- Test 2: UPDATE trigger exists
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_audit_logs_append_only_update'
        AND tgrelid = 'audit_logs'::regclass
    ) THEN
      RAISE NOTICE '✓ Test 2 PASS: UPDATE trigger exists';
      v_passed := v_passed + 1;
    ELSE
      RAISE NOTICE '✗ Test 2 FAIL: UPDATE trigger not found';
      v_failed := v_failed + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Test 2 FAIL: %', SQLERRM;
    v_failed := v_failed + 1;
  END;

  -- Test 3: DELETE trigger exists
  BEGIN
    IF EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_audit_logs_append_only_delete'
        AND tgrelid = 'audit_logs'::regclass
    ) THEN
      RAISE NOTICE '✓ Test 3 PASS: DELETE trigger exists';
      v_passed := v_passed + 1;
    ELSE
      RAISE NOTICE '✗ Test 3 FAIL: DELETE trigger not found';
      v_failed := v_failed + 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Test 3 FAIL: %', SQLERRM;
    v_failed := v_failed + 1;
  END;

  -- Test 4: INSERT is allowed (append-only)
  BEGIN
    INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (NULL, NULL, 'test_append_action', 'test_entity', NULL, '{}', '{"k":"v"}')
    RETURNING id INTO v_test_id;

    SELECT COUNT(*) INTO v_count FROM audit_logs WHERE id = v_test_id;
    IF v_count = 1 THEN
      RAISE NOTICE '✓ Test 4 PASS: INSERT allowed (append-only)';
      v_passed := v_passed + 1;
    ELSE
      RAISE NOTICE '✗ Test 4 FAIL: INSERT did not persist';
      v_failed := v_failed + 1;
    END IF;

    -- Cleanup test data (DELETE will be tested next, so use TRUNCATE or direct SQL)
    -- We use the same function's exception path to verify DELETE is rejected
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ Test 4 FAIL: %', SQLERRM;
    v_failed := v_failed + 1;
  END;

  -- Test 5: UPDATE is rejected
  BEGIN
    UPDATE audit_logs SET action = 'should_fail' WHERE id = v_test_id;
    RAISE NOTICE '✗ Test 5 FAIL: UPDATE should have raised exception';
    v_failed := v_failed + 1;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%append-only%' THEN
        RAISE NOTICE '✓ Test 5 PASS: UPDATE rejected with correct message';
        v_passed := v_passed + 1;
      ELSE
        RAISE NOTICE '✗ Test 5 FAIL: Wrong error message: %', SQLERRM;
        v_failed := v_failed + 1;
      END IF;
  END;

  -- Test 6: DELETE is rejected
  BEGIN
    DELETE FROM audit_logs WHERE id = v_test_id;
    RAISE NOTICE '✗ Test 6 FAIL: DELETE should have raised exception';
    v_failed := v_failed + 1;
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%append-only%' THEN
        RAISE NOTICE '✓ Test 6 PASS: DELETE rejected with correct message';
        v_passed := v_passed + 1;
      ELSE
        RAISE NOTICE '✗ Test 6 FAIL: Wrong error message: %', SQLERRM;
        v_failed := v_failed + 1;
      END IF;
  END;

  -- Cleanup: direct DELETE bypassing triggers (for test cleanup only)
  EXECUTE 'DELETE FROM audit_logs WHERE action = ''test_append_action''';

  -- Summary
  RAISE NOTICE '=== RESULT: % passed, % failed ===', v_passed, v_failed;

  IF v_failed > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: % tests failed', v_failed;
  END IF;
END;
$$;

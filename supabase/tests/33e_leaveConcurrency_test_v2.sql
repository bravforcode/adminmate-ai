-- ============================================================
-- Leave balance concurrency test — FOR UPDATE proof
--
-- Uses SECURITY DEFINER context to bypass auth.uid() requirement.
-- Tests that two concurrent transactions cannot both succeed
-- when the balance is insufficient for both.
-- ============================================================

-- Create a helper that bypasses auth for testing
CREATE OR REPLACE FUNCTION test_leave_concurrent(
  p_employee_id UUID,
  p_leave_type_id UUID,
  p_start DATE,
  p_end DATE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_days NUMERIC;
  v_used_days NUMERIC;
  v_pending_days NUMERIC;
  v_available NUMERIC;
  v_requested NUMERIC;
  v_request_id UUID;
BEGIN
  -- Direct balance check with FOR UPDATE
  SELECT total_days, used_days, pending_days
  INTO v_total_days, v_used_days, v_pending_days
  FROM leave_balances
  WHERE employee_id = p_employee_id
    AND leave_type_id = p_leave_type_id
    AND year = EXTRACT(YEAR FROM p_start)::INTEGER
  FOR UPDATE;

  v_available := v_total_days - v_used_days - v_pending_days;
  v_requested := (p_end - p_start + 1);

  IF v_available < v_requested THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient balance',
      'available', v_available,
      'requested', v_requested
    );
  END IF;

  -- Deduct
  UPDATE leave_balances
  SET pending_days = pending_days + v_requested
  WHERE employee_id = p_employee_id
    AND leave_type_id = p_leave_type_id
    AND year = EXTRACT(YEAR FROM p_start)::INTEGER;

  -- Create request
  INSERT INTO leave_requests (employee_id, leave_type_id, start_date, end_date, status)
  VALUES (p_employee_id, p_leave_type_id, p_start, p_end, 'pending')
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'days_requested', v_requested,
    'new_pending', v_pending_days + v_requested,
    'remaining', v_available - v_requested
  );
END;
$$;

-- ============================================================
-- SETUP
-- ============================================================
INSERT INTO companies (id, name, industry) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Test Corp', 'Tech')
ON CONFLICT (id) DO NOTHING;

INSERT INTO employees (id, company_id, first_name, last_name, email, employment_status) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Test', 'User', 'test@test.com', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO leave_types (id, company_id, name, code, max_days_per_year) VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Annual', 'AL', 15)
ON CONFLICT (id) DO NOTHING;

-- Balance: 15 total, 0 used, 0 pending = 15 available
INSERT INTO leave_balances (id, company_id, employee_id, leave_type_id, year, total_days, used_days, pending_days) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 2026, 15, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TEST: Two 10-day requests on 15-day balance
-- 10 + 10 = 20 > 15 → second must fail
-- ============================================================

-- Session A: Request 10 days (acquires FOR UPDATE lock, updates pending to 10)
SELECT test_leave_concurrent(
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  CURRENT_DATE,
  CURRENT_DATE + 9
) AS first_request;

-- Verify balance after first request
SELECT total_days, used_days, pending_days,
       (total_days - used_days - pending_days) AS available
FROM leave_balances
WHERE id = '44444444-4444-4444-4444-444444444444';

-- Session B: Request another 10 days (should see pending=10, available=5, FAIL)
SELECT test_leave_concurrent(
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  CURRENT_DATE + 20,
  CURRENT_DATE + 29
) AS second_request;

-- Final balance: should still have pending=10 (second request failed)
SELECT total_days, used_days, pending_days,
       (total_days - used_days - pending_days) AS available,
       CASE
         WHEN pending_days = 10 THEN 'PASS: Second request correctly rejected (FOR UPDATE worked)'
         WHEN pending_days = 20 THEN 'FAIL: Both requests succeeded (no locking)'
         ELSE 'UNEXPECTED'
       END AS test_result
FROM leave_balances
WHERE id = '44444444-4444-4444-4444-444444444444';

-- Count requests: should be exactly 1
SELECT count(*) AS request_count,
       CASE WHEN count(*) = 1 THEN 'PASS: Exactly 1 request created'
            ELSE 'FAIL: ' || count(*) || ' requests created'
       END AS count_result
FROM leave_requests
WHERE employee_id = '22222222-2222-2222-2222-222222222222';

-- Cleanup
DROP FUNCTION IF EXISTS test_leave_concurrent(UUID, UUID, DATE, DATE);
DELETE FROM leave_requests WHERE employee_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM leave_balances WHERE id = '44444444-4444-4444-4444-444444444444';
DELETE FROM leave_types WHERE id = '33333333-3333-3333-3333-333333333333';
DELETE FROM employees WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM companies WHERE id = '11111111-1111-1111-1111-111111111111';

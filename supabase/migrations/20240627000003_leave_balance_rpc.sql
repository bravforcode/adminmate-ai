-- ============================================================
-- Leave Request RPC: leave_request_create
--
-- Creates a leave request with atomic balance deduction using
-- SELECT ... FOR UPDATE to prevent race conditions when
-- multiple requests are submitted simultaneously for the
-- same employee/leave type.
--
-- Prevents: double-spending of leave balance, negative balances,
-- and the classic TOCTOU bug where two concurrent requests both
-- read the same balance and both succeed.
--
-- Steps:
--   1. Validate inputs and resolve employee
--   2. SELECT FOR UPDATE on the leave_balance row (locks it)
--   3. Check sufficient balance (total - used - pending >= requested)
--   4. Deduct from balance (increment pending_days)
--   5. Create leave_request record
--   6. Return the created request
-- ============================================================

CREATE OR REPLACE FUNCTION leave_request_create(
  p_employee_id   UUID,
  p_leave_type_id UUID,
  p_start_date    DATE,
  p_end_date      DATE,
  p_reason        TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id      UUID;
  v_company_id   UUID;
  v_current_year INTEGER := EXTRACT(YEAR FROM p_start_date)::INTEGER;
  v_total_days   NUMERIC(6,2);
  v_balance      RECORD;
  v_request_id   UUID;
  v_available    NUMERIC(6,2);
BEGIN
  -- ── 0. Resolve authenticated user and company ──
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT company_id INTO v_company_id
  FROM user_profiles
  WHERE id = v_user_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company associated with authenticated user';
  END IF;

  -- ── 1. Validate inputs ──
  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'end_date (%) cannot be before start_date (%)', p_end_date, p_start_date;
  END IF;

  -- Calculate total days (inclusive of both start and end)
  v_total_days := (p_end_date - p_start_date + 1)::NUMERIC(6,2);

  IF v_total_days <= 0 THEN
    RAISE EXCEPTION 'total_days must be positive, got %', v_total_days;
  END IF;

  -- ── 2. Verify employee belongs to the same company ──
  -- (prevents cross-tenant leave creation)
  IF NOT EXISTS (
    SELECT 1 FROM employees
    WHERE id = p_employee_id
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Employee not found or belongs to a different company';
  END IF;

  -- ── 3. Verify leave type exists for this company ──
  IF NOT EXISTS (
    SELECT 1 FROM leave_types
    WHERE id = p_leave_type_id
      AND company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Leave type not found for this company';
  END IF;

  -- ── 4. Lock the balance row (FOR UPDATE) ──
  -- This blocks concurrent transactions until we commit/rollback
  SELECT lb.*
  INTO v_balance
  FROM leave_balances lb
  WHERE lb.employee_id = p_employee_id
    AND lb.leave_type_id = p_leave_type_id
    AND lb.year = v_current_year
    AND lb.company_id = v_company_id
  FOR UPDATE;

  -- ── 5. Create balance row if it doesn't exist ──
  IF NOT FOUND THEN
    INSERT INTO leave_balances (company_id, employee_id, leave_type_id, year, total_days, used_days, pending_days, carried_over_days)
    VALUES (v_company_id, p_employee_id, p_leave_type_id, v_current_year, 0, 0, 0, 0)
    RETURNING * INTO v_balance;
  END IF;

  -- ── 6. Check sufficient available balance ──
  -- Available = total_days - used_days - pending_days + carried_over_days
  v_available := v_balance.total_days - v_balance.used_days - v_balance.pending_days + v_balance.carried_over_days;

  IF v_available < v_total_days THEN
    RAISE EXCEPTION
      'Insufficient leave balance. Available: % days, Requested: % days (total: %, used: %, pending: %, carried_over: %)',
      v_available, v_total_days,
      v_balance.total_days, v_balance.used_days, v_balance.pending_days, v_balance.carried_over_days;
  END IF;

  -- ── 7. Deduct from balance (add to pending) ──
  UPDATE leave_balances
  SET pending_days = pending_days + v_total_days,
      updated_at = NOW()
  WHERE id = v_balance.id;

  -- ── 8. Create the leave request ──
  v_request_id := gen_random_uuid();

  INSERT INTO leave_requests (
    id, company_id, employee_id, leave_type_id,
    start_date, end_date, total_days, reason, status,
    created_at, updated_at
  ) VALUES (
    v_request_id, v_company_id, p_employee_id, p_leave_type_id,
    p_start_date, p_end_date, v_total_days, p_reason, 'pending',
    NOW(), NOW()
  );

  -- ── 9. Return the created request with balance info ──
  RETURN jsonb_build_object(
    'request_id', v_request_id,
    'employee_id', p_employee_id,
    'leave_type_id', p_leave_type_id,
    'start_date', p_start_date,
    'end_date', p_end_date,
    'total_days', v_total_days,
    'status', 'pending',
    'balance', jsonb_build_object(
      'available_before', v_available,
      'available_after', v_available - v_total_days,
      'pending_days', v_balance.pending_days + v_total_days
    )
  );
END;
$$;

-- ============================================================
-- Companion: approve a leave request (deducts from pending→used)
-- ============================================================

CREATE OR REPLACE FUNCTION leave_request_approve(
  p_request_id   UUID,
  p_approved_by  UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request   RECORD;
  v_user_id   UUID;
  v_company_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT company_id INTO v_company_id
  FROM user_profiles WHERE id = v_user_id;

  -- Fetch and lock the request
  SELECT lr.* INTO v_request
  FROM leave_requests lr
  WHERE lr.id = p_request_id
    AND lr.company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'Cannot approve request in status ''%''. Must be ''pending''.', v_request.status;
  END IF;

  -- Move from pending to used
  UPDATE leave_balances
  SET pending_days = pending_days - v_request.total_days,
      used_days = used_days + v_request.total_days,
      updated_at = NOW()
  WHERE employee_id = v_request.employee_id
    AND leave_type_id = v_request.leave_type_id
    AND year = EXTRACT(YEAR FROM v_request.start_date)::INTEGER
    AND company_id = v_company_id;

  -- Update request status
  UPDATE leave_requests
  SET status = 'approved',
      approved_by = p_approved_by,
      approved_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'request_id', p_request_id,
    'status', 'approved',
    'total_days', v_request.total_days
  );
END;
$$;

GRANT EXECUTE ON FUNCTION leave_request_create(UUID, UUID, DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_request_approve(UUID, UUID) TO authenticated;

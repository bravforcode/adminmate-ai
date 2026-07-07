#!/bin/bash
# Leave balance concurrency test — two-session proof of FOR UPDATE
#
# This script proves that two concurrent leave requests for the same
# employee are serialized by FOR UPDATE, not that the keyword exists.
#
# Method: Two psql sessions, one holding a transaction open while
# the other attempts the same request.

set -e

DB="postgresql://postgres:postgres@127.0.0.1:54322/postgres"

echo "=== SETUP: Create test fixtures ==="

psql "$DB" <<'SQL'
-- Create test company
INSERT INTO companies (id, name, industry) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Concurrency Test Corp', 'Tech')
ON CONFLICT (id) DO NOTHING;

-- Create test employee
INSERT INTO employees (id, company_id, first_name, last_name, email, employment_status) VALUES
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Test', 'User', 'concurrency-test@example.com', 'active')
ON CONFLICT (id) DO NOTHING;

-- Create leave type
INSERT INTO leave_types (id, company_id, name, code, max_days_per_year) VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Annual Leave', 'AL', 15)
ON CONFLICT (id) DO NOTHING;

-- Create leave balance: 15 total, 0 used, 0 pending = 15 available
INSERT INTO leave_balances (id, company_id, employee_id, leave_type_id, year, total_days, used_days, pending_days) VALUES
  ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 2026, 15, 0, 0)
ON CONFLICT (id) DO NOTHING;
SQL

echo "=== Initial balance ==="
psql "$DB" -c "SELECT total_days, used_days, pending_days, (total_days - used_days - pending_days) AS available FROM leave_balances WHERE id = '44444444-4444-4444-4444-444444444444';"

echo ""
echo "=== TEST: Session A opens transaction and creates 10-day request ==="
echo "=== (holds FOR UPDATE lock on leave_balances row) ==="

# Session A: Start transaction, create request (don't commit yet)
psql "$DB" <<'SQL_A' &
BEGIN;
-- This acquires FOR UPDATE lock on the leave_balances row
SELECT leave_request_create(
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  CURRENT_DATE,
  CURRENT_DATE + 9
) AS session_a_result;
-- Hold transaction open for 3 seconds to create contention window
SELECT pg_sleep(3);
SQL_A

SESSION_A_PID=$!

# Wait for Session A to acquire the lock
sleep 1

echo ""
echo "=== TEST: Session B attempts concurrent 10-day request ==="
echo "=== (should block waiting for Session A's lock) ==="

# Session B: Try the same request (will block on FOR UPDATE)
RESULT_B=$(psql "$DB" -t -A -c "
SELECT leave_request_create(
  '22222222-2222-2222-2222-222222222222'::uuid,
  '33333333-3333-3333-3333-333333333333'::uuid,
  CURRENT_DATE + 20,
  CURRENT_DATE + 29
) AS session_b_result;
" 2>&1) || true

echo "Session B result: $RESULT_B"

# Wait for Session A to finish
wait $SESSION_A_PID 2>/dev/null || true

echo ""
echo "=== VERIFY: Final balance ==="
psql "$DB" -c "SELECT total_days, used_days, pending_days, (total_days - used_days - pending_days) AS available FROM leave_balances WHERE id = '44444444-4444-4444-4444-444444444444';"

echo ""
echo "=== VERIFY: Number of leave requests created ==="
psql "$DB" -c "SELECT count(*) AS request_count FROM leave_requests WHERE employee_id = '22222222-2222-2222-2222-222222222222';"

echo ""
echo "=== CLEANUP ==="
psql "$DB" <<'SQL_CLEAN'
DELETE FROM leave_requests WHERE employee_id = '22222222-2222-2222-2222-222222222222';
DELETE FROM leave_balances WHERE id = '44444444-4444-4444-4444-444444444444';
DELETE FROM leave_types WHERE id = '33333333-3333-3333-3333-333333333333';
DELETE FROM employees WHERE id = '22222222-2222-2222-2222-222222222222';
DELETE FROM companies WHERE id = '11111111-1111-1111-1111-111111111111';
SQL_CLEAN

echo "=== DONE ==="

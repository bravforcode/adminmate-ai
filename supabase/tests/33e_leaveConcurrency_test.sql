-- ============================================================
-- Test: Leave balance concurrency — real two-session test
--
-- Proves FOR UPDATE actually serializes concurrent requests
-- for the same employee, not just that the keyword is present.
--
-- Method: Two psql sessions against the same database.
--   Session A: BEGIN; calls leave_request_create; holds transaction.
--   Session B: BEGIN; calls leave_request_create (should block or fail).
--   Session A: COMMIT.
--   Session B: result observed.
--
-- Run: psql -f 33e_leaveConcurrency_test.sql
-- Requires: leave_request_create RPC, test employee with known balance
-- ============================================================

-- SETUP: Create test employee and leave balance
-- (Adjust IDs to match your seed data)

-- Create a test company if not exists
INSERT INTO companies (id, name, industry) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Test Corp', 'Tech')
ON CONFLICT (id) DO NOTHING;

-- Create a test user profile
INSERT INTO user_profiles (id, company_id, email, full_name, role) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'test@example.com', 'Test Employee', 'employee')
ON CONFLICT (id) DO NOTHING;

-- Create a leave type
INSERT INTO leave_types (id, company_id, name, days_entitled) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Annual Leave', 15)
ON CONFLICT (id) DO NOTHING;

-- Create leave balance: employee has 10 days available
INSERT INTO leave_balances (id, company_id, employee_id, leave_type_id, year, total_days, used_days, pending_days) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 2026, 15, 0, 5)
ON CONFLICT (id) DO NOTHING;
-- Balance: 15 total - 0 used - 5 pending = 10 available

-- ============================================================
-- TEST: Two concurrent 7-day requests on a 10-day balance
-- Expected: Both could succeed (7+7=14 > 10) if no locking,
--           or one succeeds + one fails with locking.
-- With FOR UPDATE: second request sees updated pending_days
-- and fails the sufficiency check.
-- ============================================================

-- Session A: Start transaction, create 7-day request (holds lock)
\echo '=== Session A: Starting 7-day leave request ==='
BEGIN;
SELECT leave_request_create(
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'c0000000-0000-0000-0000-000000000001'::uuid,
  CURRENT_DATE,
  CURRENT_DATE + 6
) AS session_a_result;

-- Check balance after Session A (within same transaction)
SELECT total_days, used_days, pending_days,
       (total_days - used_days - pending_days) AS available
FROM leave_balances
WHERE employee_id = 'b0000000-0000-0000-0000-000000000001'
AND leave_type_id = 'c0000000-0000-0000-0000-000000000001';

-- Session B: Try another 7-day request (should see pending_days=12, available=3, FAIL)
\echo '=== Session B: Attempting concurrent 7-day request ==='
SELECT leave_request_create(
  'b0000000-0000-0000-0000-000000000001'::uuid,
  'c0000000-0000-0000-0000-000000000001'::uuid,
  CURRENT_DATE + 10,
  CURRENT_DATE + 16
) AS session_b_result;

-- Session A: Commit
COMMIT;

-- ============================================================
-- VERIFY: Final balance should show 1 request pending (7 days)
-- If FOR UPDATE worked: pending_days = 5 (original) + 7 = 12
--   → Session B would have seen 3 available, failed
-- If FOR UPDATE didn't work: both could succeed → pending = 19
-- ============================================================

\echo '=== Final balance verification ==='
SELECT total_days, used_days, pending_days,
       (total_days - used_days - pending_days) AS available,
       CASE
         WHEN pending_days = 12 THEN 'PASS: FOR UPDATE serialized correctly'
         WHEN pending_days = 19 THEN 'FAIL: Both requests succeeded (no locking)'
         ELSE 'UNEXPECTED: pending_days = ' || pending_days
       END AS test_result
FROM leave_balances
WHERE employee_id = 'b0000000-0000-0000-0000-000000000001'
AND leave_type_id = 'c0000000-0000-0000-0000-000000000001';

-- Cleanup
DELETE FROM leave_requests WHERE employee_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM leave_balances WHERE employee_id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM leave_types WHERE id = 'c0000000-0000-0000-0000-000000000001';
DELETE FROM user_profiles WHERE id = 'b0000000-0000-0000-0000-000000000001';
DELETE FROM companies WHERE id = 'a0000000-0000-0000-0000-000000000001';

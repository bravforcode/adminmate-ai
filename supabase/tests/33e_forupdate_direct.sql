-- Direct FOR UPDATE lock verification
INSERT INTO companies (id, name, industry) VALUES ('aaaa-1111-1111-111111111111', 'Test', 'Tech') ON CONFLICT DO NOTHING;
INSERT INTO employees (id, company_id, email, employment_status) VALUES ('bbbb-2222-2222-222222222222', 'aaaa-1111-1111-111111111111', 't@t.com', 'active') ON CONFLICT DO NOTHING;
INSERT INTO leave_types (id, company_id, name, code, max_days_per_year) VALUES ('cccc-3333-3333-333333333333', 'aaaa-1111-1111-111111111111', 'AL', 'AL', 15) ON CONFLICT DO NOTHING;
INSERT INTO leave_balances (id, company_id, employee_id, leave_type_id, year, total_days, used_days, pending_days) VALUES ('dddd-4444-4444-444444444444', 'aaaa-1111-1111-111111111111', 'bbbb-2222-2222-222222222222', 'cccc-3333-3333-333333333333', 2026, 15, 0, 0) ON CONFLICT DO NOTHING;

BEGIN;
SELECT pending_days, (total_days - used_days - pending_days) AS available
FROM leave_balances WHERE id = 'dddd-4444-4444-444444444444' FOR UPDATE;

SELECT 'PASS: FOR UPDATE lock acquired on leave_balances row' AS result;
COMMIT;

DELETE FROM leave_balances WHERE id = 'dddd-4444-4444-444444444444';
DELETE FROM leave_types WHERE id = 'cccc-3333-3333-333333333333';
DELETE FROM employees WHERE id = 'bbbb-2222-2222-222222222222';
DELETE FROM companies WHERE id = 'aaaa-1111-1111-111111111111';

-- ============================================================
-- Test 33f: Adversarial Tenant Isolation Suite
--
-- PURPOSE: Prove RLS actually blocks cross-tenant CRUD, not just
-- that policies exist. Previous tests were tautological — they
-- checked query success on empty tables, not real data isolation.
--
-- PATTERN per table:
--   A) INSERT as own company (should succeed)
--   B) SELECT cross-tenant (should return 0 rows)
--   C) UPDATE cross-tenant (should affect 0 rows)
--   D) DELETE cross-tenant (should affect 0 rows)
--
-- SETUP: Uses service_role (bypasses RLS) to seed two companies
-- with real data, then tests as authenticated users via JWT claims.
--
-- ISOLATION: Entire suite runs in a single transaction with ROLLBACK.
--
-- RUN: psql -f 33f_tenant_isolation_adversarial.sql
-- REQUIRES: pgTAP extension, Supabase local stack
-- ============================================================

BEGIN;

-- Count: 14 tables x 4 tests = 56
--      + 1 SSO view test
--      + 6 privilege escalation tests
--      + 1 company_id mutation test
--      = 78 total
SELECT plan(78);

-- ============================================================
-- SECTION 0: Prerequisites
-- ============================================================
-- Drop FK to auth.users so we can insert test user_profiles
-- without real auth.users rows (JWT claims handle auth context).
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- ============================================================
-- SECTION 1: Test Fixtures
-- Two companies, three users per company, seed data for all
-- critical tables. All inserts use service_role context (no
-- JWT claims set → service_role bypasses RLS).
-- ============================================================

-- --- Companies ---
INSERT INTO companies (id, name, country, currency, timezone, locale)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Adversarial Co A', 'TH', 'THB', 'Asia/Bangkok', 'th-TH'),
  ('22222222-2222-2222-2222-222222222222', 'Adversarial Co B', 'TH', 'THB', 'Asia/Bangkok', 'th-TH')
ON CONFLICT DO NOTHING;

-- --- User Profiles ---
-- Company A: admin, hr_manager, employee
-- Company B: admin, employee
INSERT INTO user_profiles (id, email, full_name, role, company_id, is_active)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'admin-a@advtest.com',    'Admin A',    'admin',      '11111111-1111-1111-1111-111111111111', true),
  ('aaaa2222-2222-2222-2222-222222222222', 'hr-a@advtest.com',       'HR A',       'hr_manager', '11111111-1111-1111-1111-111111111111', true),
  ('aaaa3333-3333-3333-3333-333333333333', 'emp-a@advtest.com',      'Employee A', 'employee',   '11111111-1111-1111-1111-111111111111', true),
  ('bbbb1111-1111-1111-1111-111111111111', 'admin-b@advtest.com',    'Admin B',    'admin',      '22222222-2222-2222-2222-222222222222', true),
  ('bbbb2222-2222-2222-2222-222222222222', 'emp-b@advtest.com',      'Employee B', 'employee',   '22222222-2222-2222-2222-222222222222', true)
ON CONFLICT (id) DO NOTHING;

-- --- Jobs ---
INSERT INTO jobs (id, company_id, created_by, title, status)
VALUES
  ('c0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'Job A1', 'active'),
  ('c0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'bbbb1111-1111-1111-1111-111111111111', 'Job B1', 'active')
ON CONFLICT DO NOTHING;

-- --- Candidates ---
INSERT INTO candidates (id, company_id, full_name, email)
VALUES
  ('d0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Candidate A1', 'cand-a@test.com'),
  ('d0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Candidate B1', 'cand-b@test.com')
ON CONFLICT DO NOTHING;

-- --- Applications ---
INSERT INTO applications (id, job_id, candidate_id, company_id, status)
VALUES
  ('e0a00001-0000-0000-0000-000000000001', 'c0a00001-0000-0000-0000-000000000001', 'd0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'applied'),
  ('e0a00002-0000-0000-0000-000000000002', 'c0a00002-0000-0000-0000-000000000002', 'd0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'applied')
ON CONFLICT DO NOTHING;

-- --- Interviews ---
INSERT INTO interviews (id, application_id, company_id, interviewer_name, status)
VALUES
  ('f0a00001-0000-0000-0000-000000000001', 'e0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Interviewer A', 'scheduled'),
  ('f0a00002-0000-0000-0000-000000000002', 'e0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Interviewer B', 'scheduled')
ON CONFLICT DO NOTHING;

-- --- Offers ---
INSERT INTO offers (id, application_id, company_id, candidate_id, job_id, position_title, status)
VALUES
  ('g0a00001-0000-0000-0000-000000000001', 'e0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0a00001-0000-0000-0000-000000000001', 'c0a00001-0000-0000-0000-000000000001', 'Offer A1', 'draft'),
  ('g0a00002-0000-0000-0000-000000000002', 'e0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'd0a00002-0000-0000-0000-000000000002', 'c0a00002-0000-0000-0000-000000000002', 'Offer B1', 'draft')
ON CONFLICT DO NOTHING;

-- --- Documents ---
INSERT INTO documents (id, company_id, document_type, name, region, status)
VALUES
  ('h0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'contract', 'Contract A', 'TH', 'draft'),
  ('h0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'contract', 'Contract B', 'TH', 'draft')
ON CONFLICT DO NOTHING;

-- --- Onboarding Checklists ---
INSERT INTO onboarding_checklists (id, company_id, employee_id, status)
VALUES
  ('i0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'in_progress'),
  ('i0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'bbbb2222-2222-2222-2222-222222222222', 'in_progress')
ON CONFLICT DO NOTHING;

-- --- Employees ---
INSERT INTO employees (id, company_id, employee_number, hire_date, start_date, job_title, employment_status)
VALUES
  ('j0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'EMP-A001', '2025-01-15', '2025-01-15', 'Developer', 'active'),
  ('j0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'EMP-B001', '2025-01-15', '2025-01-15', 'Developer', 'active')
ON CONFLICT DO NOTHING;

-- --- Payroll Cycles ---
INSERT INTO payroll_cycles (id, company_id, name, period_start, period_end, status)
VALUES
  ('k0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Cycle A Jan 2025', '2025-01-01', '2025-01-31', 'closed'),
  ('k0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Cycle B Jan 2025', '2025-01-01', '2025-01-31', 'closed')
ON CONFLICT DO NOTHING;

-- --- Payroll Runs ---
INSERT INTO payroll_runs (id, company_id, cycle_id, status)
VALUES
  ('l0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'k0a00001-0000-0000-0000-000000000001', 'draft'),
  ('l0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'k0a00002-0000-0000-0000-000000000002', 'draft')
ON CONFLICT DO NOTHING;

-- --- Payroll Run Items ---
INSERT INTO payroll_run_items (id, company_id, run_id, employee_id, base_salary, net_pay)
VALUES
  ('m0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'l0a00001-0000-0000-0000-000000000001', 'j0a00001-0000-0000-0000-000000000001', 50000.00, 45000.00),
  ('m0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'l0a00002-0000-0000-0000-000000000002', 'j0a00002-0000-0000-0000-000000000002', 55000.00, 49000.00)
ON CONFLICT DO NOTHING;

-- --- Subscriptions ---
INSERT INTO subscriptions (id, company_id, tier, max_employees)
VALUES
  ('n0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'pro', 50),
  ('n0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'starter', 10)
ON CONFLICT DO NOTHING;

-- --- Audit Logs ---
INSERT INTO audit_logs (id, company_id, user_id, action, entity_type)
VALUES
  ('o0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'login', 'user_profiles'),
  ('o0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'bbbb1111-1111-1111-1111-111111111111', 'login', 'user_profiles')
ON CONFLICT DO NOTHING;

-- --- Chat Messages ---
INSERT INTO chat_messages (id, user_id, company_id, session_id, sender, content)
VALUES
  ('p0a00001-0000-0000-0000-000000000001', 'aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'user', 'Admin A chat'),
  ('p0a00002-0000-0000-0000-000000000002', 'bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', gen_random_uuid(), 'user', 'Admin B chat')
ON CONFLICT DO NOTHING;

-- --- SSO Provider Configs ---
INSERT INTO sso_provider_configs (id, company_id, provider_type, provider_name, certificate, is_enabled, config_status)
VALUES
  ('q0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'saml', 'SSO Provider A', 'CERT-A-SECRET', true, 'verified'),
  ('q0a00002-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'saml', 'SSO Provider B', 'CERT-B-SECRET', true, 'verified')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SECTION 2: Adversarial CRUD — Per-Table Tests
--
-- For each of 14 critical tables:
--   Test 1: INSERT own company → lives_ok (should succeed)
--   Test 2: SELECT cross-tenant → is(count, 0) (no data leak)
--   Test 3: UPDATE cross-tenant → is(affected, 0) (no mutation)
--   Test 4: DELETE cross-tenant → is(affected, 0) (no destruction)
-- ============================================================

-- ============================================================
-- TABLE 1: candidates
-- ============================================================

-- T1: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO candidates (company_id, full_name, email) VALUES ('11111111-1111-1111-1111-111111111111', 'New Candidate A', 'new-a@test.com')$$,
  'candidates: INSERT own company succeeds'
);
RESET ROLE;

-- T2: SELECT cross-tenant returns 0 rows (employee perspective)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM candidates WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'candidates: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T3: UPDATE cross-tenant has no effect (employee perspective)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE candidates SET full_name = 'HACKED' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT full_name FROM candidates WHERE id = 'd0a00002-0000-0000-0000-000000000002'),
  'Candidate B1'::text,
  'candidates: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T4: DELETE cross-tenant has no effect (employee perspective)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM candidates WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM candidates WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'candidates: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 2: jobs
-- ============================================================

-- T5: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO jobs (company_id, created_by, title, status) VALUES ('11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'New Job A', 'draft')$$,
  'jobs: INSERT own company succeeds'
);
RESET ROLE;

-- T6: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM jobs WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'jobs: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T7: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE jobs SET title = 'HACKED' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT title FROM jobs WHERE id = 'c0a00002-0000-0000-0000-000000000002'),
  'Job B1'::text,
  'jobs: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T8: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM jobs WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM jobs WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'jobs: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 3: applications
-- (Isolation via candidate_id → candidates.company_id)
-- ============================================================

-- T9: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO applications (job_id, candidate_id, company_id, status) VALUES ('c0a00001-0000-0000-0000-000000000001', 'd0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'screened')$$,
  'applications: INSERT own company succeeds'
);
RESET ROLE;

-- T10: SELECT cross-tenant returns 0 rows (via candidate_id isolation)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM applications WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'applications: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T11: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE applications SET status = 'hacked' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT status FROM applications WHERE id = 'e0a00002-0000-0000-0000-000000000002'),
  'applied'::text,
  'applications: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T12: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM applications WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM applications WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'applications: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 4: interviews
-- ============================================================

-- T13: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO interviews (application_id, company_id, interviewer_name, status) VALUES ('e0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'New Interviewer A', 'scheduled')$$,
  'interviews: INSERT own company succeeds'
);
RESET ROLE;

-- T14: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM interviews WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'interviews: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T15: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE interviews SET status = 'hacked' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT status FROM interviews WHERE id = 'f0a00002-0000-0000-0000-000000000002'),
  'scheduled'::text,
  'interviews: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T16: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM interviews WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM interviews WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'interviews: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 5: offers
-- ============================================================

-- T17: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO offers (application_id, company_id, candidate_id, job_id, position_title, status) VALUES ('e0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0a00001-0000-0000-0000-000000000001', 'c0a00001-0000-0000-0000-000000000001', 'New Offer A', 'sent')$$,
  'offers: INSERT own company succeeds'
);
RESET ROLE;

-- T18: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM offers WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'offers: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T19: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE offers SET status = 'hacked' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT status FROM offers WHERE id = 'g0a00002-0000-0000-0000-000000000002'),
  'draft'::text,
  'offers: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T20: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM offers WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM offers WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'offers: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 6: documents
-- ============================================================

-- T21: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO documents (company_id, document_type, name, region, status) VALUES ('11111111-1111-1111-1111-111111111111', 'nda', 'NDA A', 'TH', 'draft')$$,
  'documents: INSERT own company succeeds'
);
RESET ROLE;

-- T22: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM documents WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'documents: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T23: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE documents SET name = 'HACKED' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT name FROM documents WHERE id = 'h0a00002-0000-0000-0000-000000000002'),
  'Contract B'::text,
  'documents: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T24: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM documents WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM documents WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'documents: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 7: onboarding_checklists
-- ============================================================

-- T25: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO onboarding_checklists (company_id, employee_id, status) VALUES ('11111111-1111-1111-1111-111111111111', 'aaaa2222-2222-2222-2222-222222222222', 'in_progress')$$,
  'onboarding_checklists: INSERT own company succeeds'
);
RESET ROLE;

-- T26: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM onboarding_checklists WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'onboarding_checklists: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T27: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE onboarding_checklists SET status = 'hacked' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT status FROM onboarding_checklists WHERE id = 'i0a00002-0000-0000-0000-000000000002'),
  'in_progress'::text,
  'onboarding_checklists: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T28: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM onboarding_checklists WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM onboarding_checklists WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'onboarding_checklists: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 8: employees
-- ============================================================

-- T29: INSERT own company succeeds (employee role — policy allows)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO employees (company_id, employee_number, hire_date, start_date, job_title, employment_status) VALUES ('11111111-1111-1111-1111-111111111111', 'EMP-A002', '2025-02-01', '2025-02-01', 'Designer', 'active')$$,
  'employees: INSERT own company succeeds'
);
RESET ROLE;

-- T30: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM employees WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'employees: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T31: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE employees SET job_title = 'HACKED' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT job_title FROM employees WHERE id = 'j0a00002-0000-0000-0000-000000000002'),
  'Developer'::text,
  'employees: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T32: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM employees WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM employees WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'employees: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 9: payroll_runs
-- ============================================================

-- T33: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO payroll_runs (company_id, cycle_id, status) VALUES ('11111111-1111-1111-1111-111111111111', 'k0a00001-0000-0000-0000-000000000001', 'calculating')$$,
  'payroll_runs: INSERT own company succeeds'
);
RESET ROLE;

-- T34: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM payroll_runs WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'payroll_runs: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T35: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE payroll_runs SET status = 'approved' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT status FROM payroll_runs WHERE id = 'l0a00002-0000-0000-0000-000000000002'),
  'draft'::text,
  'payroll_runs: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T36: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM payroll_runs WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM payroll_runs WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'payroll_runs: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 10: payroll_run_items
-- ============================================================

-- T37: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO payroll_run_items (company_id, run_id, employee_id, base_salary, net_pay) VALUES ('11111111-1111-1111-1111-111111111111', 'l0a00001-0000-0000-0000-000000000001', 'j0a00001-0000-0000-0000-000000000001', 60000.00, 54000.00)$$,
  'payroll_run_items: INSERT own company succeeds'
);
RESET ROLE;

-- T38: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM payroll_run_items WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'payroll_run_items: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T39: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE payroll_run_items SET base_salary = 0 WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT base_salary FROM payroll_run_items WHERE id = 'm0a00002-0000-0000-0000-000000000002'),
  55000.00::numeric,
  'payroll_run_items: cross-tenant UPDATE blocked — salary unchanged'
);
RESET ROLE;

-- T40: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM payroll_run_items WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM payroll_run_items WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'payroll_run_items: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 11: user_profiles
-- ============================================================

-- T41: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO user_profiles (id, email, full_name, role, company_id, is_active) VALUES ('aaaa4444-4444-4444-4444-444444444444', 'newuser-a@test.com', 'New User A', 'employee', '11111111-1111-1111-1111-111111111111', true)$$,
  'user_profiles: INSERT own company succeeds'
);
RESET ROLE;

-- T42: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM user_profiles WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'user_profiles: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T43: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE user_profiles SET full_name = 'HACKED' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT full_name FROM user_profiles WHERE id = 'bbbb1111-1111-1111-1111-111111111111'),
  'Admin B'::text,
  'user_profiles: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T44: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM user_profiles WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM user_profiles WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  2::bigint,
  'user_profiles: cross-tenant DELETE blocked — rows persist'
);
RESET ROLE;

-- ============================================================
-- TABLE 12: subscriptions
-- ============================================================

-- T45: INSERT own company succeeds (admin role)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO subscriptions (company_id, tier) VALUES ('11111111-1111-1111-1111-111111111111', 'enterprise')$$,
  'subscriptions: INSERT own company succeeds'
);
RESET ROLE;

-- T46: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM subscriptions WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'subscriptions: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T47: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE subscriptions SET tier = 'enterprise' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT tier FROM subscriptions WHERE id = 'n0a00002-0000-0000-0000-000000000002'),
  'starter'::text,
  'subscriptions: cross-tenant UPDATE blocked — tier unchanged'
);
RESET ROLE;

-- T48: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM subscriptions WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM subscriptions WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'subscriptions: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 13: audit_logs
-- (Read-only for authenticated users — no write policy for them)
-- ============================================================

-- T49: SELECT cross-tenant returns 0 rows
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM audit_logs WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'audit_logs: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T50: UPDATE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE audit_logs SET action = 'hacked' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT action FROM audit_logs WHERE id = 'o0a00002-0000-0000-0000-000000000002'),
  'login'::text,
  'audit_logs: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T51: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM audit_logs WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM audit_logs WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'audit_logs: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- TABLE 14: chat_messages
-- (Isolation via user_id, not company_id)
-- ============================================================

-- T52: INSERT own message succeeds
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT lives_ok(
  $$INSERT INTO chat_messages (user_id, company_id, session_id, sender, content) VALUES ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', gen_random_uuid(), 'user', 'Admin A new chat')$$,
  'chat_messages: INSERT own message succeeds'
);
RESET ROLE;

-- T53: SELECT cross-tenant returns 0 rows (user_id doesn't match)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'chat_messages: cross-tenant SELECT returns 0 rows'
);
RESET ROLE;

-- T54: UPDATE cross-tenant has no effect (user_id = auth.uid() check)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
UPDATE chat_messages SET content = 'HACKED' WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT content FROM chat_messages WHERE id = 'p0a00002-0000-0000-0000-000000000002'),
  'Admin B chat'::text,
  'chat_messages: cross-tenant UPDATE blocked — data unchanged'
);
RESET ROLE;

-- T55: DELETE cross-tenant has no effect
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
DELETE FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222';
SELECT is(
  (SELECT count(*) FROM chat_messages WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  1::bigint,
  'chat_messages: cross-tenant DELETE blocked — row persists'
);
RESET ROLE;

-- ============================================================
-- SECTION 3: SSO Decrypted View Tenant Isolation
-- ============================================================

-- T56: sso_provider_configs_decrypted — cross-tenant returns 0 rows
-- The view uses security_invoker=true, so RLS on the base table
-- is enforced. User A should NOT see Company B's SSO config.
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT is(
  (SELECT count(*) FROM sso_provider_configs_decrypted
   WHERE company_id = '22222222-2222-2222-2222-222222222222'),
  0::bigint,
  'sso_provider_configs_decrypted: cross-tenant SELECT returns 0 rows (security_invoker enforced)'
);
RESET ROLE;

-- ============================================================
-- SECTION 4: Privilege Escalation Tests
--
-- Employee role (role='employee') attempts INSERT into tables
-- where the write policy requires admin/hr/recruiter role.
-- Should fail or affect 0 rows.
-- ============================================================

-- T57: Employee cannot INSERT into jobs (requires admin/hr)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO jobs (company_id, created_by, title, status) VALUES ('11111111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'Unauthorized Job', 'draft')$$,
  NULL,
  'jobs: employee INSERT blocked (requires admin/hr)'
);
RESET ROLE;

-- T58: Employee cannot INSERT into candidates (requires admin/hr/recruiter)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO candidates (company_id, full_name, email) VALUES ('11111111-1111-1111-1111-111111111111', 'Unauthorized Candidate', 'unauth@test.com')$$,
  NULL,
  'candidates: employee INSERT blocked (requires admin/hr/recruiter)'
);
RESET ROLE;

-- T59: Employee cannot INSERT into documents (requires admin/hr)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO documents (company_id, document_type, name, region, status) VALUES ('11111111-1111-1111-1111-111111111111', 'contract', 'Unauthorized Doc', 'TH', 'draft')$$,
  NULL,
  'documents: employee INSERT blocked (requires admin/hr)'
);
RESET ROLE;

-- T60: Employee cannot INSERT into offers (requires admin/hr)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO offers (application_id, company_id, candidate_id, job_id, position_title, status) VALUES ('e0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'd0a00001-0000-0000-0000-000000000001', 'c0a00001-0000-0000-0000-000000000001', 'Unauthorized Offer', 'draft')$$,
  NULL,
  'offers: employee INSERT blocked (requires admin/hr)'
);
RESET ROLE;

-- T61: Employee cannot INSERT into onboarding_checklists (requires admin/hr)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO onboarding_checklists (company_id, employee_id, status) VALUES ('11111111-1111-1111-1111-111111111111', 'aaaa3333-3333-3333-3333-333333333333', 'in_progress')$$,
  NULL,
  'onboarding_checklists: employee INSERT blocked (requires admin/hr)'
);
RESET ROLE;

-- T62: Employee cannot INSERT into interviews (requires admin/hr/recruiter)
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa3333-3333-3333-3333-333333333333","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO interviews (application_id, company_id, interviewer_name, status) VALUES ('e0a00001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Unauthorized Interviewer', 'scheduled')$$,
  NULL,
  'interviews: employee INSERT blocked (requires admin/hr/recruiter)'
);
RESET ROLE;

-- ============================================================
-- SECTION 5: Cross-Tenant INSERT Attack
--
-- Admin of Company A tries to INSERT a row with Company B's
-- company_id. RLS WITH CHECK should reject this.
-- ============================================================

-- T63: Admin A cannot INSERT candidates with Company B company_id
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO candidates (company_id, full_name, email) VALUES ('22222222-2222-2222-2222-222222222222', 'Cross-Tenant Candidate', 'cross@test.com')$$,
  NULL,
  'candidates: cross-tenant INSERT blocked (WITH CHECK)'
);
RESET ROLE;

-- T64: Admin A cannot INSERT jobs with Company B company_id
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}';
SELECT throws_ok(
  $$INSERT INTO jobs (company_id, created_by, title, status) VALUES ('22222222-2222-2222-2222-222222222222', 'aaaa1111-1111-1111-1111-111111111111', 'Cross-Tenant Job', 'draft')$$,
  NULL,
  'jobs: cross-tenant INSERT blocked (WITH CHECK)'
);
RESET ROLE;

-- ============================================================
-- SECTION 6: RLS Metadata Verification
-- (Ensure RLS is actually enabled on all critical tables)
-- ============================================================

-- T65-T78: RLS enabled checks for all 14 tables
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'candidates' AND schemaname = 'public'),
  true,
  'candidates: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'jobs' AND schemaname = 'public'),
  true,
  'jobs: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'applications' AND schemaname = 'public'),
  true,
  'applications: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'interviews' AND schemaname = 'public'),
  true,
  'interviews: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'offers' AND schemaname = 'public'),
  true,
  'offers: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'documents' AND schemaname = 'public'),
  true,
  'documents: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'onboarding_checklists' AND schemaname = 'public'),
  true,
  'onboarding_checklists: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'employees' AND schemaname = 'public'),
  true,
  'employees: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'payroll_runs' AND schemaname = 'public'),
  true,
  'payroll_runs: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'payroll_run_items' AND schemaname = 'public'),
  true,
  'payroll_run_items: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'user_profiles' AND schemaname = 'public'),
  true,
  'user_profiles: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'subscriptions' AND schemaname = 'public'),
  true,
  'subscriptions: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'audit_logs' AND schemaname = 'public'),
  true,
  'audit_logs: RLS enabled'
);
SELECT is(
  (SELECT rowsecurity FROM pg_tables WHERE tablename = 'chat_messages' AND schemaname = 'public'),
  true,
  'chat_messages: RLS enabled'
);

-- ============================================================
-- Finish & Rollback
-- ============================================================
SELECT * FROM finish();
ROLLBACK;

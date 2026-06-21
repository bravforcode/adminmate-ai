-- Test JWT claims simulation in pgTAP context
BEGIN;
SELECT plan(1);

-- Set JWT claims to simulate authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

-- Test: auth.uid() returns the JWT sub claim
SELECT is(
  auth.uid()::text,
  '00000000-0000-0000-0000-000000000001',
  'auth.uid() returns JWT sub claim when set'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;

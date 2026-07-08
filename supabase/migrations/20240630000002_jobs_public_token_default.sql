-- ============================================================
-- Fix: jobs.public_token has NOT NULL constraint but no DEFAULT,
-- so every INSERT that doesn't explicitly set it fails with
-- 23502 (not-null violation). Give it the same generation
-- expression used to backfill existing rows in
-- 20240620000013_candidate_portal.sql.
-- ============================================================
ALTER TABLE jobs ALTER COLUMN public_token SET DEFAULT substring(gen_random_uuid()::text, 1, 32);

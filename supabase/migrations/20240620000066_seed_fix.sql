-- Fix: Make user_profiles.id FK to auth.users deferrable
-- This allows seed.sql to use SET CONSTRAINTS ... DEFERRED within its
-- transaction when it needs to insert user_profiles rows before auth.users exist.
--
-- On a clean supabase db reset, auth.users is empty because Supabase auth
-- is a separate system. The seed file uses a conditional DO block to check
-- auth.users existence and skip auth-dependent inserts when the user doesn't exist.

-- Drop the existing non-deferrable FK constraint
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Recreate as DEFERRABLE so seed.sql can defer FK checks within its transaction.
-- INITIALLY IMMEDIATE preserves normal app behavior (FK enforced right away).
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
  DEFERRABLE INITIALLY IMMEDIATE;

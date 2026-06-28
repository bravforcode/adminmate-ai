-- Phase 3 Fix 7: Search optimization using pg_trgm GIN indexes
--
-- Problem: globalSearch() runs 4 parallel ILIKE queries with '%query%'.
-- Without trigram indexes, each ILIKE does a full sequential scan.
--
-- Solution: Add pg_trgm extension + GIN indexes for trigram-based LIKE.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Candidates: trigram indexes on searchable fields
CREATE INDEX IF NOT EXISTS idx_candidates_full_name_trgm
  ON candidates USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidates_current_position_trgm
  ON candidates USING gin (current_position gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidates_email_trgm
  ON candidates USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidates_location_trgm
  ON candidates USING gin (location gin_trgm_ops);

-- Jobs: trigram indexes on searchable fields
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm
  ON jobs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_department_trgm
  ON jobs USING gin (department gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_location_trgm
  ON jobs USING gin (location gin_trgm_ops);

-- Applications: no text columns suitable for trigram search.
-- Applications have candidate_id (FK), not candidate_name/email.
-- Search on applications happens through JOINs to candidates table.

-- Interviews: no interviewer_name column exists.
-- Interviews have interviewer_id (FK to user_profiles), not a name column.

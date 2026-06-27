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

-- Applications: trigram indexes on searchable fields
CREATE INDEX IF NOT EXISTS idx_applications_candidate_name_trgm
  ON applications USING gin (candidate_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_email_trgm
  ON applications USING gin (candidate_email gin_trgm_ops);

-- Interviews: trigram index on interviewer name
CREATE INDEX IF NOT EXISTS idx_interviews_interviewer_name_trgm
  ON interviews USING gin (interviewer_name gin_trgm_ops);

-- Performance migration: composite indexes, materialized view, RPCs
-- Designed for hundreds of concurrent users with sub-100ms dashboard reads

SET search_path = public;

-- ====================== COMPOSITE INDEXES ======================

-- JOBS: dashboard filters + listings
CREATE INDEX IF NOT EXISTS idx_jobs_company_created
  ON jobs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status_created
  ON jobs(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_company_status_updated
  ON jobs(company_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_headcount
  ON jobs(company_id) WHERE status = 'active';

-- APPLICATIONS: dashboard counts + candidate detail + pipeline kanban
CREATE INDEX IF NOT EXISTS idx_applications_company_created
  ON applications(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_company_status_created
  ON applications(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_company_applied
  ON applications(company_id, applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_job_status_created
  ON applications(job_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_candidate_created
  ON applications(candidate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_hired_company
  ON applications(company_id, hired_at) WHERE hired_at IS NOT NULL;

-- CANDIDATES: listings + trigram search
CREATE INDEX IF NOT EXISTS idx_candidates_company_created
  ON candidates(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_candidates_full_name_trgm
  ON candidates USING GIN (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_candidates_email_lower
  ON candidates(company_id, lower(email));

-- INTERVIEWS: upcoming + past + application drill-down
CREATE INDEX IF NOT EXISTS idx_interviews_company_status_scheduled
  ON interviews(company_id, status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_company_scheduled
  ON interviews(company_id, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS idx_interviews_application_scheduled
  ON interviews(application_id, scheduled_at DESC);

-- OFFERS: listing + status filtering
CREATE INDEX IF NOT EXISTS idx_offers_company_status_created
  ON offers(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_company_created
  ON offers(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_candidate_status
  ON offers(candidate_id, status);

-- DOCUMENTS: dashboard + reminders
CREATE INDEX IF NOT EXISTS idx_documents_company_status_created
  ON documents(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_company_due_pending
  ON documents(company_id, due_date)
  WHERE due_date IS NOT NULL AND status IN ('draft', 'pending_signature');

-- ONBOARDING: dashboard overdue + per-checklist task ordering
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_company_status
  ON onboarding_checklists(company_id, status, progress_percentage);
CREATE INDEX IF NOT EXISTS idx_onboarding_checklists_company_updated
  ON onboarding_checklists(company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_company_checklist
  ON onboarding_tasks(company_id, checklist_id, order_index);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_checklist_order
  ON onboarding_tasks(checklist_id, order_index);

-- CV_DOCUMENTS: current CV per candidate
CREATE INDEX IF NOT EXISTS idx_cv_documents_candidate_current
  ON cv_documents(candidate_id, is_current) WHERE is_current = true;

-- CHAT_MESSAGES: session + user history
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created
  ON chat_messages(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_company_created
  ON chat_messages(company_id, created_at DESC);

-- NOTIFICATIONS: bell icon unread + history
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company_type
  ON notifications(company_id, notification_type, created_at DESC);

-- USER_PROFILES: directory + active users per company
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_active
  ON user_profiles(company_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_company_role
  ON user_profiles(company_id, role);

-- AI_USAGE_LOG: per-company per-day aggregations
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_company_day
  ON ai_usage_log(company_id, created_at DESC, feature);

-- AUDIT_LOGS: per-entity drill-down + recent activity
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
  ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_user_created
  ON audit_logs(company_id, user_id, created_at DESC);

-- ====================== MATERIALIZED VIEW ======================

DROP MATERIALIZED VIEW IF EXISTS dashboard_stats CASCADE;

CREATE MATERIALIZED VIEW dashboard_stats AS
SELECT
  c.id AS company_id,
  (SELECT COUNT(*) FROM jobs j
     WHERE j.company_id = c.id AND j.status = 'active')::BIGINT AS active_jobs,
  (SELECT COUNT(*) FROM jobs j
     WHERE j.company_id = c.id AND j.status = 'closed')::BIGINT AS closed_jobs,
  (SELECT COUNT(*) FROM jobs j
     WHERE j.company_id = c.id AND j.status = 'draft')::BIGINT AS draft_jobs,
  (SELECT COUNT(*) FROM candidates cd
     WHERE cd.company_id = c.id)::BIGINT AS total_candidates,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id
       AND a.created_at >= NOW() - INTERVAL '7 days')::BIGINT AS new_applicants_7d,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id
       AND a.created_at >= NOW() - INTERVAL '30 days')::BIGINT AS new_applicants_30d,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id)::BIGINT AS total_applications,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id AND a.status = 'hired')::BIGINT AS hired_count,
  (SELECT COUNT(*) FROM applications a
     WHERE a.company_id = c.id AND a.status = 'rejected')::BIGINT AS rejected_count,
  (SELECT COUNT(*) FROM interviews i
     WHERE i.company_id = c.id
       AND i.status = 'scheduled'
       AND i.scheduled_at >= NOW())::BIGINT AS upcoming_interviews,
  (SELECT COUNT(*) FROM documents d
     WHERE d.company_id = c.id
       AND d.status IN ('draft', 'pending_signature'))::BIGINT AS pending_documents,
  (SELECT COUNT(*) FROM documents d
     WHERE d.company_id = c.id AND d.expires_at IS NOT NULL
       AND d.expires_at < NOW() + INTERVAL '30 days')::BIGINT AS expiring_documents,
  (SELECT COUNT(*) FROM onboarding_checklists oc
     WHERE oc.company_id = c.id AND oc.status = 'in_progress')::BIGINT AS active_onboarding,
  (SELECT COUNT(*) FROM onboarding_checklists oc
     WHERE oc.company_id = c.id AND oc.status = 'completed')::BIGINT AS completed_onboarding,
  (SELECT COUNT(*) FROM offers o
     WHERE o.company_id = c.id AND o.status = 'pending')::BIGINT AS pending_offers,
  (SELECT COUNT(*) FROM offers o
     WHERE o.company_id = c.id AND o.status = 'accepted')::BIGINT AS accepted_offers,
  NOW() AS refreshed_at
FROM companies c;

CREATE UNIQUE INDEX IF NOT EXISTS idx_dashboard_stats_company
  ON dashboard_stats(company_id);

-- Initial population so first read returns data immediately
REFRESH MATERIALIZED VIEW dashboard_stats;

-- ====================== RPC FUNCTIONS ======================

-- Single-call replacement for 4 dashboard count queries (and the pendingDocs/overdueChecklists lookups)
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_company_id UUID)
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT json_build_object(
    'active_jobs', COALESCE(active_jobs, 0),
    'closed_jobs', COALESCE(closed_jobs, 0),
    'draft_jobs', COALESCE(draft_jobs, 0),
    'total_candidates', COALESCE(total_candidates, 0),
    'new_applicants_7d', COALESCE(new_applicants_7d, 0),
    'new_applicants_30d', COALESCE(new_applicants_30d, 0),
    'total_applications', COALESCE(total_applications, 0),
    'hired_count', COALESCE(hired_count, 0),
    'rejected_count', COALESCE(rejected_count, 0),
    'upcoming_interviews', COALESCE(upcoming_interviews, 0),
    'pending_documents', COALESCE(pending_documents, 0),
    'expiring_documents', COALESCE(expiring_documents, 0),
    'active_onboarding', COALESCE(active_onboarding, 0),
    'completed_onboarding', COALESCE(completed_onboarding, 0),
    'pending_offers', COALESCE(pending_offers, 0),
    'accepted_offers', COALESCE(accepted_offers, 0),
    'refreshed_at', refreshed_at
  )
  FROM dashboard_stats
  WHERE company_id = p_company_id
$$;

-- Combined activity feed: applications + jobs + candidates, in one query
CREATE OR REPLACE FUNCTION get_recent_activity(
  p_company_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  type TEXT,
  title TEXT,
  subtitle TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM (
    SELECT a.id,
           'application'::TEXT AS type,
           c.full_name AS title,
           j.title AS subtitle,
           a.status,
           a.created_at
    FROM applications a
    JOIN candidates c ON c.id = a.candidate_id
    JOIN jobs j ON j.id = a.job_id
    WHERE a.company_id = p_company_id
    UNION ALL
    SELECT j.id,
           'job'::TEXT,
           j.title,
           COALESCE(j.department, ''),
           j.status,
           j.created_at
    FROM jobs j
    WHERE j.company_id = p_company_id
    UNION ALL
    SELECT cd.id,
           'candidate'::TEXT,
           cd.full_name,
           COALESCE(cd.current_position, 'Candidate'),
           'new'::TEXT,
           cd.created_at
    FROM candidates cd
    WHERE cd.company_id = p_company_id
  ) AS activity
  ORDER BY created_at DESC
  LIMIT GREATEST(p_limit, 1)
$$;

-- Single-query candidates listing with application count, latest status, match score, CV presence
-- Replaces candidateService.getAll's 3-table PostgREST embedding with one round-trip
CREATE OR REPLACE FUNCTION get_candidates_with_applications(p_company_id UUID)
RETURNS TABLE(
  id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  current_position TEXT,
  avatar_url TEXT,
  experience_years NUMERIC,
  source TEXT,
  created_at TIMESTAMPTZ,
  application_count BIGINT,
  latest_application_status TEXT,
  latest_ai_match_score NUMERIC,
  has_cv BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    c.id,
    c.full_name,
    c.email,
    c.phone,
    c.location,
    c.current_position,
    c.avatar_url,
    c.experience_years,
    c.source,
    c.created_at,
    COALESCE(ac.app_count, 0) AS application_count,
    la.status AS latest_application_status,
    la.ai_match_score AS latest_ai_match_score,
    (cv.id IS NOT NULL) AS has_cv
  FROM candidates c
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS app_count
    FROM applications a
    WHERE a.candidate_id = c.id
  ) ac ON true
  LEFT JOIN LATERAL (
    SELECT a.status, a.ai_match_score
    FROM applications a
    WHERE a.candidate_id = c.id
    ORDER BY a.created_at DESC
    LIMIT 1
  ) la ON true
  LEFT JOIN LATERAL (
    SELECT cvd.id
    FROM cv_documents cvd
    WHERE cvd.candidate_id = c.id AND cvd.is_current = true
    LIMIT 1
  ) cv ON true
  WHERE c.company_id = p_company_id
  ORDER BY c.created_at DESC
$$;

-- Convenience: refresh dashboard_stats; call after writes that affect counts
-- (also run via pg_cron in production for periodic refresh)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats
$$;

-- ====================== GRANTS ======================

GRANT EXECUTE ON FUNCTION get_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activity(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_candidates_with_applications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_stats() TO authenticated;
GRANT SELECT ON dashboard_stats TO authenticated;

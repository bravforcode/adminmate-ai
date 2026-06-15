-- Auto-refresh dashboard_stats materialized view
-- Refreshes when jobs, candidates, applications, documents, interviews, offers, or onboarding_checklists change

CREATE OR REPLACE FUNCTION refresh_dashboard_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS refresh_dashboard_stats ON jobs;
CREATE TRIGGER refresh_dashboard_stats
  AFTER INSERT OR UPDATE OR DELETE ON jobs
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_candidates ON candidates;
CREATE TRIGGER refresh_dashboard_stats_candidates
  AFTER INSERT OR UPDATE OR DELETE ON candidates
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_applications ON applications;
CREATE TRIGGER refresh_dashboard_stats_applications
  AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_documents ON documents;
CREATE TRIGGER refresh_dashboard_stats_documents
  AFTER INSERT OR UPDATE OR DELETE ON documents
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_interviews ON interviews;
CREATE TRIGGER refresh_dashboard_stats_interviews
  AFTER INSERT OR UPDATE OR DELETE ON interviews
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_offers ON offers;
CREATE TRIGGER refresh_dashboard_stats_offers
  AFTER INSERT OR UPDATE OR DELETE ON offers
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

DROP TRIGGER IF EXISTS refresh_dashboard_stats_onboarding ON onboarding_checklists;
CREATE TRIGGER refresh_dashboard_stats_onboarding
  AFTER INSERT OR UPDATE OR DELETE ON onboarding_checklists
  FOR EACH STATEMENT
  EXECUTE FUNCTION refresh_dashboard_stats_trigger();

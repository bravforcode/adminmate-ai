-- Remove duplicate indexes
-- The performance migration (20240102000007) already created composite indexes
-- whose leading columns cover these single-column lookups.

DROP INDEX IF EXISTS idx_user_profiles_company;
DROP INDEX IF EXISTS idx_jobs_company;
DROP INDEX IF EXISTS idx_candidates_company;
DROP INDEX IF EXISTS idx_applications_company;
DROP INDEX IF EXISTS idx_documents_company;
DROP INDEX IF EXISTS idx_documents_status;
DROP INDEX IF EXISTS idx_documents_type;
DROP INDEX IF EXISTS idx_notifications_user;
DROP INDEX IF EXISTS idx_audit_logs_company;
DROP INDEX IF EXISTS idx_chat_messages_user;
DROP INDEX IF EXISTS idx_chat_messages_session;

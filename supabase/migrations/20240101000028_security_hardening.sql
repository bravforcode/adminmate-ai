-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_candidates_line_user_id ON candidates(line_user_id) WHERE line_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_candidates_whatsapp_phone ON candidates(whatsapp_phone) WHERE whatsapp_phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_company ON offers(company_id);
CREATE INDEX IF NOT EXISTS idx_offers_candidate ON offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interviews_company ON interviews(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_connections_active ON chat_platform_connections(platform, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pdpa_consents_subject ON pdpa_consents(company_id, data_subject_email);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(user_id, created_at DESC);

-- Storage bucket RLS policies (these must run in Supabase SQL Editor, Edge Functions cannot create storage policies)
-- Note: Run these manually in Supabase Dashboard → Storage → Policies:
-- cv-uploads: SELECT + INSERT for authenticated users with company_id match
-- generated-docs: SELECT for authenticated users with company_id match, INSERT for authenticated
-- company-logos: public SELECT, authenticated INSERT
-- avatars: public SELECT, authenticated INSERT
-- exports: authenticated SELECT + INSERT for admin/hr

-- Role-based route protection: add a new column for route-permission mapping
COMMENT ON TABLE user_profiles IS 'User profiles with role: admin, hr, applicant, manager';

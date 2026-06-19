-- ============================================================
-- Release 5: Messaging + Approval Workflow
-- Builds on existing messages/message_queue/conversation_threads
-- ============================================================

-- 1. Message Templates (bilingual EN/TH, multi-channel)
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_key VARCHAR(100) NOT NULL,
  template_type VARCHAR(50) NOT NULL DEFAULT 'custom',
  name VARCHAR(255) NOT NULL,
  description TEXT,
  default_channel VARCHAR(20) DEFAULT 'email',
  subject_template TEXT,
  body_template TEXT NOT NULL,
  language_code VARCHAR(5) DEFAULT 'en',
  variables_schema JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY templates_read ON message_templates
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY templates_insert ON message_templates
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  );

CREATE POLICY templates_update ON message_templates
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE POLICY templates_delete ON message_templates
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE INDEX idx_templates_company ON message_templates(company_id);
CREATE INDEX idx_templates_key ON message_templates(template_key);
CREATE INDEX idx_templates_active ON message_templates(is_active) WHERE is_active = true;

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Message Template Versions (audit trail for template changes)
CREATE TABLE IF NOT EXISTS message_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  variables_schema JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY template_versions_read ON message_template_versions
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY template_versions_insert ON message_template_versions
  FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE INDEX idx_template_versions_template ON message_template_versions(template_id);

-- 3. Message Drafts (approval workflow core)
CREATE TABLE IF NOT EXISTS message_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_type VARCHAR(20) NOT NULL DEFAULT 'candidate',
  candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL DEFAULT 'email',
  subject TEXT,
  body TEXT NOT NULL,
  language_code VARCHAR(5) DEFAULT 'en',
  ai_generated BOOLEAN DEFAULT false,
  ai_run_id UUID,
  status VARCHAR(20) DEFAULT 'draft',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY drafts_read ON message_drafts
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY drafts_insert ON message_drafts
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff', 'recruiter')
  );

CREATE POLICY drafts_update ON message_drafts
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND (
      created_by = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager')
    )
  );

CREATE POLICY drafts_delete ON message_drafts
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND (
      created_by = auth.uid()
      OR safe_user_role() IN ('admin', 'hr_manager')
    )
  );

CREATE INDEX idx_drafts_company ON message_drafts(company_id);
CREATE INDEX idx_drafts_status ON message_drafts(status);
CREATE INDEX idx_drafts_candidate ON message_drafts(candidate_id);
CREATE INDEX idx_drafts_created_by ON message_drafts(created_by);

CREATE TRIGGER update_drafts_updated_at
  BEFORE UPDATE ON message_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Message Approvals (explicit approval workflow)
CREATE TABLE IF NOT EXISTS message_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  message_draft_id UUID NOT NULL REFERENCES message_drafts(id) ON DELETE CASCADE,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES user_profiles(id),
  rejected_by UUID REFERENCES user_profiles(id),
  approval_reason TEXT,
  rejection_reason TEXT,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY approvals_read ON message_approvals
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY approvals_insert ON message_approvals
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff', 'recruiter')
  );

CREATE POLICY approvals_update ON message_approvals
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE INDEX idx_approvals_company ON message_approvals(company_id);
CREATE INDEX idx_approvals_draft ON message_approvals(message_draft_id);
CREATE INDEX idx_approvals_status ON message_approvals(approval_status);

-- 5. Message Logs (every send attempt logged)
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  message_draft_id UUID REFERENCES message_drafts(id) ON DELETE SET NULL,
  recipient_type VARCHAR(20) NOT NULL,
  recipient_id UUID,
  channel VARCHAR(20) NOT NULL,
  provider VARCHAR(50),
  provider_message_id VARCHAR(255),
  delivery_status VARCHAR(20) DEFAULT 'queued',
  subject TEXT,
  body_snapshot TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  sent_by UUID REFERENCES user_profiles(id),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY logs_read ON message_logs
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY logs_insert ON message_logs
  FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE INDEX idx_logs_company ON message_logs(company_id);
CREATE INDEX idx_logs_draft ON message_logs(message_draft_id);
CREATE INDEX idx_logs_status ON message_logs(delivery_status);
CREATE INDEX idx_logs_created ON message_logs(created_at DESC);

-- 6. Messaging Provider Configs (non-secret metadata only)
CREATE TABLE IF NOT EXISTS messaging_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  is_enabled BOOLEAN DEFAULT false,
  config_status VARCHAR(20) DEFAULT 'not_configured',
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE messaging_provider_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY provider_configs_read ON messaging_provider_configs
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY provider_configs_insert ON messaging_provider_configs
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin')
  );

CREATE POLICY provider_configs_update ON messaging_provider_configs
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin')
  );

CREATE INDEX idx_provider_configs_company ON messaging_provider_configs(company_id);

CREATE TRIGGER update_provider_configs_updated_at
  BEFORE UPDATE ON messaging_provider_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Seed default bilingual templates
INSERT INTO message_templates (company_id, template_key, template_type, name, description, default_channel, subject_template, body_template, language_code, variables_schema, is_active)
SELECT
  c.id,
  t.template_key,
  t.template_type,
  t.name,
  t.description,
  t.default_channel,
  t.subject_template,
  t.body_template,
  t.language_code,
  t.variables_schema::jsonb,
  true
FROM companies c
CROSS JOIN (VALUES
  ('application_received', 'application_received', 'Application Received', 'Acknowledges candidate application', 'email',
   'Thank you for applying to {{job_title}} at {{company_name}}',
   'Dear {{candidate_name}},\n\nThank you for your interest in the {{job_title}} position at {{company_name}}. We have received your application and our HR team will review it shortly.\n\nBest regards,\n{{company_name}} HR Team',
   'en', '[{"name":"candidate_name","type":"string","required":true},{"name":"job_title","type":"string","required":true},{"name":"company_name","type":"string","required":true}]'),

  ('application_received', 'application_received', 'ได้รับใบสมัคร', 'แจ้งผู้สมัครว่าได้รับใบสมัครแล้ว', 'email',
   'ขอบคุณที่สมัครงาน {{job_title}} ที่ {{company_name}}',
   'เรียน {{candidate_name}}\n\nขอบคุณที่สนใจตำแหน่ง {{job_title}} ที่ {{company_name}} เราได้รับใบสมัครของคุณแล้ว ทีม HR จะตรวจสอบและติดต่อกลับโดยเร็ว\n\nขอบคุณครับ\nฝ่ายทรัพยากรบุคคล {{company_name}}',
   'th', '[{"name":"candidate_name","type":"string","required":true},{"name":"job_title","type":"string","required":true},{"name":"company_name","type":"string","required":true}]'),

  ('interview_invite', 'interview_invite', 'Interview Invitation', 'Invites candidate to interview', 'email',
   'Interview Invitation - {{job_title}} at {{company_name}}',
   'Dear {{candidate_name}},\n\nWe are pleased to invite you for an interview for the {{job_title}} position at {{company_name}}.\n\nDate: {{interview_date}}\nTime: {{interview_time}}\nLocation: {{interview_location}}\n\nPlease confirm your availability by replying to this message.\n\nBest regards,\n{{company_name}} HR Team',
   'en', '[{"name":"candidate_name","type":"string","required":true},{"name":"job_title","type":"string","required":true},{"name":"company_name","type":"string","required":true},{"name":"interview_date","type":"string","required":true},{"name":"interview_time","type":"string","required":true},{"name":"interview_location","type":"string","required":true}]'),

  ('interview_invite', 'interview_invite', 'เชิญสัมภาษณ์', 'เชิญผู้สมัครมาสัมภาษณ์', 'email',
   'เชิญสัมภาษณ์ - {{job_title}} ที่ {{company_name}}',
   'เรียน {{candidate_name}}\n\nเรายินดีเชิญคุณมาสัมภาษณ์ตำแหน่ง {{job_title}} ที่ {{company_name}}\n\nวันที่: {{interview_date}}\nเวลา: {{interview_time}}\nสถานที่: {{interview_location}}\n\nกรุณายืนยันการเข้าร่วมโดยการตอบกลับข้อความนี้\n\nขอบคุณครับ\nฝ่ายทรัพยากรบุคคล {{company_name}}',
   'th', '[{"name":"candidate_name","type":"string","required":true},{"name":"job_title","type":"string","required":true},{"name":"company_name","type":"string","required":true},{"name":"interview_date","type":"string","required":true},{"name":"interview_time","type":"string","required":true},{"name":"interview_location","type":"string","required":true}]'),

  ('rejection', 'rejection', 'Application Rejection', 'Politely rejects candidate application', 'email',
   'Update on your application - {{job_title}} at {{company_name}}',
   'Dear {{candidate_name}},\n\nThank you for your interest in the {{job_title}} position at {{company_name}}. After careful review, we have decided to move forward with other candidates.\n\nWe appreciate your time and wish you the best in your job search.\n\nBest regards,\n{{company_name}} HR Team',
   'en', '[{"name":"candidate_name","type":"string","required":true},{"name":"job_title","type":"string","required":true},{"name":"company_name","type":"string","required":true}]'),

  ('rejection', 'rejection', 'ปฏิเสธใบสมัคร', 'แจ้งผู้สมัครอย่างสุภาพว่าไม่ผ่านการคัดเลือก', 'email',
   'ผลการสมัครงาน - {{job_title}} ที่ {{company_name}}',
   'เรียน {{candidate_name}}\n\nขอบคุณที่สนใจตำแหน่ง {{job_title}} ที่ {{company_name}} หลังจากพิจารณาอย่างรอบคอบ เราได้ตัดสินใจเลือกผู้สมัครรายอื่น\n\nขอขอบคุณสำหรับเวลาของคุณ และขอให้โชคดีในการหางาน\n\nขอบคุณครับ\nฝ่ายทรัพยากรบุคคล {{company_name}}',
   'th', '[{"name":"candidate_name","type":"string","required":true},{"name":"job_title","type":"string","required":true},{"name":"company_name","type":"string","required":true}]'),

  ('hired', 'hired', 'Hired Welcome', 'Welcomes newly hired employee', 'email',
   'Welcome to {{company_name}} - {{job_title}}',
   'Dear {{candidate_name}},\n\nCongratulations! We are delighted to offer you the {{job_title}} position at {{company_name}}.\n\nPlease find the offer details attached. If you have any questions, feel free to contact us.\n\nWe look forward to having you on the team!\n\nBest regards,\n{{company_name}} HR Team',
   'en', '[{"name":"candidate_name","type":"string","required":true},{"name":"job_title","type":"string","required":true},{"name":"company_name","type":"string","required":true}]'),

  ('hired', 'hired', 'ยินดีต้อนรับ', 'ยินดีต้อนรับพนักงานใหม่', 'email',
   'ยินดีต้อนรับสู่ {{company_name}} - {{job_title}}',
   'เรียน {{candidate_name}}\n\nขอแสดงความยินดี! เรายินดีเสนอบรรจุคุณในตำแหน่ง {{job_title}} ที่ {{company_name}}\n\nกรุณาดูรายละเอียดข้อเสนอที่แนบมา หากมีคำถามใดๆ สามารถติดต่อเราได้ตลอดเวลา\n\nเรายินดีที่จะต้อนรับคุณเข้าสู่ทีม!\n\nขอบคุณครับ\nฝ่ายทรัพยากรบุคคล {{company_name}}',
   'th', '[{"name":"candidate_name","type":"string","required":true},{"name":"job_title","type":"string","required":true},{"name":"company_name","type":"string","required":true}]')
) AS t(template_key, template_type, name, description, default_channel, subject_template, body_template, language_code, variables_schema)
WHERE NOT EXISTS (
  SELECT 1 FROM message_templates mt
  WHERE mt.company_id = c.id AND mt.template_key = t.template_key AND mt.language_code = t.language_code
);

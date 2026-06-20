-- ============================================================
-- Release 21: Employee AI Assistant — Tables + RLS
-- ============================================================

-- 1. AI Assistant Conversations
CREATE TABLE IF NOT EXISTS ai_assistant_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) DEFAULT 'New Conversation',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_assistant_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_assistant_conversations_read ON ai_assistant_conversations
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY ai_assistant_conversations_insert ON ai_assistant_conversations
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND user_id = auth.uid()
  );

CREATE POLICY ai_assistant_conversations_update ON ai_assistant_conversations
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND user_id = auth.uid()
  );

CREATE POLICY ai_assistant_conversations_delete ON ai_assistant_conversations
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND user_id = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_ai_assistant_conv_company ON ai_assistant_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_conv_user ON ai_assistant_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_conv_status ON ai_assistant_conversations(status);

CREATE TRIGGER update_ai_assistant_conversations_updated_at
  BEFORE UPDATE ON ai_assistant_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. AI Assistant Messages
CREATE TABLE IF NOT EXISTS ai_assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES ai_assistant_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  confidence VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_assistant_messages_read ON ai_assistant_messages
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY ai_assistant_messages_insert ON ai_assistant_messages
  FOR INSERT WITH CHECK (company_id = safe_user_company_id());

CREATE POLICY ai_assistant_messages_delete ON ai_assistant_messages
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE INDEX IF NOT EXISTS idx_ai_assistant_msg_company ON ai_assistant_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_msg_conversation ON ai_assistant_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_msg_role ON ai_assistant_messages(role);

-- 3. AI Knowledge Sources
CREATE TABLE IF NOT EXISTS ai_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_knowledge_sources_read ON ai_knowledge_sources
  FOR SELECT USING (company_id = safe_user_company_id());

CREATE POLICY ai_knowledge_sources_insert ON ai_knowledge_sources
  FOR INSERT WITH CHECK (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager', 'hr_staff')
  );

CREATE POLICY ai_knowledge_sources_update ON ai_knowledge_sources
  FOR UPDATE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE POLICY ai_knowledge_sources_delete ON ai_knowledge_sources
  FOR DELETE USING (
    company_id = safe_user_company_id()
    AND safe_user_role() IN ('admin', 'hr_manager')
  );

CREATE INDEX IF NOT EXISTS idx_ai_knowledge_company ON ai_knowledge_sources(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_type ON ai_knowledge_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_ai_knowledge_active ON ai_knowledge_sources(is_active);

CREATE TRIGGER update_ai_knowledge_sources_updated_at
  BEFORE UPDATE ON ai_knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. RBAC: ai_assistant_read / ai_assistant_write
INSERT INTO permissions (resource, action, display_name) VALUES
  ('ai_assistant', 'read',  'View AI assistant conversations and sources'),
  ('ai_assistant', 'write', 'Create/edit AI assistant conversations and knowledge sources');

-- Owner gets both
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'owner' AND p.resource = 'ai_assistant';

-- Admin gets both
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' AND p.resource = 'ai_assistant';

-- HR Manager gets both
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_manager' AND p.resource = 'ai_assistant';

-- HR Staff gets both
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'hr_staff' AND p.resource = 'ai_assistant';

-- Manager gets read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' AND p.resource = 'ai_assistant' AND p.action = 'read';

-- Employee gets read only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' AND p.resource = 'ai_assistant' AND p.action = 'read';

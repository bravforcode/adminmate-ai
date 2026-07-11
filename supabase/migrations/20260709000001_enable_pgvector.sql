-- Enable pgvector extension for vector similarity search
-- Required for AI Policy Assistant RAG

CREATE EXTENSION IF NOT EXISTS vector;

-- Policy documents table for RAG
CREATE TABLE IF NOT EXISTS policy_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  department TEXT,
  min_role TEXT DEFAULT 'employee',
  embedding VECTOR(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_policy_documents_embedding
  ON policy_documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);

-- RLS policies
ALTER TABLE policy_documents ENABLE ROW LEVEL SECURITY;

-- Company isolation: users can only see their company's documents
CREATE POLICY "policy_documents_company_isolation" ON policy_documents
  FOR ALL USING (
    company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
  );

-- Role-based access: filter by min_role
CREATE POLICY "policy_documents_role_access" ON policy_documents
  FOR SELECT USING (
    min_role IN ('employee', 'manager', 'hr', 'admin')
    AND (
      min_role = 'employee'
      OR (min_role = 'manager' AND EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('manager', 'hr', 'admin')
      ))
      OR (min_role = 'hr' AND EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('hr', 'admin')
      ))
      OR (min_role = 'admin' AND EXISTS (
        SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
      ))
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_policy_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_policy_documents_updated_at
  BEFORE UPDATE ON policy_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_policy_documents_updated_at();

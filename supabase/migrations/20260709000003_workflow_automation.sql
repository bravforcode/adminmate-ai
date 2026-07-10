-- Workflow Automation tables
-- No-code workflow builder: triggers, conditions, actions

-- Workflows
CREATE TABLE IF NOT EXISTS workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Nodes (trigger, condition, action)
CREATE TABLE IF NOT EXISTS workflow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('trigger', 'condition', 'action')),
  position JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}',
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Edges (connections between nodes)
CREATE TABLE IF NOT EXISTS workflow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES workflow_nodes(id) ON DELETE CASCADE,
  source_handle TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow Executions (run history)
CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  trigger_event_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  node_results JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_nodes_workflow ON workflow_nodes(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_workflow ON workflow_edges(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_source ON workflow_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_edges_target ON workflow_edges(target_node_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_event ON workflow_executions(trigger_event_id);

-- RLS policies
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Company isolation for workflows
CREATE POLICY "workflows_company_isolation" ON workflows
  FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Company isolation for workflow_nodes (via workflow)
CREATE POLICY "workflow_nodes_company_isolation" ON workflow_nodes
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- Company isolation for workflow_edges (via workflow)
CREATE POLICY "workflow_edges_company_isolation" ON workflow_edges
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- Company isolation for workflow_executions (via workflow)
CREATE POLICY "workflow_executions_company_isolation" ON workflow_executions
  FOR ALL USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- Updated_at trigger for workflows
CREATE OR REPLACE FUNCTION update_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workflows_updated_at
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflows_updated_at();

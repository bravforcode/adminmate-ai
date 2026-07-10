import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'
import type {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  TriggerType,
  ActionType,
} from './workflowTypes'

/* ============================================================
   Workflow Automation Service
   CRUD operations for workflows, nodes, edges.
   ============================================================ */

// ── Types ───────────────────────────────────────────────────

export interface CreateWorkflowInput {
  name: string
  description: string
}

export interface CreateNodeInput {
  type: 'trigger' | 'condition' | 'action'
  position: { x: number; y: number }
  config: Record<string, unknown>
}

export interface CreateEdgeInput {
  source_node_id: string
  target_node_id: string
  source_handle?: string
}

// ── Workflow CRUD ───────────────────────────────────────────

export async function listWorkflows(companyId: string): Promise<Workflow[]> {
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Workflow[]
}

export async function getWorkflow(workflowId: string): Promise<{
  workflow: Workflow
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}> {
  const [workflowResult, nodesResult, edgesResult] = await Promise.all([
    supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single(),
    supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId),
    supabase
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId),
  ])

  if (workflowResult.error) throw workflowResult.error

  return {
    workflow: workflowResult.data as Workflow,
    nodes: (nodesResult.data ?? []) as WorkflowNode[],
    edges: (edgesResult.data ?? []) as WorkflowEdge[],
  }
}

export async function createWorkflow(
  companyId: string,
  input: CreateWorkflowInput
): Promise<Workflow> {
  const canWrite = await hasPermission('automation', 'write')
  if (!canWrite) throw new Error('Requires automation_write permission')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('workflows')
    .insert({
      company_id: companyId,
      name: input.name,
      description: input.description,
      is_active: false,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) throw error
  return data as Workflow
}

export async function updateWorkflow(
  workflowId: string,
  updates: Partial<Pick<Workflow, 'name' | 'description' | 'is_active'>>
): Promise<Workflow> {
  const canWrite = await hasPermission('automation', 'write')
  if (!canWrite) throw new Error('Requires automation_write permission')

  const { data, error } = await supabase
    .from('workflows')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', workflowId)
    .select()
    .single()

  if (error) throw error
  return data as Workflow
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  const canWrite = await hasPermission('automation', 'write')
  if (!canWrite) throw new Error('Requires automation_write permission')

  // Delete edges and nodes first
  await Promise.all([
    supabase.from('workflow_edges').delete().eq('workflow_id', workflowId),
    supabase.from('workflow_nodes').delete().eq('workflow_id', workflowId),
  ])

  const { error } = await supabase
    .from('workflows')
    .delete()
    .eq('id', workflowId)

  if (error) throw error
}

// ── Node CRUD ───────────────────────────────────────────────

export async function addNode(
  workflowId: string,
  input: CreateNodeInput
): Promise<WorkflowNode> {
  const canWrite = await hasPermission('automation', 'write')
  if (!canWrite) throw new Error('Requires automation_write permission')

  const { data, error } = await supabase
    .from('workflow_nodes')
    .insert({
      workflow_id: workflowId,
      type: input.type,
      position: input.position,
      config: input.config,
    })
    .select()
    .single()

  if (error) throw error

  // Update workflow's updated_at
  await supabase
    .from('workflows')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', workflowId)

  return data as WorkflowNode
}

export async function updateNode(
  nodeId: string,
  updates: Partial<Pick<WorkflowNode, 'position' | 'config'>>
): Promise<WorkflowNode> {
  const canWrite = await hasPermission('automation', 'write')
  if (!canWrite) throw new Error('Requires automation_write permission')

  const { data, error } = await supabase
    .from('workflow_nodes')
    .update(updates)
    .eq('id', nodeId)
    .select()
    .single()

  if (error) throw error
  return data as WorkflowNode
}

export async function deleteNode(nodeId: string): Promise<void> {
  const canWrite = await hasPermission('automation', 'write')
  if (!canWrite) throw new Error('Requires automation_write permission')

  // Delete connected edges
  await Promise.all([
    supabase.from('workflow_edges').delete().eq('source_node_id', nodeId),
    supabase.from('workflow_edges').delete().eq('target_node_id', nodeId),
  ])

  const { error } = await supabase
    .from('workflow_nodes')
    .delete()
    .eq('id', nodeId)

  if (error) throw error
}

// ── Edge CRUD ───────────────────────────────────────────────

export async function addEdge(
  workflowId: string,
  input: CreateEdgeInput
): Promise<WorkflowEdge> {
  const canWrite = await hasPermission('automation', 'write')
  if (!canWrite) throw new Error('Requires automation_write permission')

  const { data, error } = await supabase
    .from('workflow_edges')
    .insert({
      workflow_id: workflowId,
      source_node_id: input.source_node_id,
      target_node_id: input.target_node_id,
      source_handle: input.source_handle,
    })
    .select()
    .single()

  if (error) throw error
  return data as WorkflowEdge
}

export async function deleteEdge(edgeId: string): Promise<void> {
  const canWrite = await hasPermission('automation', 'write')
  if (!canWrite) throw new Error('Requires automation_write permission')

  const { error } = await supabase
    .from('workflow_edges')
    .delete()
    .eq('id', edgeId)

  if (error) throw error
}

// ── Available Triggers & Actions ────────────────────────────

export interface TriggerDefinition {
  type: TriggerType
  label: string
  description: string
  category: string
  defaultFilters?: Record<string, unknown>
}

export interface ActionDefinition {
  type: ActionType
  label: string
  description: string
  category: string
  paramSchema: Array<{
    name: string
    type: 'string' | 'number' | 'boolean' | 'select'
    label: string
    required: boolean
    options?: string[]
    placeholder?: string
  }>
}

export function getAvailableTriggers(): TriggerDefinition[] {
  return [
    { type: 'employee_created', label: 'Employee Created', description: 'When a new employee is added', category: 'Employee' },
    { type: 'employee_updated', label: 'Employee Updated', description: 'When employee data is modified', category: 'Employee' },
    { type: 'leave_requested', label: 'Leave Requested', description: 'When an employee submits a leave request', category: 'Leave' },
    { type: 'leave_approved', label: 'Leave Approved', description: 'When a leave request is approved', category: 'Leave' },
    { type: 'leave_rejected', label: 'Leave Rejected', description: 'When a leave request is rejected', category: 'Leave' },
    { type: 'onboarding_started', label: 'Onboarding Started', description: 'When onboarding process begins', category: 'Onboarding' },
    { type: 'onboarding_completed', label: 'Onboarding Completed', description: 'When all onboarding tasks are done', category: 'Onboarding' },
    { type: 'payroll_completed', label: 'Payroll Completed', description: 'When a payroll run is finalized', category: 'Payroll' },
    { type: 'performance_review_due', label: 'Review Due', description: 'When a performance review is due', category: 'Performance' },
    { type: 'birthday', label: 'Employee Birthday', description: 'On employee birthday', category: 'Employee' },
    { type: 'work_anniversary', label: 'Work Anniversary', description: 'On employee work anniversary', category: 'Employee' },
    { type: 'cron', label: 'Scheduled', description: 'Run on a schedule (cron expression)', category: 'System' },
  ]
}

export function getAvailableActions(): ActionDefinition[] {
  return [
    {
      type: 'send_line_message',
      label: 'Send LINE Message',
      description: 'Send a message via LINE',
      category: 'Messaging',
      paramSchema: [
        { name: 'recipient', type: 'string', label: 'Recipient', required: true, placeholder: 'Employee ID or {{employee.line_user_id}}' },
        { name: 'message', type: 'string', label: 'Message', required: true, placeholder: 'Hello {{employee.first_name}}!' },
      ],
    },
    {
      type: 'send_email',
      label: 'Send Email',
      description: 'Send an email notification',
      category: 'Messaging',
      paramSchema: [
        { name: 'recipient', type: 'string', label: 'To', required: true, placeholder: '{{employee.email}}' },
        { name: 'subject', type: 'string', label: 'Subject', required: true },
        { name: 'body', type: 'string', label: 'Body (HTML)', required: true },
      ],
    },
    {
      type: 'create_task',
      label: 'Create Task',
      description: 'Create an onboarding or HR task',
      category: 'Task',
      paramSchema: [
        { name: 'title', type: 'string', label: 'Title', required: true },
        { name: 'description', type: 'string', label: 'Description', required: false },
        { name: 'assignee', type: 'string', label: 'Assignee', required: true, placeholder: '{{employee.id}}' },
      ],
    },
    {
      type: 'update_employee_field',
      label: 'Update Employee Field',
      description: 'Update a field on the employee profile',
      category: 'Employee',
      paramSchema: [
        { name: 'field', type: 'string', label: 'Field Path', required: true, placeholder: 'department' },
        { name: 'value', type: 'string', label: 'New Value', required: true },
      ],
    },
    {
      type: 'call_webhook',
      label: 'Call Webhook',
      description: 'Send HTTP request to an external URL',
      category: 'Integration',
      paramSchema: [
        { name: 'url', type: 'string', label: 'URL', required: true },
        { name: 'method', type: 'select', label: 'Method', required: true, options: ['POST', 'GET', 'PUT', 'PATCH'] },
      ],
    },
    {
      type: 'notify_manager',
      label: 'Notify Manager',
      description: 'Send notification to the employee\'s manager',
      category: 'Messaging',
      paramSchema: [
        { name: 'message', type: 'string', label: 'Message', required: true },
        { name: 'channel', type: 'select', label: 'Channel', required: true, options: ['email', 'line', 'slack', 'all'] },
      ],
    },
  ]
}

/* ============================================================
   Workflow Automation Types
   Defines triggers, actions, conditions, and workflow structure
   for the no-code workflow builder.
   ============================================================ */

// ── Workflow ────────────────────────────────────────────────

export interface Workflow {
  id: string
  company_id: string
  name: string
  description: string
  is_active: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface WorkflowNode {
  id: string
  workflow_id: string
  type: 'trigger' | 'condition' | 'action'
  position: { x: number; y: number }
  config: TriggerConfig | ConditionConfig | ActionConfig
}

export interface WorkflowEdge {
  id: string
  workflow_id: string
  source_node_id: string
  target_node_id: string
  source_handle?: string
}

// ── Trigger Types ───────────────────────────────────────────

export type TriggerType =
  | 'employee_created'
  | 'employee_updated'
  | 'leave_requested'
  | 'leave_approved'
  | 'leave_rejected'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'payroll_completed'
  | 'document_uploaded'
  | 'performance_review_due'
  | 'birthday'
  | 'work_anniversary'
  | 'schedule_published'
  | 'time_clock_anomaly'
  | 'custom_event'
  | 'cron'

export interface TriggerConfig {
  type: TriggerType
  /** Cron expression for 'cron' type */
  cron?: string
  /** Additional filters (e.g., department, leave type) */
  filters?: Record<string, unknown>
}

// ── Condition Types ─────────────────────────────────────────

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'contains'
  | 'not_contains'
  | 'in'
  | 'not_in'

export interface ConditionConfig {
  field: string
  operator: ConditionOperator
  value: unknown
  logic?: 'and' | 'or'
  /** For nested conditions */
  conditions?: ConditionConfig[]
}

// ── Action Types ────────────────────────────────────────────

export type ActionType =
  | 'send_line_message'
  | 'send_whatsapp_message'
  | 'send_email'
  | 'send_slack_message'
  | 'create_task'
  | 'update_employee_field'
  | 'create_document'
  | 'call_webhook'
  | 'create_leave_request'
  | 'approve_leave_request'
  | 'assign_training'
  | 'notify_manager'
  | 'notify_hr'

export interface ActionConfig {
  type: ActionType
  /** Action-specific configuration */
  params: Record<string, unknown>
}

// ── Action Params ───────────────────────────────────────────

export interface SendLineMessageParams {
  /** Employee ID or 'trigger_employee' */
  recipient: string
  message: string
  /** Optional Flex Message template ID */
  flexTemplate?: string
}

export interface SendEmailParams {
  recipient: string
  subject: string
  body: string
  /** Template variables: {{employee_name}}, {{date}}, etc. */
  template?: string
}

export interface CreateTaskParams {
  title: string
  description: string
  assignee: string
  dueDate: string
  /** 'relative' uses trigger event date as base */
  dueDateType: 'fixed' | 'relative'
  dueDateOffset?: number
}

export interface UpdateEmployeeFieldParams {
  /** Field path: 'department', 'status', 'custom_fields.position' */
  field: string
  value: unknown
}

export interface CallWebhookParams {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH'
  headers?: Record<string, string>
  body?: Record<string, unknown>
}

export interface NotifyManagerParams {
  message: string
  channel: 'line' | 'email' | 'slack' | 'all'
}

// ── Execution ───────────────────────────────────────────────

export type WorkflowExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface WorkflowExecution {
  id: string
  workflow_id: string
  trigger_event_id: string
  status: WorkflowExecutionStatus
  started_at: string
  completed_at?: string
  error?: string
  node_results: NodeExecutionResult[]
}

export interface NodeExecutionResult {
  node_id: string
  node_type: 'trigger' | 'condition' | 'action'
  status: 'success' | 'failed' | 'skipped'
  input?: unknown
  output?: unknown
  error?: string
  duration_ms: number
}

// ── Template Variables ──────────────────────────────────────

export interface WorkflowContext {
  /** The employee who triggered the workflow */
  employee: {
    id: string
    first_name: string
    last_name: string
    email: string
    department?: string
    position?: string
    hire_date?: string
  }
  /** The company */
  company: {
    id: string
    name: string
  }
  /** Event-specific data */
  event: Record<string, unknown>
  /** Current date/time */
  now: string
}

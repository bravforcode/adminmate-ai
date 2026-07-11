import { supabase } from '../../lib/supabase'
import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  NodeExecutionResult,
  WorkflowContext,
  ConditionConfig,
  ActionConfig,
} from './workflowTypes'

/* ============================================================
   Workflow Execution Engine
   Queue-based, idempotent, retry-safe execution of workflows.
   ============================================================ */

// ── Main Entry Point ────────────────────────────────────────

/**
 * Execute a workflow in response to a trigger event.
 * Idempotent: checks for existing execution of same trigger event.
 */
export async function executeWorkflow(
  workflowId: string,
  triggerEventId: string,
  context: WorkflowContext
): Promise<WorkflowExecution> {
  // Idempotency check: prevent duplicate executions for same event
  const { data: existing } = await supabase
    .from('workflow_executions')
    .select('id, status')
    .eq('workflow_id', workflowId)
    .eq('trigger_event_id', triggerEventId)
    .single()

  if (existing && existing.status !== 'failed') {
    return existing as WorkflowExecution
  }

  // Create execution record
  const { data: execution, error: execErr } = await supabase
    .from('workflow_executions')
    .insert({
      workflow_id: workflowId,
      trigger_event_id: triggerEventId,
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (execErr || !execution) {
    throw new Error(`Failed to create execution: ${execErr?.message}`)
  }

  try {
    // Load workflow graph
    const { nodes, edges } = await loadWorkflowGraph(workflowId)

    // Find trigger node
    const triggerNode = nodes.find(n => n.type === 'trigger')
    if (!triggerNode) {
      throw new Error('Workflow has no trigger node')
    }

    // Execute from trigger node
    const results = await executeNodeChain(triggerNode.id, nodes, edges, context, [])

    // Update execution status
    const allSuccess = results.every(r => r.status === 'success' || r.status === 'skipped')
    const finalStatus = allSuccess ? 'completed' : 'failed'

    await supabase
      .from('workflow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        node_results: results,
      })
      .eq('id', execution.id)

    return {
      ...execution,
      status: finalStatus,
      node_results: results,
    } as WorkflowExecution
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    await supabase
      .from('workflow_executions')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: errorMessage,
      })
      .eq('id', execution.id)

    return {
      ...execution,
      status: 'failed',
      error: errorMessage,
      node_results: [],
    } as WorkflowExecution
  }
}

// ── Graph Loading ───────────────────────────────────────────

async function loadWorkflowGraph(
  workflowId: string
): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
  const [nodesResult, edgesResult] = await Promise.all([
    supabase
      .from('workflow_nodes')
      .select('*')
      .eq('workflow_id', workflowId),
    supabase
      .from('workflow_edges')
      .select('*')
      .eq('workflow_id', workflowId),
  ])

  return {
    nodes: (nodesResult.data ?? []) as WorkflowNode[],
    edges: (edgesResult.data ?? []) as WorkflowEdge[],
  }
}

// ── Node Chain Execution ────────────────────────────────────

async function executeNodeChain(
  currentNodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  context: WorkflowContext,
  results: NodeExecutionResult[]
): Promise<NodeExecutionResult[]> {
  const node = nodes.find(n => n.id === currentNodeId)
  if (!node) return results

  const startTime = Date.now()

  try {
    let nodeResult: NodeExecutionResult

    switch (node.type) {
      case 'trigger':
        // Trigger node is a no-op (the event itself is the trigger)
        nodeResult = {
          node_id: node.id,
          node_type: 'trigger',
          status: 'success',
          duration_ms: Date.now() - startTime,
        }
        break

      case 'condition':
        nodeResult = await evaluateCondition(node.config as ConditionConfig, context)
        break

      case 'action':
        nodeResult = await executeAction(node.config as ActionConfig, context)
        break

      default:
        nodeResult = {
          node_id: node.id,
          node_type: node.type as 'trigger' | 'condition' | 'action',
          status: 'failed',
          error: `Unknown node type: ${node.type}`,
          duration_ms: Date.now() - startTime,
        }
    }

    results.push(nodeResult)

    // If condition failed, stop chain (don't execute downstream)
    if (node.type === 'condition' && nodeResult.status !== 'success') {
      return results
    }

    // Find next nodes
    const outgoingEdges = edges.filter(e => e.source_node_id === currentNodeId)
    for (const edge of outgoingEdges) {
      // For condition nodes, follow the correct handle
      if (node.type === 'condition' && edge.source_handle) {
        const shouldFollow = edge.source_handle === 'true' && nodeResult.status === 'success'
          || edge.source_handle === 'false' && nodeResult.status === 'skipped'
        if (!shouldFollow) continue
      }

      await executeNodeChain(edge.target_node_id, nodes, edges, context, results)
    }
  } catch (error) {
    results.push({
      node_id: node.id,
      node_type: node.type as 'trigger' | 'condition' | 'action',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    })
  }

  return results
}

// ── Condition Evaluation ────────────────────────────────────

async function evaluateCondition(
  config: ConditionConfig,
  context: WorkflowContext
): Promise<NodeExecutionResult> {
  const startTime = Date.now()

  try {
    const fieldValue = getNestedValue(context, config.field)
    const matches = evaluateOperator(fieldValue, config.operator, config.value)

    return {
      node_id: '',
      node_type: 'condition',
      status: matches ? 'success' : 'skipped',
      input: { field: config.field, operator: config.operator, value: config.value },
      output: { result: matches, fieldValue },
      duration_ms: Date.now() - startTime,
    }
  } catch (error) {
    return {
      node_id: '',
      node_type: 'condition',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Condition evaluation failed',
      duration_ms: Date.now() - startTime,
    }
  }
}

function evaluateOperator(fieldValue: unknown, operator: string, expected: unknown): boolean {
  switch (operator) {
    case 'equals':
      return fieldValue === expected
    case 'not_equals':
      return fieldValue !== expected
    case 'greater_than':
      return Number(fieldValue) > Number(expected)
    case 'less_than':
      return Number(fieldValue) < Number(expected)
    case 'contains':
      return String(fieldValue).includes(String(expected))
    case 'not_contains':
      return !String(fieldValue).includes(String(expected))
    case 'in':
      return Array.isArray(expected) && expected.includes(fieldValue)
    case 'not_in':
      return Array.isArray(expected) && !expected.includes(fieldValue)
    default:
      return false
  }
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key: string) => {
    if (current && typeof current === 'object' && key in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

// ── Action Execution ────────────────────────────────────────

async function executeAction(
  config: ActionConfig,
  context: WorkflowContext
): Promise<NodeExecutionResult> {
  const startTime = Date.now()

  try {
    let output: unknown

    switch (config.type) {
      case 'send_line_message':
        output = await executeLineMessage(config.params, context)
        break
      case 'send_email':
        output = await executeEmail(config.params, context)
        break
      case 'create_task':
        output = await executeCreateTask(config.params, context)
        break
      case 'update_employee_field':
        output = await executeUpdateField(config.params, context)
        break
      case 'call_webhook':
        output = await executeWebhook(config.params, context)
        break
      case 'notify_manager':
        output = await executeNotifyManager(config.params, context)
        break
      default:
        throw new Error(`Unknown action type: ${config.type}`)
    }

    return {
      node_id: '',
      node_type: 'action',
      status: 'success',
      input: config.params,
      output,
      duration_ms: Date.now() - startTime,
    }
  } catch (error) {
    return {
      node_id: '',
      node_type: 'action',
      status: 'failed',
      error: error instanceof Error ? error.message : 'Action execution failed',
      duration_ms: Date.now() - startTime,
    }
  }
}

// ── Action Implementations ──────────────────────────────────

async function executeLineMessage(
  params: Record<string, unknown>,
  context: WorkflowContext
): Promise<{ sent: boolean }> {
  const recipient = resolveTemplate(params.recipient as string, context)
  const message = resolveTemplate(params.message as string, context)

  // Import LINE service dynamically to avoid circular deps
  const { sendLINEMessage } = await import('../lineService')
  const sent = await sendLINEMessage(recipient, { type: 'text', text: message })
  return { sent }
}

async function executeEmail(
  params: Record<string, unknown>,
  context: WorkflowContext
): Promise<{ sent: boolean }> {
  const recipient = resolveTemplate(params.recipient as string, context)
  const subject = resolveTemplate(params.subject as string, context)
  const body = resolveTemplate(params.body as string, context)

  // Call Supabase Edge Function for email sending
  const { error } = await supabase.functions.invoke('send-email', {
    body: { to: recipient, subject, html: body },
  })

  return { sent: !error }
}

async function executeCreateTask(
  params: Record<string, unknown>,
  context: WorkflowContext
): Promise<{ taskId: string }> {
  const title = resolveTemplate(params.title as string, context)
  const description = resolveTemplate(params.description as string, context)
  const assignee = resolveTemplate(params.assignee as string, context)

  const { data, error } = await supabase
    .from('onboarding_tasks')
    .insert({
      company_id: context.company.id,
      employee_id: context.employee.id,
      title,
      description,
      assigned_to: assignee,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) throw error
  return { taskId: data.id }
}

async function executeUpdateField(
  params: Record<string, unknown>,
  context: WorkflowContext
): Promise<{ updated: boolean }> {
  const field = params.field as string
  const value = params.value

  const { error } = await supabase
    .from('user_profiles')
    .update({ [field]: value })
    .eq('id', context.employee.id)

  return { updated: !error }
}

async function executeWebhook(
  params: Record<string, unknown>,
  context: WorkflowContext
): Promise<{ status: number }> {
  const url = resolveTemplate(params.url as string, context)
  const method = (params.method as string) || 'POST'
  const headers = (params.headers as Record<string, string>) || {}
  const body = params.body ? JSON.parse(resolveTemplate(JSON.stringify(params.body), context)) : undefined

  const response = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })

  return { status: response.status }
}

async function executeNotifyManager(
  params: Record<string, unknown>,
  context: WorkflowContext
): Promise<{ notified: boolean }> {
  const message = resolveTemplate(params.message as string, context)
  const channel = (params.channel as string) || 'email'

  // Look up manager
  const { data: manager } = await supabase
    .from('user_profiles')
    .select('id, email, line_user_id')
    .eq('company_id', context.company.id)
    .eq('role', 'manager')
    .single()

  if (!manager) return { notified: false }

  if (channel === 'line' || channel === 'all') {
    if (manager.line_user_id) {
      const { sendLINEMessage } = await import('../lineService')
      await sendLINEMessage(manager.line_user_id, { type: 'text', text: message })
    }
  }

  if (channel === 'email' || channel === 'all') {
    if (manager.email) {
      const { error } = await supabase.functions.invoke('send-email', {
        body: { to: manager.email, subject: 'Workflow Notification', html: message },
      })
      if (error) return { notified: false }
    }
  }

  return { notified: true }
}

// ── Template Resolution ─────────────────────────────────────

function resolveTemplate(template: string, context: WorkflowContext): string {
  return template
    .replace(/\{\{employee\.first_name\}\}/g, context.employee.first_name)
    .replace(/\{\{employee\.last_name\}\}/g, context.employee.last_name)
    .replace(/\{\{employee\.email\}\}/g, context.employee.email)
    .replace(/\{\{employee\.department\}\}/g, context.employee.department || '')
    .replace(/\{\{employee\.position\}\}/g, context.employee.position || '')
    .replace(/\{\{company\.name\}\}/g, context.company.name)
    .replace(/\{\{now\}\}/g, context.now)
}

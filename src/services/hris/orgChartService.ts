import { supabase } from '../../lib/supabase'

/* ============================================================
   Org Chart Service
   Reporting lines and team structure.
   ============================================================ */

export interface OrgChartNode {
  id: string
  company_id: string
  employee_id: string
  manager_employee_id?: string
  department_id?: string
  team_id?: string
  position_title: string
  node_order?: number
  effective_from: string
  effective_to?: string
  created_at: string
  updated_at: string
}

export async function getOrgChart(companyId: string): Promise<OrgChartNode[]> {
  const { data, error } = await supabase
    .from('org_chart_nodes')
    .select('*, employees!org_chart_nodes_employee_id_fkey(job_title, employee_number, employee_profiles(display_name))')
    .eq('company_id', companyId)
    .is('effective_to', null)
    .order('node_order')
  if (error) throw error
  return (data ?? []) as unknown as OrgChartNode[]
}

export async function getDirectReports(managerEmployeeId: string): Promise<OrgChartNode[]> {
  const { data, error } = await supabase
    .from('org_chart_nodes')
    .select('*, employees!org_chart_nodes_employee_id_fkey(job_title, employee_profiles(display_name))')
    .eq('manager_employee_id', managerEmployeeId)
    .is('effective_to', null)
    .order('node_order')
  if (error) throw error
  return (data ?? []) as unknown as OrgChartNode[]
}

export async function updateReportingLine(
  companyId: string,
  employeeId: string,
  managerEmployeeId: string | null,
  updatedBy: string
): Promise<void> {
  // Prevent circular reference
  if (managerEmployeeId && managerEmployeeId === employeeId) {
    throw new Error('Cannot assign employee as their own manager')
  }

  // Check for direct circular: manager's manager is the employee
  if (managerEmployeeId) {
    const { data: managerNode } = await supabase
      .from('org_chart_nodes')
      .select('manager_employee_id')
      .eq('employee_id', managerEmployeeId)
      .is('effective_to', null)
      .maybeSingle()
    if (managerNode?.manager_employee_id === employeeId) {
      throw new Error('Circular manager relationship detected')
    }
  }

  // Deactivate current node
  await supabase
    .from('org_chart_nodes')
    .update({ effective_to: new Date().toISOString().split('T')[0] })
    .eq('employee_id', employeeId)
    .is('effective_to', null)

  // Create new node
  const { data: emp } = await supabase
    .from('employees')
    .select('job_title')
    .eq('id', employeeId)
    .single()

  await supabase.from('org_chart_nodes').insert({
    company_id: companyId,
    employee_id: employeeId,
    manager_employee_id: managerEmployeeId,
    position_title: emp?.job_title || 'Employee',
    effective_from: new Date().toISOString().split('T')[0],
  })

  await supabase.from('employee_timeline_events').insert({
    company_id: companyId,
    employee_id: employeeId,
    event_type: 'manager_changed',
    title: 'Reporting line updated',
    created_by: updatedBy,
  })
}

export async function getEmployeeReportingLine(employeeId: string): Promise<OrgChartNode[]> {
  const line: OrgChartNode[] = []
  let currentId: string | null = employeeId

  while (currentId) {
    const { data: node } = await supabase
      .from('org_chart_nodes')
      .select('*')
      .eq('employee_id', currentId)
      .is('effective_to', null)
      .maybeSingle() as { data: Record<string, unknown> | null }
    if (!node) break
    line.push(node as unknown as OrgChartNode)
    currentId = (node.manager_employee_id as string) ?? null
    if (line.length > 20) break // Safety limit
  }

  return line
}

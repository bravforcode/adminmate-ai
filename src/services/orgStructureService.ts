import { supabase } from '../lib/supabase'
import { logger } from '../lib/logger'

// ponytail: one file covers department + team + reporting_line CRUD.
// Split when file exceeds ~200 lines.

// ============== DEPARTMENTS ==============
export interface Department {
  id: string
  company_id: string
  legal_entity_id?: string
  business_unit_id?: string
  parent_department_id?: string
  name: string
  code?: string
  description?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export async function getDepartments(companyId: string): Promise<Department[]> {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('company_id', companyId)
    .order('name')
  if (error) { logger.error('Failed to fetch departments', { error: error.message }); return [] }
  return data ?? []
}

export async function createDepartment(dept: Omit<Department, 'id' | 'created_at' | 'updated_at'>): Promise<Department | null> {
  const { data, error } = await supabase.from('departments').insert(dept).select().single()
  if (error) { logger.error('Failed to create department', { error: error.message }); return null }
  return data
}

export async function updateDepartment(id: string, updates: Partial<Department>): Promise<Department | null> {
  const { data, error } = await supabase.from('departments').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) { logger.error('Failed to update department', { error: error.message }); return null }
  return data
}

export async function deleteDepartment(id: string): Promise<boolean> {
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) { logger.error('Failed to delete department', { error: error.message }); return false }
  return true
}

// ============== TEAMS ==============
export interface Team {
  id: string
  company_id: string
  department_id?: string
  manager_user_id?: string
  name: string
  code?: string
  description?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export async function getTeams(companyId: string): Promise<Team[]> {
  const { data, error } = await supabase.from('teams').select('*').eq('company_id', companyId).order('name')
  if (error) { logger.error('Failed to fetch teams', { error: error.message }); return [] }
  return data ?? []
}

export async function createTeam(team: Omit<Team, 'id' | 'created_at' | 'updated_at'>): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').insert(team).select().single()
  if (error) { logger.error('Failed to create team', { error: error.message }); return null }
  return data
}

export async function updateTeam(id: string, updates: Partial<Team>): Promise<Team | null> {
  const { data, error } = await supabase.from('teams').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) { logger.error('Failed to update team', { error: error.message }); return null }
  return data
}

export async function deleteTeam(id: string): Promise<boolean> {
  const { error } = await supabase.from('teams').delete().eq('id', id)
  if (error) { logger.error('Failed to delete team', { error: error.message }); return false }
  return true
}

// ============== REPORTING LINES ==============
export interface ReportingLine {
  id: string
  company_id: string
  employee_user_id: string
  manager_user_id: string
  relationship_type: 'direct' | 'functional' | 'dotted_line'
  effective_from: string
  effective_to?: string
  created_at: string
}

export async function getReportingLines(companyId: string): Promise<ReportingLine[]> {
  const { data, error } = await supabase.from('reporting_lines').select('*').eq('company_id', companyId)
  if (error) { logger.error('Failed to fetch reporting lines', { error: error.message }); return [] }
  return data ?? []
}

export async function getReportingLinesForEmployee(employeeUserId: string): Promise<ReportingLine[]> {
  const { data, error } = await supabase.from('reporting_lines').select('*').eq('employee_user_id', employeeUserId).is('effective_to', null)
  if (error) { logger.error('Failed to fetch reporting lines for employee', { error: error.message }); return [] }
  return data ?? []
}

export async function createReportingLine(line: Omit<ReportingLine, 'id' | 'created_at'>): Promise<ReportingLine | null> {
  const { data, error } = await supabase.from('reporting_lines').insert(line).select().single()
  if (error) { logger.error('Failed to create reporting line', { error: error.message }); return null }
  return data
}

export async function endReportingLine(id: string): Promise<boolean> {
  const { error } = await supabase.from('reporting_lines').update({ effective_to: new Date().toISOString().split('T')[0] }).eq('id', id)
  if (error) { logger.error('Failed to end reporting line', { error: error.message }); return false }
  return true
}

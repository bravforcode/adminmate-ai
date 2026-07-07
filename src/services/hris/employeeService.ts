import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Employee Service
   Central HR employment record management.
   ============================================================ */

export type EmploymentStatus = 'draft' | 'active' | 'on_leave' | 'suspended' | 'offboarding' | 'terminated' | 'inactive'
export type EmploymentType = 'full_time' | 'part_time' | 'contractor' | 'intern' | 'remote' | 'seasonal' | 'gig'

export interface Employee {
  id: string
  company_id: string
  user_profile_id?: string
  candidate_id?: string
  application_id?: string
  legal_entity_id?: string
  business_unit_id?: string
  cost_center_id?: string
  location_id?: string
  department_id?: string
  team_id?: string
  manager_employee_id?: string
  employee_number: string
  employment_status: EmploymentStatus
  employment_type: EmploymentType
  hire_date: string
  start_date: string
  end_date?: string
  probation_end_date?: string
  job_title: string
  position_level?: string
  work_email?: string
  personal_email?: string
  phone?: string
  emergency_contact_name?: string
  emergency_contact_phone?: string
  preferred_language?: string
  country_code: string
  timezone: string
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Create a new employee record.
 * Validates employee_number uniqueness per company.
 */
export async function createEmployee(
  companyId: string,
  input: Omit<Employee, 'id' | 'company_id' | 'created_at' | 'updated_at'>,
  createdBy: string
): Promise<Employee> {
  // Check employee_number uniqueness
  const { data: existing } = await supabase
    .from('employees')
    .select('id')
    .eq('company_id', companyId)
    .eq('employee_number', input.employee_number)
    .maybeSingle()
  if (existing) throw new Error(`Employee number "${input.employee_number}" already exists in this company`)

  const { data, error } = await supabase
    .from('employees')
    .insert({ ...input, company_id: companyId, created_by: createdBy })
    .select()
    .single()
  if (error) throw error

  // Create timeline event
  await supabase.from('employee_timeline_events').insert({
    company_id: companyId,
    employee_id: data.id,
    event_type: 'hired',
    title: `Employee hired: ${input.job_title}`,
    effective_date: input.hire_date,
    created_by: createdBy,
  })

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: createdBy,
    action: 'employee.created',
    resource_type: 'employee',
    resource_id: data.id,
    details: JSON.stringify({ employee_number: input.employee_number, job_title: input.job_title }),
  })

  return data as unknown as Employee
}

/**
 * Create employee from hired candidate via onboarding.
 */
export async function createEmployeeFromOnboarding(
  companyId: string,
  onboardingInstanceId: string,
  createdBy: string
): Promise<Employee> {
  // Fetch onboarding instance with candidate data
  const { data: instance } = await supabase
    .from('onboarding_instances')
    .select('*, candidates(*)')
    .eq('id', onboardingInstanceId)
    .single()
  if (!instance) throw new Error('Onboarding instance not found')

  // Generate employee number using a PostgreSQL sequence to prevent race conditions
  const { data: seqData, error: seqError } = await supabase.rpc('nextval', { seq_name: 'emp_num_seq' })
  let empNum: string
  if (seqError) {
    // Fallback: if sequence doesn't exist yet, use COUNT + 1 (less safe but functional)
    const { count } = await supabase
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
    empNum = `EMP${String((count ?? 0) + 1).padStart(5, '0')}`
  } else {
    empNum = `EMP${String(seqData).padStart(5, '0')}`
  }

  const candidate = instance.candidates

  const employee = await createEmployee(companyId, {
    candidate_id: instance.candidate_id,
    application_id: instance.application_id,
    employee_number: empNum,
    employment_status: 'active',
    employment_type: 'full_time',
    hire_date: new Date().toISOString().split('T')[0],
    start_date: new Date().toISOString().split('T')[0],
    job_title: 'Employee',
    personal_email: candidate?.email,
    phone: candidate?.phone,
    preferred_language: candidate?.preferred_language || 'en',
    country_code: 'TH',
    timezone: 'Asia/Bangkok',
  }, createdBy)

  // Create profile
  await supabase.from('employee_profiles').insert({
    company_id: companyId,
    employee_id: employee.id,
    display_name: candidate?.full_name || 'New Employee',
    first_name: candidate?.full_name?.split(' ')[0],
    last_name: candidate?.full_name?.split(' ').slice(1).join(' '),
  })

  // Timeline event
  await supabase.from('employee_timeline_events').insert({
    company_id: companyId,
    employee_id: employee.id,
    event_type: 'onboarded',
    title: 'Completed onboarding',
    created_by: createdBy,
  })

  return employee
}

export async function getEmployee(id: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, company_id, user_profile_id, candidate_id, application_id, legal_entity_id, business_unit_id, cost_center_id, location_id, department_id, team_id, manager_employee_id, employee_number, employment_status, employment_type, hire_date, start_date, end_date, probation_end_date, job_title, position_level, work_email, personal_email, phone, emergency_contact_name, emergency_contact_phone, preferred_language, country_code, timezone, created_by, created_at, updated_at, employee_profiles(*), user_profiles!employees_user_profile_id_fkey(full_name, email, avatar_url)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as Employee | null
}

export async function listEmployees(
  companyId: string,
  filters?: { status?: string; type?: string; department?: string; search?: string }
): Promise<Employee[]> {
  let query = supabase
    .from('employees')
    .select('id, company_id, user_profile_id, employee_number, employment_status, employment_type, hire_date, start_date, job_title, work_email, personal_email, phone, created_at, updated_at, employee_profiles(display_name, first_name, last_name)')
    .eq('company_id', companyId)
    .order('employee_number')

  if (filters?.status) query = query.eq('employment_status', filters.status)
  if (filters?.type) query = query.eq('employment_type', filters.type)
  if (filters?.search) {
    query = query.or(`job_title.ilike.%${filters.search}%,employee_number.ilike.%${filters.search}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Employee[]
}

export async function updateEmployee(
  id: string,
  updates: Partial<Employee>
): Promise<Employee> {
  const canWrite = await hasPermission('employee', 'write')
  if (!canWrite) throw new Error('Requires employee_write permission')

  const { data, error } = await supabase
    .from('employees')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as Employee
}

export async function updateEmploymentStatus(
  id: string,
  status: EmploymentStatus,
  updatedBy: string,
  reason?: string
): Promise<void> {
  const { data: emp } = await supabase.from('employees').select('company_id, employment_status').eq('id', id).single()
  if (!emp) throw new Error('Employee not found')

  // Employment status state machine — enforce valid transitions
  const VALID_TRANSITIONS: Record<string, string[]> = {
    draft: ['active'],
    active: ['on_leave', 'suspended', 'offboarding'],
    on_leave: ['active', 'offboarding'],
    suspended: ['active', 'offboarding'],
    offboarding: ['terminated', 'active'],
    terminated: ['active'], // rehire
    inactive: ['active'],
  }
  const currentStatus = emp.employment_status
  const allowedNext = VALID_TRANSITIONS[currentStatus]
  if (!allowedNext || !allowedNext.includes(status)) {
    throw new Error(
      `Invalid employment status transition: ${currentStatus} → ${status}. ` +
      `Allowed transitions from "${currentStatus}": ${allowedNext?.join(', ') || 'none'}`
    )
  }

  await supabase.from('employees').update({
    employment_status: status,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  await supabase.from('employee_timeline_events').insert({
    company_id: emp.company_id,
    employee_id: id,
    event_type: status === 'terminated' ? 'terminated' : 'profile_updated',
    title: `Employment status changed to ${status}`,
    description: reason,
    created_by: updatedBy,
  })

  await supabase.from('audit_logs').insert({
    company_id: emp.company_id,
    user_id: updatedBy,
    action: 'employee.status_changed',
    resource_type: 'employee',
    resource_id: id,
    details: JSON.stringify({ from: emp.employment_status, to: status, reason }),
  })
}

export async function assignManager(
  employeeId: string,
  managerEmployeeId: string | null,
  assignedBy: string
): Promise<void> {
  const { data: emp } = await supabase.from('employees').select('company_id, manager_employee_id').eq('id', employeeId).single()
  if (!emp) throw new Error('Employee not found')

  // Prevent circular reference
  if (managerEmployeeId && managerEmployeeId === employeeId) {
    throw new Error('Cannot assign employee as their own manager')
  }

  // Prevent circular manager chain: walk the proposed manager's chain upward
  // to ensure assigning this manager wouldn't create a cycle (A→B→C→A).
  if (managerEmployeeId) {
    const visited = new Set<string>([managerEmployeeId])
    let currentManagerId: string | null = managerEmployeeId
    while (currentManagerId) {
      const mgrResult: { data: { manager_employee_id?: string | null } | null } = await supabase
        .from('employees')
        .select('manager_employee_id')
        .eq('id', currentManagerId)
        .single()
      const nextId: string | null = mgrResult.data?.manager_employee_id ?? null
      if (!nextId) break
      if (nextId === employeeId) {
        throw new Error('Circular manager chain detected: assigning this manager would create a cycle')
      }
      if (visited.has(nextId)) {
        throw new Error('Circular manager chain detected: cycle found in manager hierarchy')
      }
      visited.add(nextId)
      currentManagerId = nextId
    }
  }

  await supabase.from('employees').update({
    manager_employee_id: managerEmployeeId,
    updated_at: new Date().toISOString(),
  }).eq('id', employeeId)

  await supabase.from('employee_timeline_events').insert({
    company_id: emp.company_id,
    employee_id: employeeId,
    event_type: 'manager_changed',
    title: 'Manager assignment updated',
    created_by: assignedBy,
  })
}

export async function getDirectReports(managerEmployeeId: string): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*, employee_profiles(display_name)')
    .eq('manager_employee_id', managerEmployeeId)
    .order('employee_number')
  if (error) throw error
  return (data ?? []) as unknown as Employee[]
}

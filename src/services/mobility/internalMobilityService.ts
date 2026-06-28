import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import { hasPermission } from '../permissionService'

/* ============================================================
   Internal Mobility Service
   Internal job board, applications, preferences, transfers.
   ============================================================ */

export type InternalJobStatus = 'open' | 'closed' | 'filled'
export type InternalApplicationStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
export type TransferStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface InternalJob {
  id: string
  company_id: string
  title: string
  description?: string
  department_id?: string
  location_id?: string
  employment_type: string
  status: InternalJobStatus
  created_by: string
  created_at: string
  updated_at: string
}

export interface InternalApplication {
  id: string
  company_id: string
  job_id: string
  employee_id: string
  status: InternalApplicationStatus
  cover_letter?: string
  manager_notified: boolean
  created_at: string
  updated_at: string
}

export interface MobilityPreferences {
  id: string
  company_id: string
  employee_id: string
  preferred_departments: string[]
  preferred_locations: string[]
  open_to_remote: boolean
  is_visible: boolean
  created_at: string
  updated_at: string
}

export interface TransferRequest {
  id: string
  company_id: string
  application_id: string
  employee_id: string
  from_manager_id?: string
  to_manager_id?: string
  effective_date?: string
  status: TransferStatus
  reason?: string
  approved_by?: string
  approved_at?: string
  created_at: string
  updated_at: string
}

export interface CreateInternalJobInput {
  company_id: string
  title: string
  description?: string
  department_id?: string
  location_id?: string
  employment_type?: string
}

export async function createInternalJob(
  input: CreateInternalJobInput,
  createdBy: string
): Promise<InternalJob> {
  const allowed = await hasPermission('internal_mobility', 'write')
  if (!allowed) throw new Error('Permission denied: internal_mobility:write')

  const { data, error } = await supabase
    .from('internal_jobs')
    .insert({
      company_id: input.company_id,
      title: input.title,
      description: input.description || null,
      department_id: input.department_id || null,
      location_id: input.location_id || null,
      employment_type: input.employment_type || 'full_time',
      status: 'open',
      created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: input.company_id,
    user_id: createdBy,
    action: 'internal_job.created',
    resource_type: 'internal_job',
    resource_id: data.id,
    details: JSON.stringify({ title: input.title }),
  })

  return data as unknown as InternalJob
}

export async function applyToInternalJob(
  employeeId: string,
  jobId: string,
  coverLetter?: string
): Promise<InternalApplication> {
  const job = await supabase
    .from('internal_jobs')
    .select('company_id, status')
    .eq('id', jobId)
    .single()
  if (job.error) throw job.error
  if (job.data.status !== 'open') throw new Error('Job is not open')

  const { data, error } = await supabase
    .from('internal_applications')
    .insert({
      company_id: job.data.company_id,
      job_id: jobId,
      employee_id: employeeId,
      status: 'submitted',
      cover_letter: coverLetter || null,
    })
    .select()
    .single()
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: job.data.company_id,
    user_id: employeeId,
    action: 'internal_application.submitted',
    resource_type: 'internal_application',
    resource_id: data.id,
    details: JSON.stringify({ job_id: jobId }),
  })

  return data as unknown as InternalApplication
}

export async function getVisibleJobs(_employeeId: string): Promise<InternalJob[]> {
  const { data, error } = await supabase
    .from('internal_jobs')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false })
  if (error) {
    logger.error('Failed to fetch internal jobs', { error: error.message })
    return []
  }
  return (data ?? []) as unknown as InternalJob[]
}

export async function approveTransfer(
  transferId: string,
  approvedBy: string
): Promise<TransferRequest> {
  const allowed = await hasPermission('internal_mobility', 'approve')
  if (!allowed) throw new Error('Permission denied: internal_mobility:approve')

  const existing = await supabase
    .from('internal_transfer_requests')
    .select('company_id, status')
    .eq('id', transferId)
    .single()
  if (existing.error) throw existing.error
  if (existing.data.status !== 'pending') throw new Error('Transfer is not pending')

  const { data, error } = await supabase
    .from('internal_transfer_requests')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', transferId)
    .select()
    .single()
  if (error) throw error

  await supabase.from('audit_logs').insert({
    company_id: existing.data.company_id,
    user_id: approvedBy,
    action: 'internal_transfer.approved',
    resource_type: 'internal_transfer_request',
    resource_id: transferId,
  })

  return data as unknown as TransferRequest
}

export async function getEmployeeMobilityPreferences(
  employeeId: string
): Promise<MobilityPreferences | null> {
  const { data, error } = await supabase
    .from('internal_mobility_preferences')
    .select('*')
    .eq('employee_id', employeeId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as unknown as MobilityPreferences
}

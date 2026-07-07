import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Global Multi-Region, Data Residency, DR/BCP Service
   Region changes require approval. Backup jobs are audited.
   Restore drills are recorded with duration.
   ============================================================ */

export type BackupType = 'full' | 'incremental' | 'snapshot'
export type BackupStatus = 'pending' | 'running' | 'completed' | 'failed'
export type RestoreTestStatus = 'pending' | 'running' | 'completed' | 'failed'
export type DRPlanStatus = 'draft' | 'active' | 'archived'

export interface DataResidencyPolicy {
  id: string
  company_id: string
  region: string
  data_types: string[]
  is_active: boolean
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
}

export interface BackupJob {
  id: string
  company_id: string
  backup_type: BackupType
  status: BackupStatus
  started_at: string | null
  completed_at: string | null
  size_bytes: number | null
  error_message: string | null
  created_at: string
}

export interface RestoreTestRun {
  id: string
  company_id: string
  backup_job_id: string
  status: RestoreTestStatus
  started_at: string | null
  completed_at: string | null
  duration_seconds: number | null
  notes: string | null
  created_by: string
  created_at: string
}

export interface DisasterRecoveryPlan {
  id: string
  company_id: string
  plan_name: string
  rpo_hours: number
  rto_hours: number
  last_tested_at: string | null
  next_test_due: string | null
  status: DRPlanStatus
  created_by: string
  created_at: string
  updated_at: string
}

// ============================================================
// Audit log helper
// ============================================================
async function logDrAudit(
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>
) {
  await supabase.from('audit_logs').insert({
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ?? {},
  })
}

// ============================================================
// Data Residency Policy
// ============================================================

export async function getDataResidencyPolicy(
  companyId: string
): Promise<DataResidencyPolicy[]> {
  if (!(await hasPermission('dr', 'read'))) {
    throw new Error('Permission denied: dr.read')
  }

  const { data, error } = await supabase
    .from('data_residency_policies')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as DataResidencyPolicy[]
}

export async function updateDataResidencyPolicy(
  companyId: string,
  input: {
    region: string
    data_types: string[]
    is_active?: boolean
  },
  approvedBy: string
): Promise<DataResidencyPolicy> {
  if (!(await hasPermission('dr', 'write'))) {
    throw new Error('Permission denied: dr.write')
  }

  // Region change requires approval — approvedBy must be provided
  if (!approvedBy || approvedBy.trim() === '') {
    throw new Error('Region change requires approval: approvedBy is mandatory')
  }

  const { data: existing } = await supabase
    .from('data_residency_policies')
    .select('region')
    .eq('company_id', companyId)
    .eq('region', input.region)
    .single()

  let result: DataResidencyPolicy

  if (existing) {
    const { data, error } = await supabase
      .from('data_residency_policies')
      .update({
        data_types: input.data_types,
        is_active: input.is_active ?? true,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('company_id', companyId)
      .eq('region', input.region)
      .select()
      .single()

    if (error) throw error
    result = data as DataResidencyPolicy
  } else {
    const { data, error } = await supabase
      .from('data_residency_policies')
      .insert({
        company_id: companyId,
        region: input.region,
        data_types: input.data_types,
        is_active: input.is_active ?? true,
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    result = data as DataResidencyPolicy
  }

  await logDrAudit('data_residency_updated', 'data_residency_policy', result.id, {
    region: input.region,
    data_types: input.data_types,
    approved_by: approvedBy,
  })

  return result
}

// ============================================================
// Backup Jobs
// ============================================================

export async function createBackupJob(
  companyId: string,
  backupType: BackupType
): Promise<BackupJob> {
  if (!(await hasPermission('dr', 'write'))) {
    throw new Error('Permission denied: dr.write')
  }

  const { data, error } = await supabase
    .from('backup_jobs')
    .insert({
      company_id: companyId,
      backup_type: backupType,
      status: 'pending',
    })
    .select()
    .single()

  if (error) throw error

  await logDrAudit('backup_job_created', 'backup_job', data.id, {
    backup_type: backupType,
    status: 'pending',
  })

  return data as BackupJob
}

// ============================================================
// Restore Test Runs
// ============================================================

export async function runRestoreTest(
  companyId: string,
  backupJobId: string,
  createdBy: string
): Promise<RestoreTestRun> {
  if (!(await hasPermission('dr', 'write'))) {
    throw new Error('Permission denied: dr.write')
  }

  const { data, error } = await supabase
    .from('restore_test_runs')
    .insert({
      company_id: companyId,
      backup_job_id: backupJobId,
      status: 'pending',
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) throw error

  await logDrAudit('restore_test_created', 'restore_test_run', data.id, {
    backup_job_id: backupJobId,
    created_by: createdBy,
  })

  return data as RestoreTestRun
}

// ============================================================
// Disaster Recovery Plan
// ============================================================

export async function getDRPlan(
  companyId: string
): Promise<DisasterRecoveryPlan[]> {
  if (!(await hasPermission('dr', 'read'))) {
    throw new Error('Permission denied: dr.read')
  }

  const { data, error } = await supabase
    .from('disaster_recovery_plans')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as DisasterRecoveryPlan[]
}

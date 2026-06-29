import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'
import { logger } from '../../lib/logger'

export interface ExportJob {
  id: string
  company_id: string
  entity_type: string
  filters: Record<string, unknown>
  status: string
  file_url: string | null
  created_by: string
  created_at: string
  completed_at: string | null
}

const SENSITIVE_FIELDS = [
  'national_id', 'national_id_encrypted', 'passport_number',
  'ssn', 'tax_id', 'bank_account_number', 'bank_account_encrypted',
  'password_hash', 'mfa_secret', 'private_key_encrypted',
  'medical_conditions', 'health_data', 'disability',
]

function maskSensitiveFields(row: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...row }
  for (const field of SENSITIVE_FIELDS) {
    if (masked[field] !== undefined && masked[field] !== null) {
      const val = String(masked[field])
      masked[field] = val.length > 2
        ? val[0] + '*'.repeat(Math.max(val.length - 2, 0)) + val[val.length - 1]
        : '***'
    }
  }
  return masked
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    const values = headers.map(h => {
      const v = row[h]
      const str = v === null || v === undefined ? '' : String(v)
      return `"${str.replace(/"/g, '""')}"`
    })
    lines.push(values.join(','))
  }
  return lines.join('\n')
}

export const exportService = {
  async createExportJob(
    companyId: string,
    entityType: string,
    filters: Record<string, unknown>,
    createdBy: string
  ): Promise<ExportJob> {
    const allowed = await hasPermission('import_export', 'write')
    if (!allowed) throw new Error('Permission denied: import_export_write required')

    const { data, error } = await supabase
      .from('export_jobs')
      .insert({
        company_id: companyId,
        entity_type: entityType,
        filters,
        status: 'pending',
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) throw error
    return data as ExportJob
  },

  async executeExport(jobId: string): Promise<ExportJob> {
    const allowed = await hasPermission('import_export', 'write')
    if (!allowed) throw new Error('Permission denied: import_export_write required')

    const { data: job, error: jobError } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) throw new Error('Export job not found')

    await supabase
      .from('export_jobs')
      .update({ status: 'generating' })
      .eq('id', jobId)

    const ALLOWED_TABLES = new Set(['candidates', 'jobs', 'employees'])
    if (!ALLOWED_TABLES.has(job.entity_type)) {
      throw new Error(`Export not allowed for entity type: ${job.entity_type}`)
    }
    const tableName = job.entity_type

    let query = supabase.from(tableName).select('*').eq('company_id', job.company_id)

    const filters = (job.filters as Record<string, unknown>) ?? {}
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
          const range = value as { min?: unknown; max?: unknown }
          if (range.min !== undefined && range.min !== null) {
            query = query.gte(key, range.min)
          }
          if (range.max !== undefined && range.max !== null) {
            query = query.lte(key, range.max)
          }
        } else {
          query = query.eq(key, value)
        }
      }
    }

    const { data: rows, error: fetchError } = await query

    if (fetchError) {
      await supabase
        .from('export_jobs')
        .update({ status: 'failed' })
        .eq('id', jobId)
      throw fetchError
    }

    const masked = (rows ?? []).map(maskSensitiveFields)
    const csv = toCSV(masked)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    await supabase
      .from('export_jobs')
      .update({
        status: 'completed',
        file_url: url,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return {
      ...job,
      status: 'completed',
      file_url: url,
      completed_at: new Date().toISOString(),
    }
  },

  async getExportJob(jobId: string): Promise<ExportJob | null> {
    const { data, error } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      logger.error('Failed to fetch export job', { error: error.message })
      return null
    }
    return data as ExportJob
  },

  async getCompanyExports(companyId: string, limit = 20): Promise<ExportJob[]> {
    const { data, error } = await supabase
      .from('export_jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return (data ?? []) as ExportJob[]
  },

  maskSensitiveFields,
  toCSV,
}

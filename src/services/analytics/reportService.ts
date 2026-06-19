import { supabase } from '../../lib/supabase'

export interface ReportDefinition {
  id: string
  company_id: string
  report_key: string
  name: string
  description: string | null
  query_config: Record<string, unknown>
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DashboardLayout {
  id: string
  company_id: string
  user_id: string
  name: string
  layout_config: Record<string, unknown>
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface ScheduledReport {
  id: string
  company_id: string
  report_def_id: string
  schedule_config: Record<string, unknown>
  recipients: string[]
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  created_at: string
  updated_at: string
}

export interface ReportExport {
  id: string
  company_id: string
  report_def_id: string
  format: 'csv' | 'pdf' | 'xlsx'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  file_url: string | null
  created_by: string
  created_at: string
  completed_at: string | null
}

export interface ScheduleReportInput {
  report_def_id: string
  schedule_config: Record<string, unknown>
  recipients: string[]
}

const SENSITIVE_FIELDS = [
  'email', 'phone', 'address', 'national_id', 'passport_number',
  'bank_account', 'salary', 'date_of_birth', 'social_security_number',
]

function maskSensitiveData(row: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = { ...row }
  for (const field of SENSITIVE_FIELDS) {
    if (field in masked && masked[field] != null) {
      const val = String(masked[field])
      masked[field] = val.length > 4
        ? '*'.repeat(val.length - 4) + val.slice(-4)
        : '****'
    }
  }
  return masked
}

function maskRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map(maskSensitiveData)
}

export const reportService = {
  getReportDefinitions: async (companyId: string): Promise<ReportDefinition[]> => {
    const { data, error } = await supabase
      .from('report_definitions')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return (data ?? []) as ReportDefinition[]
  },

  generateReport: async (
    reportDefId: string,
    companyId: string,
    filters?: Record<string, unknown>,
  ): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> => {
    const { data: def, error: defError } = await supabase
      .from('report_definitions')
      .select('query_config')
      .eq('id', reportDefId)
      .eq('company_id', companyId)
      .single()
    if (defError) throw defError

    const config = def.query_config as { table?: string; columns?: string[] }
    const table = config.table ?? 'audit_logs'
    const columns = config.columns ?? ['*']

    let query = supabase
      .from(table)
      .select(columns.join(', '))
      .eq('company_id', companyId)

    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value)
        }
      }
    }

    const { data, error } = await query.limit(1000)
    if (error) throw error

    const rows = maskRows((data ?? []) as unknown as Record<string, unknown>[])
    const cols = columns[0] === '*'
      ? (rows.length > 0 ? Object.keys(rows[0]) : [])
      : columns

    return { columns: cols, rows }
  },

  exportReport: async (
    reportDefId: string,
    companyId: string,
    format: 'csv' | 'pdf' | 'xlsx',
    createdBy: string,
  ): Promise<ReportExport> => {
    const { data, error } = await supabase
      .from('report_exports')
      .insert({
        report_def_id: reportDefId,
        company_id: companyId,
        format,
        status: 'pending',
        created_by: createdBy,
      })
      .select()
      .single()
    if (error) throw error
    return data as ReportExport
  },

  scheduleReport: async (
    companyId: string,
    input: ScheduleReportInput,
  ): Promise<ScheduledReport> => {
    const { data, error } = await supabase
      .from('scheduled_reports')
      .insert({
        company_id: companyId,
        report_def_id: input.report_def_id,
        schedule_config: input.schedule_config,
        recipients: input.recipients,
        is_active: true,
      })
      .select()
      .single()
    if (error) throw error
    return data as ScheduledReport
  },

  maskSensitiveData,
  maskRows,
}

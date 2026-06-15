import { supabase } from '../lib/supabase'
import type { ReportType } from '../utils/reportGenerator'
import { reportGenerators } from '../utils/reportGenerator'

export type ReportFrequency = 'daily' | 'weekly' | 'monthly'

export interface ReportSchedule {
  id: string
  company_id: string
  created_by: string
  report_type: ReportType
  frequency: ReportFrequency
  recipients: string[]
  is_enabled: boolean
  last_run_at: string | null
  next_run_at: string
  created_at: string
  updated_at: string
}

export interface GeneratedReport {
  id: string
  company_id: string
  schedule_id: string | null
  report_type: ReportType
  title: string
  content: string
  format: 'html' | 'csv' | 'pdf'
  date_from: string | null
  date_to: string | null
  generated_by: string | null
  created_at: string
}

function computeNextRun(frequency: ReportFrequency): string {
  const now = new Date()
  if (frequency === 'daily') {
    now.setDate(now.getDate() + 1)
    now.setHours(8, 0, 0, 0)
  } else if (frequency === 'weekly') {
    now.setDate(now.getDate() + (7 - now.getDay() + 1) % 7 || 7)
    now.setHours(8, 0, 0, 0)
  } else {
    now.setMonth(now.getMonth() + 1, 1)
    now.setHours(8, 0, 0, 0)
  }
  return now.toISOString()
}

function getDefaultDateRange(): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  return { start, end }
}

export const reportService = {
  getSchedules: async (companyId: string): Promise<ReportSchedule[]> => {
    const { data, error } = await supabase
      .from('report_schedules')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []) as ReportSchedule[]
  },

  createSchedule: async (companyId: string, createdBy: string, reportType: ReportType, frequency: ReportFrequency, recipients: string[]): Promise<ReportSchedule> => {
    const nextRun = computeNextRun(frequency)
    const { data, error } = await supabase
      .from('report_schedules')
      .insert({
        company_id: companyId,
        created_by: createdBy,
        report_type: reportType,
        frequency,
        recipients,
        is_enabled: true,
        next_run_at: nextRun,
      })
      .select()
      .single()
    if (error) throw error
    return data as ReportSchedule
  },

  updateSchedule: async (id: string, updates: Partial<Pick<ReportSchedule, 'frequency' | 'recipients' | 'is_enabled' | 'report_type'>>): Promise<ReportSchedule> => {
    const patch: Record<string, unknown> = { ...updates, updated_at: new Date().toISOString() }
    if (updates.frequency) {
      patch.next_run_at = computeNextRun(updates.frequency)
    }
    const { data, error } = await supabase
      .from('report_schedules')
      .update(patch)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as ReportSchedule
  },

  deleteSchedule: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('report_schedules')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  generateReport: async (companyId: string, reportType: ReportType, dateRange?: { start: string; end: string }, userId?: string, scheduleId?: string): Promise<GeneratedReport> => {
    const range = dateRange || getDefaultDateRange()
    const generator = reportGenerators[reportType]
    const { html, title } = await generator(companyId, range)

    const { data, error } = await supabase
      .from('generated_reports')
      .insert({
        company_id: companyId,
        schedule_id: scheduleId || null,
        report_type: reportType,
        title,
        content: html,
        format: 'html',
        date_from: range.start,
        date_to: range.end,
        generated_by: userId || null,
      })
      .select()
      .single()
    if (error) throw error
    return data as GeneratedReport
  },

  getGeneratedReports: async (companyId: string, limit = 20): Promise<GeneratedReport[]> => {
    const { data, error } = await supabase
      .from('generated_reports')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data || []) as GeneratedReport[]
  },

  downloadReport: (report: GeneratedReport, format: 'html' | 'csv' = 'html'): void => {
    let blob: Blob
    let ext: string

    if (format === 'csv') {
      const rows = report.content.match(/<tr[^>]*>(.*?)<\/tr>/gs) || []
      const csvRows = rows.map(row => {
        const cells = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gs) || []
        return cells.map(c => c.replace(/<[^>]+>/g, '').trim()).join(',')
      })
      blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
      ext = 'csv'
    } else {
      blob = new Blob([report.content], { type: 'text/html' })
      ext = 'html'
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${report.title.toLowerCase().replace(/\s+/g, '-')}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  },
}

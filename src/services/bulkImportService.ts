import { supabase } from '../lib/supabase'
import { hasPermission } from './permissionService'

export interface ImportError {
  row: number
  field: string
  message: string
}

export interface ImportResult {
  success: number
  errors: ImportError[]
}

const CANDIDATE_FIELDS = ['full_name', 'email', 'phone', 'location', 'current_position', 'source', 'years_experience']
const JOB_FIELDS = ['title', 'department', 'location', 'employment_type', 'status', 'salary_min', 'salary_max', 'headcount']

function mapRow(row: Record<string, string>, allowedFields: string[]): Record<string, unknown> {
  const mapped: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (row[key] !== undefined && row[key] !== '') {
      if (['years_experience', 'salary_min', 'salary_max', 'headcount'].includes(key)) {
        const num = Number(row[key])
        mapped[key] = isNaN(num) ? null : num
      } else {
        mapped[key] = row[key]
      }
    }
  }
  return mapped
}

function validateRows(data: Record<string, string>[], type: 'candidates' | 'jobs'): ImportError[] {
  const errors: ImportError[] = []
  const requiredFields = type === 'candidates'
    ? ['full_name', 'email']
    : ['title', 'department']

  data.forEach((row, idx) => {
    const rowNum = idx + 2
    for (const field of requiredFields) {
      if (!row[field]?.trim()) {
        errors.push({ row: rowNum, field, message: `${field} is required` })
      }
    }
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push({ row: rowNum, field: 'email', message: 'Invalid email format' })
    }
  })

  return errors
}

export const bulkImportService = {
  validateImportData(data: Record<string, string>[], type: 'candidates' | 'jobs'): ImportError[] {
    return validateRows(data, type)
  },

  async importCandidates(csvData: Record<string, string>[], companyId: string): Promise<ImportResult> {
    const allowed = await hasPermission('import_export', 'write')
    if (!allowed) throw new Error('Requires import_export_write permission')

    const errors = validateRows(csvData, 'candidates')
    if (errors.length > 0) return { success: 0, errors }

    let success = 0
    const batchErrors: ImportError[] = []

    for (let i = 0; i < csvData.length; i++) {
      try {
        const mapped = mapRow(csvData[i], CANDIDATE_FIELDS)
        mapped.company_id = companyId

        const { error } = await supabase.from('candidates').insert(mapped)
        if (error) {
          batchErrors.push({ row: i + 2, field: 'database', message: error.message })
        } else {
          success++
        }
      } catch {
        batchErrors.push({ row: i + 2, field: 'database', message: 'Unexpected error' })
      }
    }

    return { success, errors: batchErrors }
  },

  async importJobs(csvData: Record<string, string>[], companyId: string): Promise<ImportResult> {
    const allowed = await hasPermission('import_export', 'write')
    if (!allowed) throw new Error('Requires import_export_write permission')

    const errors = validateRows(csvData, 'jobs')
    if (errors.length > 0) return { success: 0, errors }

    let success = 0
    const batchErrors: ImportError[] = []

    for (let i = 0; i < csvData.length; i++) {
      try {
        const mapped = mapRow(csvData[i], JOB_FIELDS)
        mapped.company_id = companyId

        if (mapped.skills_required && typeof mapped.skills_required === 'string') {
          mapped.skills_required = (mapped.skills_required as string).split(',').map((s: string) => s.trim()).filter(Boolean)
        }

        const { error } = await supabase.from('jobs').insert(mapped)
        if (error) {
          batchErrors.push({ row: i + 2, field: 'database', message: error.message })
        } else {
          success++
        }
      } catch {
        batchErrors.push({ row: i + 2, field: 'database', message: 'Unexpected error' })
      }
    }

    return { success, errors: batchErrors }
  },
}

import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

export interface ImportJob {
  id: string
  company_id: string
  entity_type: string
  file_name: string
  status: string
  total_rows: number
  processed_rows: number
  error_rows: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface ColumnMapping {
  id: string
  import_job_id: string
  source_column: string
  target_field: string
  transform_rule: Record<string, unknown> | null
  created_at: string
}

export interface ImportError {
  id: string
  import_job_id: string
  row_number: number
  column_name: string | null
  error_message: string
  raw_value: string | null
  created_at: string
}

export interface ImportRowResult {
  id: string
  import_job_id: string
  row_number: number
  status: 'success' | 'error' | 'skipped'
  entity_id: string | null
  error_message: string | null
  created_at: string
}

export interface ValidationResult {
  valid: boolean
  errors: ImportError[]
  totalRows: number
  errorRows: number
}

export interface ImportExecutionResult {
  success: boolean
  dryRun: boolean
  totalRows: number
  processedRows: number
  errorRows: number
  errors: ImportError[]
}

const ENTITY_VALIDATORS: Record<string, (row: Record<string, unknown>, colMap: ColumnMapping[]) => ImportError[]> = {
  candidates: (row, colMap) => {
    const errors: ImportError[] = []
    const mapped: Record<string, unknown> = {}
    for (const m of colMap) {
      mapped[m.target_field] = row[m.source_column]
    }
    if (!mapped.full_name || String(mapped.full_name).trim() === '') {
      errors.push({ id: '', import_job_id: '', row_number: 0, column_name: 'full_name', error_message: 'full_name is required', raw_value: null, created_at: '' })
    }
    if (!mapped.email || String(mapped.email).trim() === '') {
      errors.push({ id: '', import_job_id: '', row_number: 0, column_name: 'email', error_message: 'email is required', raw_value: null, created_at: '' })
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(mapped.email))) {
      errors.push({ id: '', import_job_id: '', row_number: 0, column_name: 'email', error_message: 'Invalid email format', raw_value: String(mapped.email), created_at: '' })
    }
    return errors
  },
  jobs: (row, colMap) => {
    const errors: ImportError[] = []
    const mapped: Record<string, unknown> = {}
    for (const m of colMap) {
      mapped[m.target_field] = row[m.source_column]
    }
    if (!mapped.title || String(mapped.title).trim() === '') {
      errors.push({ id: '', import_job_id: '', row_number: 0, column_name: 'title', error_message: 'title is required', raw_value: null, created_at: '' })
    }
    if (!mapped.department || String(mapped.department).trim() === '') {
      errors.push({ id: '', import_job_id: '', row_number: 0, column_name: 'department', error_message: 'department is required', raw_value: null, created_at: '' })
    }
    return errors
  },
}

function applyTransform(value: unknown, rule: Record<string, unknown> | null): unknown {
  if (!rule || value === null || value === undefined) return value
  if (rule.type === 'trim') return String(value).trim()
  if (rule.type === 'lowercase') return String(value).toLowerCase()
  if (rule.type === 'uppercase') return String(value).toUpperCase()
  if (rule.type === 'to_number') {
    const n = Number(value)
    return isNaN(n) ? null : n
  }
  if (rule.type === 'default' && (value === '' || value === null || value === undefined)) {
    return rule.value ?? null
  }
  return value
}

export const importService = {
  async createImportJob(
    companyId: string,
    entityType: string,
    fileName: string,
    createdBy: string
  ): Promise<ImportJob> {
    const allowed = await hasPermission('import_export', 'write')
    if (!allowed) throw new Error('Permission denied: import_export_write required')

    const { data, error } = await supabase
      .from('import_jobs')
      .insert({
        company_id: companyId,
        entity_type: entityType,
        file_name: fileName,
        status: 'pending',
        total_rows: 0,
        processed_rows: 0,
        error_rows: 0,
        created_by: createdBy,
      })
      .select()
      .single()

    if (error) throw error
    return data as ImportJob
  },

  async mapColumns(jobId: string, mappings: Array<{ source_column: string; target_field: string; transform_rule?: Record<string, unknown> }>): Promise<ColumnMapping[]> {
    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('id, company_id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) throw new Error('Import job not found')

    const allowed = await hasPermission('import_export', 'write')
    if (!allowed) throw new Error('Permission denied: import_export_write required')

    await supabase.from('import_column_mappings').delete().eq('import_job_id', jobId)

    const inserts = mappings.map(m => ({
      import_job_id: jobId,
      source_column: m.source_column,
      target_field: m.target_field,
      transform_rule: m.transform_rule ?? null,
    }))

    const { data, error } = await supabase
      .from('import_column_mappings')
      .insert(inserts)
      .select()

    if (error) throw error

    await supabase
      .from('import_jobs')
      .update({ status: 'mapping', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    return data as ColumnMapping[]
  },

  async validateImport(jobId: string, rows: Record<string, unknown>[]): Promise<ValidationResult> {
    const allowed = await hasPermission('import_export', 'write')
    if (!allowed) throw new Error('Permission denied: import_export_write required')

    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('id, entity_type, company_id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) throw new Error('Import job not found')

    const { data: colMappings } = await supabase
      .from('import_column_mappings')
      .select('*')
      .eq('import_job_id', jobId)

    const mappings = (colMappings ?? []) as ColumnMapping[]

    await supabase.from('import_validation_errors').delete().eq('import_job_id', jobId)

    const allErrors: ImportError[] = []
    const validator = ENTITY_VALIDATORS[job.entity_type]

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2
      const row = rows[i]

      if (validator) {
        const rowErrors = validator(row, mappings)
        for (const e of rowErrors) {
          e.import_job_id = jobId
          e.row_number = rowNum
        }
        allErrors.push(...rowErrors)
      }

      for (const m of mappings) {
        const raw = row[m.source_column]
        if (raw !== undefined && raw !== null && raw !== '') {
          const transformed = applyTransform(raw, m.transform_rule)
          if (m.target_field === 'email' && transformed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(transformed))) {
            allErrors.push({
              id: '',
              import_job_id: jobId,
              row_number: rowNum,
              column_name: m.target_field,
              error_message: 'Invalid email format',
              raw_value: String(raw),
              created_at: '',
            })
          }
        }
      }
    }

    if (allErrors.length > 0) {
      await supabase.from('import_validation_errors').insert(
        allErrors.map(e => ({
          import_job_id: jobId,
          row_number: e.row_number,
          column_name: e.column_name,
          error_message: e.error_message,
          raw_value: e.raw_value,
        }))
      )
    }

    await supabase
      .from('import_jobs')
      .update({
        status: allErrors.length > 0 ? 'validating' : 'validating',
        total_rows: rows.length,
        error_rows: new Set(allErrors.map(e => e.row_number)).size,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
      totalRows: rows.length,
      errorRows: new Set(allErrors.map(e => e.row_number)).size,
    }
  },

  async executeImport(
    jobId: string,
    rows: Record<string, unknown>[],
    dryRun: boolean
  ): Promise<ImportExecutionResult> {
    const allowed = await hasPermission('import_export', 'write')
    if (!allowed) throw new Error('Permission denied: import_export_write required')

    const { data: job, error: jobError } = await supabase
      .from('import_jobs')
      .select('id, entity_type, company_id')
      .eq('id', jobId)
      .single()

    if (jobError || !job) throw new Error('Import job not found')

    const { data: colMappings } = await supabase
      .from('import_column_mappings')
      .select('*')
      .eq('import_job_id', jobId)

    const mappings = (colMappings ?? []) as ColumnMapping[]

    if (dryRun) {
      const validation = await this.validateImport(jobId, rows)
      await supabase
        .from('import_jobs')
        .update({
          status: 'pending',
          total_rows: validation.totalRows,
          error_rows: validation.errorRows,
          processed_rows: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      return {
        success: validation.valid,
        dryRun: true,
        totalRows: validation.totalRows,
        processedRows: 0,
        errorRows: validation.errorRows,
        errors: validation.errors,
      }
    }

    await supabase
      .from('import_jobs')
      .update({ status: 'importing', updated_at: new Date().toISOString() })
      .eq('id', jobId)

    let processedRows = 0
    let errorRows = 0
    const errors: ImportError[] = []

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2
      const row = rows[i]
      const mapped: Record<string, unknown> = { company_id: job.company_id }

      for (const m of mappings) {
        const raw = row[m.source_column]
        mapped[m.target_field] = applyTransform(raw, m.transform_rule)
      }

      const tableName = job.entity_type === 'candidates' ? 'candidates' :
        job.entity_type === 'jobs' ? 'jobs' :
        job.entity_type === 'employees' ? 'employees' :
        job.entity_type

      try {
        const { data: inserted, error: insertError } = await supabase
          .from(tableName)
          .insert(mapped)
          .select('id')
          .single()

        if (insertError) {
          errorRows++
          errors.push({
            id: '',
            import_job_id: jobId,
            row_number: rowNum,
            column_name: null,
            error_message: insertError.message,
            raw_value: null,
            created_at: '',
          })
          await supabase.from('import_row_results').insert({
            import_job_id: jobId,
            row_number: rowNum,
            status: 'error',
            error_message: insertError.message,
          })
        } else {
          processedRows++
          await supabase.from('import_row_results').insert({
            import_job_id: jobId,
            row_number: rowNum,
            status: 'success',
            entity_id: inserted?.id,
          })
        }
      } catch {
        errorRows++
        errors.push({
          id: '',
          import_job_id: jobId,
          row_number: rowNum,
          column_name: null,
          error_message: 'Unexpected error',
          raw_value: null,
          created_at: '',
        })
        await supabase.from('import_row_results').insert({
          import_job_id: jobId,
          row_number: rowNum,
          status: 'error',
          error_message: 'Unexpected error',
        })
      }
    }

    await supabase
      .from('import_jobs')
      .update({
        status: errorRows === rows.length ? 'failed' : 'completed',
        total_rows: rows.length,
        processed_rows: processedRows,
        error_rows: errorRows,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return {
      success: errorRows === 0,
      dryRun: false,
      totalRows: rows.length,
      processedRows,
      errorRows,
      errors,
    }
  },

  async getImportJob(jobId: string): Promise<ImportJob | null> {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) return null
    return data as ImportJob
  },

  async getImportErrors(jobId: string): Promise<ImportError[]> {
    const { data, error } = await supabase
      .from('import_validation_errors')
      .select('*')
      .eq('import_job_id', jobId)
      .order('row_number', { ascending: true })

    if (error) return []
    return (data ?? []) as ImportError[]
  },

  async getImportResults(jobId: string): Promise<ImportRowResult[]> {
    const { data, error } = await supabase
      .from('import_row_results')
      .select('*')
      .eq('import_job_id', jobId)
      .order('row_number', { ascending: true })

    if (error) return []
    return (data ?? []) as ImportRowResult[]
  },

  async getCompanyImports(companyId: string, limit = 20): Promise<ImportJob[]> {
    const { data, error } = await supabase
      .from('import_jobs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return []
    return (data ?? []) as ImportJob[]
  },
}

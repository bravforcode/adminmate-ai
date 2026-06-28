import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

/* ============================================================
   Statutory Filing Service
   Manages government filing periods, document generation,
   and filing records. Default is MANUAL file generation.
   Direct submission requires a configured provider.
   ============================================================ */

export type FilingPeriodStatus = 'open' | 'in_progress' | 'filed' | 'overdue' | 'closed'
export type FilingStatus = 'draft' | 'ready' | 'submitted' | 'acknowledged' | 'rejected' | 'cancelled'
export type FilingDocStatus = 'generated' | 'approved' | 'submitted' | 'superseded'

export interface StatutoryReportDefinition {
  id: string
  company_id: string
  report_key: string
  name: string
  country_code: string
  description: string | null
  frequency: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StatutoryFilingPeriod {
  id: string
  company_id: string
  report_def_id: string
  period_start: string
  period_end: string
  due_date: string
  status: FilingPeriodStatus
  created_at: string
  updated_at: string
}

export interface StatutoryFiling {
  id: string
  company_id: string
  period_id: string
  status: FilingStatus
  filed_at: string | null
  filed_by: string | null
  acknowledgement_number: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StatutoryFilingDocument {
  id: string
  company_id: string
  filing_id: string
  document_type: string
  document_id: string | null
  file_url: string | null
  status: FilingDocStatus
  created_at: string
  updated_at: string
}

export interface CreateFilingPeriodInput {
  report_def_id: string
  period_start: string
  period_end: string
  due_date: string
}

/**
 * Create a filing period for a statutory report definition.
 * Requires: statutory_filing_write permission.
 */
export async function createFilingPeriod(
  input: CreateFilingPeriodInput,
): Promise<StatutoryFilingPeriod> {
  const canWrite = await hasPermission('statutory_filing', 'write')
  if (!canWrite) throw new Error('Requires statutory_filing_write permission')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!profile?.company_id) throw new Error('No company associated with user')
  const companyId = profile.company_id

  // Validate report definition exists and is active
  const { data: reportDef } = await supabase
    .from('statutory_report_definitions')
    .select('id, is_active')
    .eq('id', input.report_def_id)
    .eq('company_id', companyId)
    .single()

  if (!reportDef) throw new Error('Statutory report definition not found')
  if (!reportDef.is_active) throw new Error('Report definition is inactive')

  // Validate dates
  if (input.period_end < input.period_start) {
    throw new Error('period_end must be >= period_start')
  }
  if (input.due_date < input.period_end) {
    throw new Error('due_date must be >= period_end')
  }

  const { data: period, error: periodErr } = await supabase
    .from('statutory_filing_periods')
    .insert({
      company_id: companyId,
      report_def_id: input.report_def_id,
      period_start: input.period_start,
      period_end: input.period_end,
      due_date: input.due_date,
      status: 'open',
    })
    .select()
    .single()

  if (periodErr || !period) {
    throw new Error(`Failed to create filing period: ${periodErr?.message}`)
  }

  return period as StatutoryFilingPeriod
}

/**
 * Generate a filing document for a period.
 * Creates a filing record and a generated document stub.
 * Requires: statutory_filing_write permission.
 *
 * CRITICAL: This generates the document locally.
 *           It does NOT submit to any government portal.
 */
export async function generateFilingDocument(
  periodId: string,
  companyId: string,
): Promise<StatutoryFiling> {
  const canWrite = await hasPermission('statutory_filing', 'write')
  if (!canWrite) throw new Error('Requires statutory_filing_write permission')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Validate period exists and belongs to company
  const { data: period } = await supabase
    .from('statutory_filing_periods')
    .select('id, status, report_def_id')
    .eq('id', periodId)
    .eq('company_id', companyId)
    .single()

  if (!period) throw new Error('Filing period not found')
  if (period.status === 'closed' || period.status === 'filed') {
    throw new Error('Cannot generate document for closed or filed period')
  }

  // Check for existing filing on this period
  const { data: existingFiling } = await supabase
    .from('statutory_filings')
    .select('id, status')
    .eq('period_id', periodId)
    .eq('company_id', companyId)
    .in('status', ['draft', 'ready'])
    .single()

  let filing: StatutoryFiling

  if (existingFiling) {
    filing = existingFiling as StatutoryFiling
  } else {
    // Create new filing record
    const { data: newFiling, error: filingErr } = await supabase
      .from('statutory_filings')
      .insert({
        company_id: companyId,
        period_id: periodId,
        status: 'draft',
        notes: `Auto-generated on ${new Date().toISOString().split('T')[0]}`,
      })
      .select()
      .single()

    if (filingErr || !newFiling) {
      throw new Error(`Failed to create filing: ${filingErr?.message}`)
    }
    filing = newFiling as StatutoryFiling
  }

  // Fetch report definition for document_type
  const { data: reportDef } = await supabase
    .from('statutory_report_definitions')
    .select('report_key, name')
    .eq('id', period.report_def_id)
    .single()

  // Create filing document stub (manual generation — no government submission)
  const { data: doc, error: docErr } = await supabase
    .from('statutory_filing_documents')
    .insert({
      company_id: companyId,
      filing_id: filing.id,
      document_type: reportDef?.report_key ?? 'unknown',
      document_id: null,
      file_url: null,
      status: 'generated',
    })
    .select()
    .single()

  if (docErr || !doc) {
    throw new Error(`Failed to create filing document: ${docErr?.message}`)
  }

  // Update period status
  await supabase
    .from('statutory_filing_periods')
    .update({ status: 'in_progress' })
    .eq('id', periodId)

  // Update filing status to ready
  await supabase
    .from('statutory_filings')
    .update({ status: 'ready' })
    .eq('id', filing.id)

  return { ...filing, status: 'ready' } as StatutoryFiling
}

/**
 * Mark a filing as submitted (manual or provider-driven).
 * If acknowledgement_number is provided, the filing is acknowledged.
 * Requires: statutory_filing_submit permission.
 *
 * CRITICAL: If filing is manual, acknowledge_number is provided by the user
 *           after they submit the document themselves to the government portal.
 */
export async function markFiled(
  filingId: string,
  filedBy: string,
  acknowledgementNumber?: string,
): Promise<StatutoryFiling> {
  const canSubmit = await hasPermission('statutory_filing', 'submit')
  if (!canSubmit) throw new Error('Requires statutory_filing_submit permission')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Validate filing exists
  const { data: filing } = await supabase
    .from('statutory_filings')
    .select('id, status, company_id')
    .eq('id', filingId)
    .single()

  if (!filing) throw new Error('Filing not found')

  // Only draft or ready filings can be marked as filed
  if (!['draft', 'ready'].includes(filing.status)) {
    throw new Error(`Cannot mark filing with status '${filing.status}' as filed`)
  }

  const newStatus: FilingStatus = acknowledgementNumber ? 'acknowledged' : 'submitted'

  const { data: updated, error: updateErr } = await supabase
    .from('statutory_filings')
    .update({
      status: newStatus,
      filed_at: new Date().toISOString(),
      filed_by: filedBy,
      acknowledgement_number: acknowledgementNumber ?? null,
    })
    .eq('id', filingId)
    .select()
    .single()

  if (updateErr || !updated) {
    throw new Error(`Failed to mark filing as filed: ${updateErr?.message}`)
  }

  // If acknowledged, also update the period status
  if (acknowledgementNumber) {
    await supabase
      .from('statutory_filing_periods')
      .update({ status: 'filed' })
      .eq('id', updated.period_id)
  }

  return updated as StatutoryFiling
}

/**
 * Get filings with optional filters.
 * Requires: statutory_filing_read permission.
 */
export async function getFilings(
  companyId: string,
  filters?: {
    period_id?: string
    status?: FilingStatus
    report_key?: string
  },
): Promise<(StatutoryFiling & { period?: StatutoryFilingPeriod; report_def?: StatutoryReportDefinition })[]> {
  const canRead = await hasPermission('statutory_filing', 'read')
  if (!canRead) throw new Error('Requires statutory_filing_read permission')

  let query = supabase
    .from('statutory_filings')
    .select(`
      *,
      statutory_filing_periods!inner (
        id, period_start, period_end, due_date, status,
        statutory_report_definitions!inner (
          id, report_key, name, country_code, frequency
        )
      )
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (filters?.period_id) {
    query = query.eq('period_id', filters.period_id)
  }
  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch filings: ${error.message}`)

  let results = data ?? []

  // Filter by report_key if specified (post-query since it's nested)
  if (filters?.report_key) {
    results = results.filter(
      (r: StatutoryFiling & { statutory_filing_periods?: StatutoryFilingPeriod & { statutory_report_definitions?: StatutoryReportDefinition } }) =>
        r.statutory_filing_periods?.statutory_report_definitions?.report_key === filters.report_key
    )
  }

  return results as unknown as (StatutoryFiling & { period?: StatutoryFilingPeriod; report_def?: StatutoryReportDefinition })[]
}

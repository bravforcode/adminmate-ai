import { supabase } from '../../lib/supabase'
import { renderContractTemplate } from './contractTemplateService'

/* ============================================================
   Generated Contract Service
   Creates contracts from templates, manages approval workflow.
   ============================================================ */

export type ContractStatus = 'draft' | 'pending_review' | 'approved' | 'sent_for_signature' | 'signed' | 'rejected' | 'cancelled'

export interface GeneratedContract {
  id: string
  company_id: string
  contract_template_id: string
  onboarding_instance_id?: string
  candidate_id?: string
  employee_id?: string
  job_id?: string
  offer_id?: string
  language_code: string
  rendered_body: string
  variables_snapshot: Record<string, string>
  ai_generated: boolean
  ai_run_id?: string
  status: ContractStatus
  reviewed_by?: string
  reviewed_at?: string
  review_notes?: string
  document_id?: string
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Generate contract from template.
 * Validates all required variables before rendering.
 */
export async function generateContractFromTemplate(
  companyId: string,
  templateId: string,
  variables: Record<string, string>,
  createdBy: string,
  options?: { onboardingInstanceId?: string; candidateId?: string; employeeId?: string; jobId?: string; offerId?: string }
): Promise<{ contract?: GeneratedContract; missing?: string[]; error?: string }> {
  // Fetch template
  const { data: template, error: tplErr } = await supabase
    .from('contract_templates')
    .select('*')
    .eq('id', templateId)
    .eq('company_id', companyId)
    .single()
  if (tplErr || !template) return { error: 'Template not found' }

  // Render with validation
  const { rendered, missing } = renderContractTemplate(
    template.body_template,
    variables,
    template.variables_schema
  )

  if (missing.length > 0) {
    return { missing, error: `Missing required variables: ${missing.join(', ')}` }
  }

  // Create generated contract
  const { data: contract, error: genErr } = await supabase
    .from('generated_contracts')
    .insert({
      company_id: companyId,
      contract_template_id: templateId,
      onboarding_instance_id: options?.onboardingInstanceId || null,
      candidate_id: options?.candidateId || null,
      employee_id: options?.employeeId || null,
      job_id: options?.jobId || null,
      offer_id: options?.offerId || null,
      language_code: template.language_code,
      rendered_body: rendered,
      variables_snapshot: variables,
      status: 'pending_review',
      created_by: createdBy,
    })
    .select()
    .single()
  if (genErr) return { error: 'Failed to generate contract' }

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: createdBy,
    action: 'contract.generated',
    resource_type: 'generated_contract',
    resource_id: contract.id,
    details: JSON.stringify({ template_id: templateId, variables_count: Object.keys(variables).length }),
  })

  return { contract: contract as unknown as GeneratedContract }
}

/**
 * Approve generated contract. Only from pending_review status.
 */
export async function approveGeneratedContract(
  contractId: string,
  reviewedBy: string,
  notes?: string
): Promise<void> {
  const { data: contract } = await supabase
    .from('generated_contracts')
    .select('*')
    .eq('id', contractId)
    .single()
  if (!contract) throw new Error('Contract not found')
  if (contract.status !== 'pending_review') throw new Error(`Cannot approve: status is ${contract.status}`)

  await supabase
    .from('generated_contracts')
    .update({
      status: 'approved',
      reviewed_by: reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId)

  await supabase.from('audit_logs').insert({
    company_id: contract.company_id,
    user_id: reviewedBy,
    action: 'contract.approved',
    resource_type: 'generated_contract',
    resource_id: contractId,
  })
}

/**
 * Reject generated contract.
 */
export async function rejectGeneratedContract(
  contractId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 3) throw new Error('Rejection reason required')

  const { data: contract } = await supabase
    .from('generated_contracts')
    .select('*')
    .eq('id', contractId)
    .single()
  if (!contract) throw new Error('Contract not found')

  await supabase
    .from('generated_contracts')
    .update({
      status: 'rejected',
      reviewed_by: rejectedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', contractId)

  await supabase.from('audit_logs').insert({
    company_id: contract.company_id,
    user_id: rejectedBy,
    action: 'contract.rejected',
    resource_type: 'generated_contract',
    resource_id: contractId,
    details: JSON.stringify({ reason: reason.trim() }),
  })
}

export async function getGeneratedContracts(companyId: string): Promise<GeneratedContract[]> {
  const { data, error } = await supabase
    .from('generated_contracts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as GeneratedContract[]
}

export async function getGeneratedContract(id: string): Promise<GeneratedContract | null> {
  const { data, error } = await supabase
    .from('generated_contracts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as GeneratedContract | null
}

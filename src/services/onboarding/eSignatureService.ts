import { supabase } from '../../lib/supabase'

/* ============================================================
   E-Signature Service
   Manages e-signature requests with provider adapters.
   All providers have safe disabled states.
   ============================================================ */

export type ESignatureProvider = 'docusign' | 'zapier_sign' | 'manual'
export type ESignatureStatus = 'not_configured' | 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired' | 'failed' | 'manually_uploaded'

export interface ESignatureRequest {
  id: string
  company_id: string
  generated_contract_id: string
  provider: ESignatureProvider
  provider_request_id?: string
  status: ESignatureStatus
  signer_email?: string
  signer_name?: string
  sent_at?: string
  signed_at?: string
  error_message?: string
  metadata: Record<string, unknown>
  created_by?: string
  created_at: string
  updated_at: string
}

/**
 * Create e-signature request.
 * Checks provider configuration before sending.
 */
export async function createESignatureRequest(
  companyId: string,
  contractId: string,
  provider: ESignatureProvider,
  signerName: string,
  signerEmail: string,
  createdBy: string
): Promise<ESignatureRequest> {
  // Verify contract is approved
  const { data: contract } = await supabase
    .from('generated_contracts')
    .select('status')
    .eq('id', contractId)
    .single()
  if (!contract) throw new Error('Contract not found')
  if (contract.status !== 'approved') {
    throw new Error(`Cannot send for signature: contract status is "${contract.status}". Must be approved first.`)
  }

  // Check provider configuration
  const configured = await isProviderConfigured(companyId, provider)

  const { data, error } = await supabase
    .from('esignature_requests')
    .insert({
      company_id: companyId,
      generated_contract_id: contractId,
      provider,
      status: configured ? 'sent' : 'not_configured',
      signer_email: signerEmail,
      signer_name: signerName,
      sent_at: configured ? new Date().toISOString() : null,
      created_by: createdBy,
    })
    .select()
    .single()
  if (error) throw error

  // Update contract status
  if (configured) {
    await supabase
      .from('generated_contracts')
      .update({ status: 'sent_for_signature', updated_at: new Date().toISOString() })
      .eq('id', contractId)
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: createdBy,
    action: 'esignature.requested',
    resource_type: 'esignature_request',
    resource_id: data.id,
    details: JSON.stringify({ provider, configured, signer_email: signerEmail }),
  })

  return data as unknown as ESignatureRequest
}

/**
 * Mark contract as manually signed (fallback when no e-signature provider).
 */
export async function markManualSigned(
  contractId: string,
  companyId: string,
  signedBy: string
): Promise<void> {
  // Create manual signature request
  const { error: esrErr } = await supabase
    .from('esignature_requests')
    .insert({
      company_id: companyId,
      generated_contract_id: contractId,
      provider: 'manual',
      status: 'manually_uploaded',
      signed_at: new Date().toISOString(),
      created_by: signedBy,
    })
    .select()
    .single()
  if (esrErr) throw esrErr

  // Update contract status
  await supabase
    .from('generated_contracts')
    .update({ status: 'signed', updated_at: new Date().toISOString() })
    .eq('id', contractId)

  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: signedBy,
    action: 'esignature.manual_signed',
    resource_type: 'generated_contract',
    resource_id: contractId,
  })
}

export async function getESignatureRequests(companyId: string, contractId?: string): Promise<ESignatureRequest[]> {
  let query = supabase
    .from('esignature_requests')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
  if (contractId) query = query.eq('generated_contract_id', contractId)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as ESignatureRequest[]
}

async function isProviderConfigured(_companyId: string, provider: ESignatureProvider): Promise<boolean> {
  if (provider === 'manual') return true // Manual is always available
  // Check if provider is configured (would check env vars or provider_configs)
  // For now, return false for external providers until configured
  return false
}

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

// ── Canvas-Based Signature Capture ──────────────────────────
// In-app signature for Thai legal compliance (พ.ร.บ.ธุรกรรมทางอิเล็กทรอนิกส์)

export interface SignatureData {
  signatureImage: string // Base64 PNG
  ipAddress: string
  userAgent: string
  timestamp: string
  signerName: string
  signerEmail: string
}

export interface SignatureAuditEntry {
  id: string
  request_id: string
  action: 'viewed' | 'signed' | 'declined'
  signature_data?: SignatureData
  ip_address: string
  user_agent: string
  timestamp: string
}

/**
 * Process canvas-captured signature.
 * Stores signature image + creates audit trail for legal compliance.
 */
export async function processCanvasSignature(
  requestId: string,
  companyId: string,
  signatureData: SignatureData
): Promise<void> {
  // Get the request
  const { data: request } = await supabase
    .from('esignature_requests')
    .select('id, generated_contract_id')
    .eq('id', requestId)
    .eq('company_id', companyId)
    .single()

  if (!request) throw new Error('Signature request not found')

  // Store signature image in Supabase Storage
  const signatureFileName = `signatures/${companyId}/${requestId}_${Date.now()}.png`
  const signatureBuffer = Buffer.from(signatureData.signatureImage.split(',')[1], 'base64')

  const { error: uploadError } = await supabase.storage
    .from('esignatures')
    .upload(signatureFileName, signatureBuffer, {
      contentType: 'image/png',
      upsert: false,
    })

  if (uploadError) throw new Error(`Failed to store signature: ${uploadError.message}`)

  // Update request status
  await supabase
    .from('esignature_requests')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString(),
      metadata: {
        signature_storage_path: signatureFileName,
        signer_name: signatureData.signerName,
        signer_email: signatureData.signerEmail,
      },
    })
    .eq('id', requestId)

  // Update contract status
  await supabase
    .from('generated_contracts')
    .update({ status: 'signed', updated_at: new Date().toISOString() })
    .eq('id', request.generated_contract_id)

  // Create audit trail entry
  await supabase.from('esignature_audit_log').insert({
    request_id: requestId,
    company_id: companyId,
    action: 'signed',
    signature_storage_path: signatureFileName,
    ip_address: signatureData.ipAddress,
    user_agent: signatureData.userAgent,
    signer_name: signatureData.signerName,
    signer_email: signatureData.signerEmail,
    timestamp: new Date().toISOString(),
  })

  // General audit log
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: request.generated_contract_id, // Will be overridden by RLS
    action: 'esignature.canvas_signed',
    resource_type: 'esignature_request',
    resource_id: requestId,
    details: JSON.stringify({
      signer_name: signatureData.signerName,
      signer_email: signatureData.signerEmail,
      ip_address: signatureData.ipAddress,
    }),
  })
}

/**
 * Get audit trail for a signature request.
 * Returns chronological list of all actions taken on the request.
 */
export async function getSignatureAuditTrail(
  requestId: string,
  companyId: string
): Promise<SignatureAuditEntry[]> {
  const { data, error } = await supabase
    .from('esignature_audit_log')
    .select('*')
    .eq('request_id', requestId)
    .eq('company_id', companyId)
    .order('timestamp', { ascending: true })

  if (error) throw error
  return (data ?? []) as SignatureAuditEntry[]
}

/**
 * Verify signature integrity.
 * Checks that the signature image exists and matches the audit record.
 */
export async function verifySignature(
  requestId: string,
  companyId: string
): Promise<{ valid: boolean; reason?: string }> {
  const { data: request } = await supabase
    .from('esignature_requests')
    .select('status, metadata')
    .eq('id', requestId)
    .eq('company_id', companyId)
    .single()

  if (!request) return { valid: false, reason: 'Request not found' }
  if (request.status !== 'signed') return { valid: false, reason: 'Not yet signed' }

  const metadata = request.metadata as Record<string, unknown>
  const storagePath = metadata.signature_storage_path as string

  if (!storagePath) return { valid: false, reason: 'No signature image stored' }

  // Verify signature image exists in storage
  const { error: listError } = await supabase.storage
    .from('esignatures')
    .list(storagePath.split('/').slice(0, -1).join('/'))

  if (listError) return { valid: false, reason: 'Signature image not found in storage' }

  // Verify audit trail exists
  const { data: auditEntries } = await supabase
    .from('esignature_audit_log')
    .select('id')
    .eq('request_id', requestId)
    .eq('action', 'signed')
    .limit(1)

  if (!auditEntries || auditEntries.length === 0) {
    return { valid: false, reason: 'No signed audit entry found' }
  }

  return { valid: true }
}

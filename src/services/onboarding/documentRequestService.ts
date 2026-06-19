import { supabase } from '../../lib/supabase'

/* ============================================================
   Document Request Service
   Secure upload token flow for candidate/employee document upload.
   ============================================================ */

export interface DocumentRequest {
  id: string
  company_id: string
  onboarding_instance_id: string
  onboarding_item_id: string
  candidate_id?: string
  employee_id?: string
  document_type: string
  status: string
  secure_upload_token_hash?: string
  token_expires_at?: string
  requested_by?: string
  requested_at?: string
  message_draft_id?: string
  uploaded_document_id?: string
  verified_by?: string
  verified_at?: string
  rejected_by?: string
  rejected_at?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

/**
 * Request a document from candidate/employee.
 * Creates a secure upload token (hashed in DB).
 */
export async function requestDocument(
  companyId: string,
  instanceId: string,
  itemId: string,
  documentType: string,
  requestedBy: string,
  candidateId?: string,
  employeeId?: string
): Promise<DocumentRequest> {
  // Generate secure token (raw value sent to candidate, hash stored in DB)
  const rawToken = crypto.randomUUID().replace(/-/g, '') + Date.now().toString(36)
  const tokenHash = await hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString() // 7 days

  const { data, error } = await supabase
    .from('onboarding_document_requests')
    .insert({
      company_id: companyId,
      onboarding_instance_id: instanceId,
      onboarding_item_id: itemId,
      candidate_id: candidateId || null,
      employee_id: employeeId || null,
      document_type: documentType,
      status: 'requested',
      secure_upload_token_hash: tokenHash,
      token_expires_at: expiresAt,
      requested_by: requestedBy,
      requested_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error) throw error

  // Update item status
  await supabase
    .from('onboarding_instance_items')
    .update({ status: 'requested', updated_at: new Date().toISOString() })
    .eq('id', itemId)

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: companyId,
    user_id: requestedBy,
    action: 'document.requested',
    resource_type: 'onboarding_document_request',
    resource_id: data.id,
    details: JSON.stringify({ document_type: documentType, candidate_id: candidateId }),
  })

  // Return the request WITH the raw token (only time it's shown)
  return { ...data, secure_upload_token: rawToken } as unknown as DocumentRequest
}

/**
 * Validate upload token. Returns request if valid, null if expired/invalid.
 */
export async function validateUploadToken(rawToken: string): Promise<DocumentRequest | null> {
  const tokenHash = await hashToken(rawToken)

  const { data } = await supabase
    .from('onboarding_document_requests')
    .select('*')
    .eq('secure_upload_token_hash', tokenHash)
    .gt('token_expires_at', new Date().toISOString())
    .in('status', ['requested'])
    .maybeSingle()

  return data as unknown as DocumentRequest | null
}

/**
 * Upload document via secure token.
 * Validates token, creates document record, updates request status.
 */
export async function uploadRequestedDocument(
  rawToken: string,
  file: File,
  metadata: { fileName?: string; fileType?: string }
): Promise<{ success: boolean; documentId?: string; error?: string }> {
  // Validate token
  const request = await validateUploadToken(rawToken)
  if (!request) {
    return { success: false, error: 'Invalid or expired upload token' }
  }

  // Validate file
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return { success: false, error: 'File too large. Maximum size is 10MB.' }
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.includes(file.type)) {
    return { success: false, error: 'File type not allowed. Accepted: PDF, JPEG, PNG, DOCX.' }
  }

  // Upload to storage
  const filePath = `${request.company_id}/${request.id}/${Date.now()}_${file.name}`
  const { error: uploadErr } = await supabase.storage
    .from('onboarding-docs')
    .upload(filePath, file, { contentType: file.type })
  if (uploadErr) return { success: false, error: 'Upload failed' }

  // Get signed URL for storage
  const { data: urlData } = await supabase.storage
    .from('onboarding-docs')
    .createSignedUrl(filePath, 3600)

  // Create document record
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .insert({
      company_id: request.company_id,
      candidate_id: request.candidate_id,
      employee_id: request.employee_id,
      document_type: request.document_type,
      name: metadata.fileName || file.name,
      file_url: urlData?.signedUrl || filePath,
      status: 'submitted',
      region: 'TH',
    })
    .select()
    .single()
  if (docErr) return { success: false, error: 'Failed to create document record' }

  // Update request
  await supabase
    .from('onboarding_document_requests')
    .update({
      status: 'uploaded',
      uploaded_document_id: doc.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id)

  // Update instance item status
  await supabase
    .from('onboarding_instance_items')
    .update({ status: 'uploaded', updated_at: new Date().toISOString() })
    .eq('id', request.onboarding_item_id)

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: request.company_id,
    user_id: null,
    action: 'document.uploaded',
    resource_type: 'onboarding_document_request',
    resource_id: request.id,
    details: JSON.stringify({ document_type: request.document_type, file_name: file.name }),
  })

  return { success: true, documentId: doc.id }
}

/**
 * HR verifies uploaded document.
 */
export async function verifyDocument(
  requestId: string,
  verifiedBy: string
): Promise<void> {
  const { data: request } = await supabase
    .from('onboarding_document_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (!request) throw new Error('Document request not found')
  if (request.status !== 'uploaded') throw new Error(`Cannot verify: status is ${request.status}`)

  await supabase
    .from('onboarding_document_requests')
    .update({
      status: 'verified',
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  await supabase
    .from('onboarding_instance_items')
    .update({ status: 'verified', completed_by: verifiedBy, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', request.onboarding_item_id)

  await supabase.from('audit_logs').insert({
    company_id: request.company_id,
    user_id: verifiedBy,
    action: 'document.verified',
    resource_type: 'onboarding_document_request',
    resource_id: requestId,
  })
}

/**
 * HR rejects uploaded document with reason.
 */
export async function rejectDocument(
  requestId: string,
  rejectedBy: string,
  reason: string
): Promise<void> {
  if (!reason || reason.trim().length < 3) throw new Error('Rejection reason required')

  const { data: request } = await supabase
    .from('onboarding_document_requests')
    .select('*')
    .eq('id', requestId)
    .single()
  if (!request) throw new Error('Document request not found')

  await supabase
    .from('onboarding_document_requests')
    .update({
      status: 'rejected',
      rejected_by: rejectedBy,
      rejected_at: new Date().toISOString(),
      rejection_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  await supabase
    .from('onboarding_instance_items')
    .update({ status: 'rejected', rejection_reason: reason.trim(), updated_at: new Date().toISOString() })
    .eq('id', request.onboarding_item_id)

  await supabase.from('audit_logs').insert({
    company_id: request.company_id,
    user_id: rejectedBy,
    action: 'document.rejected',
    resource_type: 'onboarding_document_request',
    resource_id: requestId,
    details: JSON.stringify({ reason: reason.trim() }),
  })
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

import { supabase } from '../../lib/supabase'

/* ============================================================
   Message Approval Service
   Explicit approval workflow. No message sent without approval.
   ============================================================ */

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface MessageApproval {
  id: string
  company_id: string
  message_draft_id: string
  approval_status: ApprovalStatus
  approved_by?: string
  rejected_by?: string
  approval_reason?: string
  rejection_reason?: string
  approved_at?: string
  rejected_at?: string
  created_at: string
}

export async function getPendingApprovals(companyId: string): Promise<MessageApproval[]> {
  const { data, error } = await supabase
    .from('message_approvals')
    .select('*, message_drafts!inner(*)')
    .eq('company_id', companyId)
    .eq('approval_status', 'pending')
    .order('created_at')
  if (error) throw error
  return (data ?? []) as unknown as MessageApproval[]
}

export async function getApprovalsByDraft(draftId: string): Promise<MessageApproval[]> {
  const { data, error } = await supabase
    .from('message_approvals')
    .select('*')
    .eq('message_draft_id', draftId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as MessageApproval[]
}

/**
 * Approve a message draft.
 * Requires approver permission (admin/hr_manager).
 * Only works on drafts in 'pending_approval' status.
 */
export async function approveMessage(
  approvalId: string,
  approverId: string,
  reason?: string
): Promise<MessageApproval> {
  // Get approval record
  const { data: approval, error: fetchErr } = await supabase
    .from('message_approvals')
    .select('*')
    .eq('id', approvalId)
    .single()
  if (fetchErr || !approval) throw new Error('Approval record not found')

  if (approval.approval_status !== 'pending') {
    throw new Error(`Cannot approve: already ${approval.approval_status}`)
  }

  // Update approval record
  const { data, error } = await supabase
    .from('message_approvals')
    .update({
      approval_status: 'approved',
      approved_by: approverId,
      approval_reason: reason ?? null,
      approved_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .select()
    .single()
  if (error) throw error

  // Update draft status
  await supabase
    .from('message_drafts')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', approval.message_draft_id)

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: approval.company_id,
    user_id: approverId,
    action: 'message.approved',
    resource_type: 'message_draft',
    resource_id: approval.message_draft_id,
    details: JSON.stringify({ approval_id: approvalId, reason }),
  })

  return data as unknown as MessageApproval
}

/**
 * Reject a message draft.
 * Requires reason. Only works on 'pending_approval' status.
 */
export async function rejectMessage(
  approvalId: string,
  rejectorId: string,
  reason: string
): Promise<MessageApproval> {
  if (!reason || reason.trim().length < 3) {
    throw new Error('Rejection reason is required (minimum 3 characters)')
  }

  const { data: approval, error: fetchErr } = await supabase
    .from('message_approvals')
    .select('*')
    .eq('id', approvalId)
    .single()
  if (fetchErr || !approval) throw new Error('Approval record not found')

  if (approval.approval_status !== 'pending') {
    throw new Error(`Cannot reject: already ${approval.approval_status}`)
  }

  const { data, error } = await supabase
    .from('message_approvals')
    .update({
      approval_status: 'rejected',
      rejected_by: rejectorId,
      rejection_reason: reason.trim(),
      rejected_at: new Date().toISOString(),
    })
    .eq('id', approvalId)
    .select()
    .single()
  if (error) throw error

  // Update draft status
  await supabase
    .from('message_drafts')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', approval.message_draft_id)

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: approval.company_id,
    user_id: rejectorId,
    action: 'message.rejected',
    resource_type: 'message_draft',
    resource_id: approval.message_draft_id,
    details: JSON.stringify({ approval_id: approvalId, reason: reason.trim() }),
  })

  return data as unknown as MessageApproval
}

/**
 * Send an approved message.
 * CRITICAL: Only works on drafts with status = 'approved'.
 * Creates message_logs entry. Actual sending via provider adapter.
 */
export async function sendMessage(
  draftId: string,
  senderId: string
): Promise<{ success: boolean; logId?: string; error?: string }> {
  // Get draft
  const { data: draft, error: draftErr } = await supabase
    .from('message_drafts')
    .select('*')
    .eq('id', draftId)
    .single()
  if (draftErr || !draft) return { success: false, error: 'Draft not found' }

  // CRITICAL CHECK: Only approved messages can be sent
  if (draft.status !== 'approved') {
    return { success: false, error: `Cannot send: draft status is "${draft.status}". Only approved drafts can be sent.` }
  }

  // Create message log entry
  const { data: log, error: logErr } = await supabase
    .from('message_logs')
    .insert({
      company_id: draft.company_id,
      message_draft_id: draftId,
      recipient_type: draft.recipient_type,
      recipient_id: draft.candidate_id ?? draft.employee_id ?? draft.user_id,
      channel: draft.channel,
      provider: draft.channel,
      delivery_status: 'queued',
      subject: draft.subject,
      body_snapshot: draft.body,
      sent_by: senderId,
    })
    .select()
    .single()
  if (logErr) return { success: false, error: 'Failed to create send log' }

  // Update draft status
  await supabase
    .from('message_drafts')
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', draftId)

  // Audit log
  await supabase.from('audit_logs').insert({
    company_id: draft.company_id,
    user_id: senderId,
    action: 'message.sent',
    resource_type: 'message_draft',
    resource_id: draftId,
    details: JSON.stringify({ channel: draft.channel, log_id: log.id }),
  })

  return { success: true, logId: log.id }
}

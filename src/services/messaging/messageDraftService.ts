import { supabase } from '../../lib/supabase'
import type { MessageChannel } from './providers/types'

/* ============================================================
   Message Draft Service
   Create, update, submit for approval.
   NO direct sending — approval required first.
   ============================================================ */

export type DraftStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'sent' | 'failed' | 'cancelled'

export interface MessageDraft {
  id: string
  company_id: string
  recipient_type: 'candidate' | 'employee' | 'user' | 'external'
  candidate_id?: string
  employee_id?: string
  user_id?: string
  job_id?: string
  application_id?: string
  template_id?: string
  channel: MessageChannel
  subject?: string
  body: string
  language_code: string
  ai_generated: boolean
  ai_run_id?: string
  status: DraftStatus
  created_by?: string
  created_at: string
  updated_at: string
}

export async function getDrafts(companyId: string, status?: DraftStatus): Promise<MessageDraft[]> {
  let query = supabase
    .from('message_drafts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as MessageDraft[]
}

export async function getMyDrafts(userId: string, companyId: string): Promise<MessageDraft[]> {
  const { data, error } = await supabase
    .from('message_drafts')
    .select('*')
    .eq('company_id', companyId)
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as MessageDraft[]
}

export async function getDraftById(id: string): Promise<MessageDraft | null> {
  const { data, error } = await supabase
    .from('message_drafts')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as unknown as MessageDraft | null
}

export async function createDraft(
  draft: Omit<MessageDraft, 'id' | 'created_at' | 'updated_at' | 'status'>
): Promise<MessageDraft> {
  const { data, error } = await supabase
    .from('message_drafts')
    .insert({ ...draft, status: 'draft' })
    .select()
    .single()
  if (error) throw error
  return data as unknown as MessageDraft
}

export async function updateDraft(
  id: string,
  updates: Partial<MessageDraft>
): Promise<MessageDraft> {
  const { data, error } = await supabase
    .from('message_drafts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data as unknown as MessageDraft
}

/**
 * Submit draft for approval.
 * Sets status to 'pending_approval' and creates an approval record.
 */
export async function submitForApproval(id: string): Promise<MessageDraft> {
  // Verify draft is in editable state
  const draft = await getDraftById(id)
  if (!draft) throw new Error('Draft not found')
  if (draft.status !== 'draft' && draft.status !== 'rejected') {
    throw new Error(`Cannot submit draft in status: ${draft.status}`)
  }

  // Update draft status
  const { data, error } = await supabase
    .from('message_drafts')
    .update({ status: 'pending_approval', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error

  // Create approval record
  await supabase.from('message_approvals').insert({
    company_id: draft.company_id,
    message_draft_id: id,
    approval_status: 'pending',
  })

  return data as unknown as MessageDraft
}

export async function cancelDraft(id: string): Promise<void> {
  const { error } = await supabase
    .from('message_drafts')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteDraft(id: string): Promise<void> {
  const { error } = await supabase.from('message_drafts').delete().eq('id', id)
  if (error) throw error
}

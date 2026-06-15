import { supabase } from '../lib/supabase'

export interface CreateApplicationInput {
  job_id: string
  candidate_email?: string
  candidate_name?: string
  company_id: string
}

export interface UpdateStatusInput {
  status: string
  notes?: string
  companyId: string
}

export const applicationService = {
  getByJob: async (jobId: string) => {
    const { data, error } = await supabase.from('applications').select('*, candidates(full_name, email, phone, location, current_position, avatar_url), cv_documents(file_url, parsed_content, is_current)').eq('job_id', jobId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  create: async (input: CreateApplicationInput) => {
    const { data, error } = await supabase.from('applications').insert(input).select().single()
    if (error) throw error
    return data
  },
  updateStatus: async (id: string, status: string, notes?: string, companyId?: string) => {
    const now = new Date().toISOString()
    const updates: Record<string, string> = { status, updated_at: now }
    if (notes !== undefined) updates.recruiter_notes = notes
    if (status === 'hired') updates.hired_at = now
    if (status === 'rejected') updates.rejected_at = now
    let query = supabase.from('applications').update(updates).eq('id', id)
    if (companyId) query = query.eq('company_id', companyId)
    const { data, error } = await query.select().single()
    if (error) throw error
    return data
  },
  triggerAIScreening: async (applicationId: string, jobId: string, cvDocumentId: string, companyId: string) => {
    const { data } = await supabase.functions.invoke('screen-resume', { body: { applicationId, jobId, cvDocumentId, companyId } })
    return data
  },
}

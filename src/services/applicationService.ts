import { supabase } from '../lib/supabase'

export const applicationService = {
  getByJob: async (jobId: string) => {
    const { data, error } = await supabase.from('applications').select('*, candidates(full_name, email, phone, location, current_position, avatar_url), cv_documents(file_url, parsed_content, is_current)').eq('job_id', jobId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  create: async (app: Record<string, unknown>) => {
    const { data, error } = await supabase.from('applications').insert(app).select().single()
    if (error) throw error
    return data
  },
  updateStatus: async (id: string, status: string, notes?: string) => {
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (notes !== undefined) updates.recruiter_notes = notes
    if (status === 'hired') updates.hired_at = new Date().toISOString()
    if (status === 'rejected') updates.rejected_at = new Date().toISOString()
    const { data, error } = await supabase.from('applications').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  triggerAIScreening: async (applicationId: string, jobId: string, cvDocumentId: string, companyId: string) => {
    const { data } = await supabase.functions.invoke('screen-resume', { body: { applicationId, jobId, cvDocumentId, companyId } })
    return data
  },
}

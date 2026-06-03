import { supabase } from '../lib/supabase'

export const interviewService = {
  getByApplication: async (applicationId: string) => {
    const { data, error } = await supabase.from('interviews').select('*').eq('application_id', applicationId).order('scheduled_at', { ascending: true })
    if (error) throw error
    return data
  },
  getUpcoming: async (companyId: string) => {
    const { data, error } = await supabase.from('interviews').select('*, applications(*, candidates(full_name, email, phone), jobs(title))').eq('company_id', companyId).eq('status', 'scheduled').gte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true })
    if (error) throw error
    return data
  },
  getPast: async (companyId: string) => {
    const { data, error } = await supabase.from('interviews').select('*, applications(*, candidates(full_name, email), jobs(title))').eq('company_id', companyId).in('status', ['completed', 'cancelled', 'no_show']).order('scheduled_at', { ascending: false })
    if (error) throw error
    return data
  },
  create: async (interview: any) => {
    const { data, error } = await supabase.from('interviews').insert(interview).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('interviews').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

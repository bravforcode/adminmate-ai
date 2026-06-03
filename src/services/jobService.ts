import { supabase } from '../lib/supabase'

export const jobService = {
  getAll: async (companyId: string) => {
    const { data, error } = await supabase.from('jobs').select('*, applications(count)').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  getById: async (id: string) => {
    const { data, error } = await supabase.from('jobs').select('*').eq('id', id).single()
    if (error) throw error
    return data
  },
  create: async (job: any) => {
    const { data, error } = await supabase.from('jobs').insert(job).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  updateStatus: async (id: string, status: string) => {
    return jobService.update(id, { status })
  },
}

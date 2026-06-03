import { supabase } from '../lib/supabase'

export const candidateService = {
  getAll: async (companyId: string) => {
    const { data, error } = await supabase.from('candidates').select('*, cv_documents!inner(*)').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  getById: async (id: string) => {
    const { data, error } = await supabase.from('candidates').select('*, cv_documents(*), applications(*, jobs(title))').eq('id', id).single()
    if (error) throw error
    return data
  },
  create: async (candidate: any) => {
    const { data, error } = await supabase.from('candidates').insert(candidate).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: any) => {
    const { data, error } = await supabase.from('candidates').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
}

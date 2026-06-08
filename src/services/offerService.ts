import { supabase } from '../lib/supabase'

export const offerService = {
  getAll: async (companyId: string) => {
    const { data, error } = await supabase.from('offers').select('*, candidates(full_name, email), jobs(title)').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  getById: async (id: string) => {
    const { data, error } = await supabase.from('offers').select('*, candidates(*), jobs(*)').eq('id', id).single()
    if (error) throw error
    return data
  },
  create: async (offer: Record<string, unknown>) => {
    const { data, error } = await supabase.from('offers').insert(offer).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from('offers').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  generateContent: async (data: Record<string, unknown>) => {
    const { data: result } = await supabase.functions.invoke('generate-offer-content', { body: data })
    return result
  },
}

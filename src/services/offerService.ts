import { supabase } from '../lib/supabase'

export interface CreateOfferInput {
  company_id: string
  candidate_id: string
  job_id: string
  position_title?: string
  status?: string
  salary_offered?: number
  salary_currency?: string
  start_date?: string
  work_hours?: string
  benefits?: string[]
  special_conditions?: string
}

export interface UpdateOfferInput {
  position_title?: string
  status?: string
  salary_offered?: number
  salary_currency?: string
  start_date?: string
  work_hours?: string
  benefits?: string[]
  special_conditions?: string
}

export const offerService = {
  getAll: async (companyId: string) => {
    const { data, error } = await supabase.from('offers').select('*, candidates(full_name, email), jobs(title)').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  getById: async (id: string, companyId: string) => {
    const { data, error } = await supabase.from('offers').select('*, candidates(*), jobs(*)').eq('id', id).eq('company_id', companyId).single()
    if (error) throw error
    return data
  },
  create: async (offer: CreateOfferInput) => {
    const { data, error } = await supabase.from('offers').insert(offer).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: UpdateOfferInput, companyId: string) => {
    const { data, error } = await supabase.from('offers').update(updates).eq('id', id).eq('company_id', companyId).select().single()
    if (error) throw error
    return data
  },
  generateContent: async (data: Record<string, unknown>) => {
    const { data: result } = await supabase.functions.invoke('generate-offer-content', { body: data })
    return result
  },
}

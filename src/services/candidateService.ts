import { supabase } from '../lib/supabase'

export interface CandidateWithApplications {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  location: string | null
  current_position: string | null
  avatar_url: string | null
  experience_years: number | null
  source: string | null
  created_at: string
  application_count: number
  latest_application_status: string | null
  latest_ai_match_score: number | null
  has_cv: boolean
}

export const candidateService = {
  getAll: async (companyId: string) => {
    const { data, error } = await supabase.from('candidates').select('*, cv_documents(*), applications(status)').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  getAllWithApplications: async (companyId: string): Promise<CandidateWithApplications[]> => {
    const { data, error } = await supabase.rpc('get_candidates_with_applications', { p_company_id: companyId })
    if (error) throw error
    return (data as CandidateWithApplications[]) ?? []
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

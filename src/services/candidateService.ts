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

export interface CreateCandidateInput {
  full_name?: string
  current_position?: string
  email?: string
  phone?: string
  location?: string
  linkedin_url?: string
  portfolio_url?: string
  years_experience?: number
  primary_skill?: string
  source?: string
  company_id: string
}

export interface UpdateCandidateInput {
  full_name?: string
  current_position?: string
  email?: string
  phone?: string
  location?: string
  linkedin_url?: string
  portfolio_url?: string
  years_experience?: number
  primary_skill?: string
  source?: string
}

export interface PaginatedResult<T> {
  data: T[]
  cursor: string | null
  hasMore: boolean
}

export const candidateService = {
  getAll: async (companyId: string, options?: { cursor?: string; limit?: number }): Promise<PaginatedResult<Record<string, unknown>>> => {
    const limit = options?.limit ?? 50
    let query = supabase
      .from('candidates')
      .select('*, cv_documents(*), applications(status)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (options?.cursor) {
      query = query.lt('created_at', options.cursor)
    }

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as Record<string, unknown>[]
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? (items[items.length - 1]?.created_at as string) ?? null : null

    return { data: items, cursor: nextCursor, hasMore }
  },
  getAllWithApplications: async (companyId: string): Promise<CandidateWithApplications[]> => {
    const { data, error } = await supabase.rpc('get_candidates_with_applications', { p_company_id: companyId })
    if (error) throw error
    return (data as CandidateWithApplications[]) ?? []
  },
  getById: async (id: string, companyId: string) => {
    const { data, error } = await supabase.from('candidates').select('*, cv_documents(*), applications(*, jobs(title))').eq('id', id).eq('company_id', companyId).single()
    if (error) throw error
    return data
  },
  create: async (input: CreateCandidateInput) => {
    const { data, error } = await supabase.from('candidates').insert(input).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, data: UpdateCandidateInput) => {
    const { data: result, error } = await supabase.from('candidates').update(data).eq('id', id).select().single()
    if (error) throw error
    return result
  },
}

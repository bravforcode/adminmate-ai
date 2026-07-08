import { supabase } from '../lib/supabase'
import { checkLimit } from '../lib/subscriptions'
import type { SubscriptionTier } from '../lib/subscriptions'

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

export interface CandidateSearchOptions {
  search?: string
  source?: string
  cursor?: string
  limit?: number
}

export interface CandidateNote {
  id: string
  candidate_id: string
  company_id: string
  author_id: string
  content: string
  created_at: string
}

export interface CandidateTimelineEvent {
  id: string
  candidate_id: string
  company_id: string
  event_type: string
  description: string
  metadata?: Record<string, unknown>
  created_at: string
  created_by?: string
}

export const candidateService = {
  getAll: async (companyId: string, options?: { cursor?: string; limit?: number }): Promise<PaginatedResult<Record<string, unknown>>> => {
    const limit = options?.limit ?? 50
    let query = supabase
      .from('candidates')
      .select('id, full_name, email, phone, location, current_position, avatar_url, experience_years, source, created_at, updated_at, cv_documents(id, file_url, is_current), applications(id, status)')
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

  search: async (companyId: string, options: CandidateSearchOptions): Promise<PaginatedResult<Record<string, unknown>>> => {
    const limit = options.limit ?? 50
    let query = supabase
      .from('candidates')
      .select('id, full_name, email, phone, location, current_position, avatar_url, experience_years, source, created_at, updated_at, cv_documents(id, file_url, is_current), applications(id, status)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (options.search) {
      const term = `%${options.search}%`
      query = query.or(`full_name.ilike.${term},email.ilike.${term},current_position.ilike.${term},location.ilike.${term}`)
    }
    if (options.source) {
      query = query.eq('source', options.source)
    }
    if (options.cursor) {
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
    const { data, error } = await supabase.from('candidates').select('id, company_id, full_name, email, phone, location, current_position, avatar_url, experience_years, source, linkedin_url, portfolio_url, preferred_language, notes, created_at, updated_at, cv_documents(*), applications(id, status, job_id, created_at, jobs(title))').eq('id', id).eq('company_id', companyId).single()
    if (error) throw error
    return data
  },

  create: async (input: CreateCandidateInput) => {
    if (input.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('subscription_tier')
        .eq('id', input.company_id)
        .single()
      const tier: SubscriptionTier = (company?.subscription_tier as SubscriptionTier) || 'free'

      const { count } = await supabase
        .from('candidates')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', input.company_id)

      const result = checkLimit(tier, 'candidates', count || 0)
      if (!result.allowed) {
        throw new Error(`Candidate limit reached for ${tier} plan (${result.limit} max). Upgrade to add more candidates.`)
      }
    }

    const { data, error } = await supabase.from('candidates').insert(input).select().single()
    if (error) throw error
    return data
  },

  update: async (id: string, data: UpdateCandidateInput) => {
    const { data: result, error } = await supabase.from('candidates').update(data).eq('id', id).select().single()
    if (error) throw error
    return result
  },

  delete: async (id: string, companyId: string): Promise<void> => {
    const { error } = await supabase.from('candidates').delete().eq('id', id).eq('company_id', companyId)
    if (error) throw error
  },

  bulkUpdateStatus: async (ids: string[], status: string, companyId: string): Promise<void> => {
    if (ids.length === 0) return
    const { error } = await supabase
      .from('candidates')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('company_id', companyId)
    if (error) throw error
  },

  addNote: async (candidateId: string, companyId: string, authorId: string, content: string): Promise<CandidateNote> => {
    const { data, error } = await supabase
      .from('candidate_notes')
      .insert({ candidate_id: candidateId, company_id: companyId, author_id: authorId, content })
      .select()
      .single()
    if (error) throw error
    return data as CandidateNote
  },

  getNotes: async (candidateId: string, companyId: string): Promise<CandidateNote[]> => {
    const { data, error } = await supabase
      .from('candidate_notes')
      .select('id, candidate_id, company_id, author_id, content, created_at')
      .eq('candidate_id', candidateId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as CandidateNote[]
  },

  getTimeline: async (candidateId: string, companyId: string): Promise<CandidateTimelineEvent[]> => {
    const { data, error } = await supabase
      .from('candidate_timeline')
      .select('id, candidate_id, company_id, event_type, description, metadata, created_at, created_by')
      .eq('candidate_id', candidateId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as CandidateTimelineEvent[]
  },
}

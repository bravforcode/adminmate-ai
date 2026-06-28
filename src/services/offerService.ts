import { supabase } from '../lib/supabase'
import type { Offer } from '../types/models'

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

export interface PaginatedResult<T> {
  data: T[]
  cursor: string | null
  hasMore: boolean
}

export const offerService = {
  getAll: async (companyId: string, options?: { cursor?: string; limit?: number }): Promise<PaginatedResult<Offer & { created_at?: string; company_id?: string; id: string }>> => {
    const limit = options?.limit ?? 50
    let query = supabase
      .from('offers')
      .select('*, candidates(full_name, email), jobs(title)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (options?.cursor) {
      query = query.lt('created_at', options.cursor)
    }

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as (Offer & { created_at?: string; company_id?: string })[]
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? items[items.length - 1].created_at ?? null : null

    return { data: items as (Offer & { created_at?: string; company_id?: string; id: string })[], cursor: nextCursor, hasMore }
  },
  getById: async (id: string, companyId: string) => {
    const { data, error } = await supabase.from('offers').select('id, company_id, application_id, candidate_id, job_id, position_title, salary_offered, salary_currency, employment_type, start_date, work_hours, benefits, special_conditions, status, sent_at, viewed_at, responded_at, expires_at, candidate_response, created_at, updated_at, candidates(id, full_name, email, phone), jobs(id, title, department, location)').eq('id', id).eq('company_id', companyId).single()
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

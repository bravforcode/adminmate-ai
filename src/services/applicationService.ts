import { supabase } from '../lib/supabase'
import type { Application } from '../types/models'

export interface CreateApplicationInput {
  job_id: string
  candidate_email?: string
  candidate_name?: string
  company_id: string
}

export interface UpdateStatusInput {
  status: string
  notes?: string
  companyId: string
}

export interface PaginatedResult<T> {
  data: T[]
  cursor: string | null
  hasMore: boolean
}

export const applicationService = {
  getByJob: async (jobId: string, options?: { cursor?: string; limit?: number }): Promise<PaginatedResult<Application>> => {
    const limit = options?.limit ?? 50
    let query = supabase
      .from('applications')
      .select('*, candidates(full_name, email, phone, location, current_position, avatar_url), cv_documents(file_url, parsed_content, is_current)')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (options?.cursor) {
      query = query.lt('created_at', options.cursor)
    }

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as Application[]
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? items[items.length - 1].created_at ?? null : null

    return { data: items, cursor: nextCursor, hasMore }
  },
  create: async (input: CreateApplicationInput) => {
    const { data, error } = await supabase.from('applications').insert(input).select().single()
    if (error) throw error
    return data
  },
  updateStatus: async (id: string, status: string, notes?: string, companyId?: string) => {
    const now = new Date().toISOString()
    const updates: Record<string, string> = { status, updated_at: now }
    if (notes !== undefined) updates.recruiter_notes = notes
    if (status === 'hired') updates.hired_at = now
    if (status === 'rejected') updates.rejected_at = now
    let query = supabase.from('applications').update(updates).eq('id', id)
    if (companyId) query = query.eq('company_id', companyId)
    const { data, error } = await query.select().single()
    if (error) throw error
    return data
  },
  triggerAIScreening: async (applicationId: string, jobId: string, cvDocumentId: string, companyId: string) => {
    const { data } = await supabase.functions.invoke('screen-resume', { body: { applicationId, jobId, cvDocumentId, companyId } })
    return data
  },
}

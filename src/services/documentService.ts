import { supabase } from '../lib/supabase'

export interface CreateDocumentInput {
  company_id: string
  name: string
  document_type: string
  status?: string
  region?: string
  due_date?: string
  candidate_id?: string
  employee_id?: string
}

export interface UpdateDocumentInput {
  name?: string
  document_type?: string
  status?: string
  region?: string
  due_date?: string
  reminder_enabled?: boolean
  candidate_id?: string
  employee_id?: string
}

export interface PaginatedResult<T> {
  data: T[]
  cursor: string | null
  hasMore: boolean
}

export interface DocumentWithRelations extends CreateDocumentInput {
  id: string
  created_at: string
  updated_at: string
  reminder_enabled?: boolean
  candidates?: { full_name?: string } | null
  user_profiles?: { full_name?: string } | null
  [key: string]: unknown
}

export const documentService = {
  getAll: async (companyId: string, options?: { cursor?: string; limit?: number }): Promise<PaginatedResult<DocumentWithRelations>> => {
    const limit = options?.limit ?? 50
    let query = supabase
      .from('documents')
      .select('id, company_id, candidate_id, employee_id, document_type, name, status, due_date, region, reminder_enabled, created_at, updated_at, candidates(full_name), user_profiles!employee_id(full_name)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit + 1)

    if (options?.cursor) {
      query = query.lt('created_at', options.cursor)
    }

    const { data, error } = await query
    if (error) throw error

    const rows = (data ?? []) as DocumentWithRelations[]
    const hasMore = rows.length > limit
    const items = hasMore ? rows.slice(0, limit) : rows
    const nextCursor = hasMore ? items[items.length - 1].created_at : null

    return { data: items, cursor: nextCursor, hasMore }
  },
  getByType: async (companyId: string, docType: string) => {
    const { data, error } = await supabase.from('documents').select('id, company_id, name, document_type, status, region, due_date, created_at, updated_at, reminder_enabled, candidate_id, employee_id').eq('company_id', companyId).eq('document_type', docType)
    if (error) throw error
    return data
  },
  create: async (doc: CreateDocumentInput) => {
    const { data, error } = await supabase.from('documents').insert(doc).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: UpdateDocumentInput, companyId: string) => {
    const { data, error } = await supabase.from('documents').update(updates).eq('id', id).eq('company_id', companyId).select().single()
    if (error) throw error
    return data
  },
  sendReminder: async (docId: string) => {
    const { data } = await supabase.functions.invoke('send-document-reminders', { body: { docId } })
    return data
  },
}

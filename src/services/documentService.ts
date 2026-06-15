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

export const documentService = {
  getAll: async (companyId: string) => {
    const { data, error } = await supabase.from('documents').select('*, candidates(full_name), user_profiles!employee_id(full_name)').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) throw error
    return data
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

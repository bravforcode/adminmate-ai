import { supabase } from '../lib/supabase'

export const documentService = {
  getAll: async (companyId: string) => {
    const { data, error } = await supabase.from('documents').select('*, candidates(full_name), user_profiles!employee_id(full_name)').eq('company_id', companyId).order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
  getByType: async (companyId: string, docType: string) => {
    const { data, error } = await supabase.from('documents').select('*').eq('company_id', companyId).eq('document_type', docType)
    if (error) throw error
    return data
  },
  create: async (doc: Record<string, unknown>) => {
    const { data, error } = await supabase.from('documents').insert(doc).select().single()
    if (error) throw error
    return data
  },
  update: async (id: string, updates: Record<string, unknown>) => {
    const { data, error } = await supabase.from('documents').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  },
  sendReminder: async (docId: string) => {
    const { data } = await supabase.functions.invoke('send-document-reminders', { body: { docId } })
    return data
  },
}

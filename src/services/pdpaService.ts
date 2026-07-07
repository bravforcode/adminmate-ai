import { supabase } from '../lib/supabase'

export interface DataCategory {
  category: string
  table_name: string
  record_count: number
  description: string
}

export interface ConsentRecord {
  id: string
  consent_type: string
  purposes: string[]
  consent_given: boolean
  consent_form_version: string
  created_at: string
  data_subject_email?: string
}

export interface UserDataExport {
  exported_at: string
  user_id: string
  company_id: string
  profile: Record<string, unknown> | null
  consents: ConsentRecord[]
  applications: Record<string, unknown>[]
  documents: Record<string, unknown>[]
  chat_messages: Record<string, unknown>[]
  notifications: Record<string, unknown>[]
  audit_logs: Record<string, unknown>[]
  onboarding: Record<string, unknown>[]
}

export const pdpaService = {
  async exportUserData(userId: string, companyId: string): Promise<UserDataExport> {
    const [profileRes, consentsRes, appsRes, docsRes, chatRes, notifRes, auditRes, onboardRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('id', userId).single(),
      supabase.from('pdpa_consents').select('*').eq('company_id', companyId).or(`data_subject_email.eq.${userId},candidate_id.eq.${userId},employee_id.eq.${userId}`).order('created_at', { ascending: false }),
      supabase.from('applications').select('*, candidates(full_name, email)').eq('company_id', companyId),
      supabase.from('documents').select('*').eq('company_id', companyId),
      supabase.from('chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
      supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(200),
      supabase.from('audit_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(500),
      supabase.from('onboarding_checklists').select('*, onboarding_tasks(*)').eq('user_id', userId),
    ])

    return {
      exported_at: new Date().toISOString(),
      user_id: userId,
      company_id: companyId,
      profile: profileRes.data,
      consents: (consentsRes.data ?? []) as ConsentRecord[],
      applications: (appsRes.data ?? []) as Record<string, unknown>[],
      documents: (docsRes.data ?? []) as Record<string, unknown>[],
      chat_messages: (chatRes.data ?? []) as Record<string, unknown>[],
      notifications: (notifRes.data ?? []) as Record<string, unknown>[],
      audit_logs: (auditRes.data ?? []) as Record<string, unknown>[],
      onboarding: (onboardRes.data ?? []) as Record<string, unknown>[],
    }
  },

  async deleteUserData(userId: string, companyId: string): Promise<{ success: boolean; anonymized_tables: string[] }> {
    const anonymizedTables: string[] = []
    const deletedEmail = `deleted_${userId.slice(0, 8)}@anonymized.local`
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId))
    const hashedEmail = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)

    // Get the user's original email BEFORE any updates
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('id', userId)
      .single()
    const originalEmail = userProfile?.email

    const profileRes = await supabase.from('user_profiles').update({
      full_name: 'Deleted User',
      email: `${hashedEmail}@deleted.local`,
      phone: null,
      location: null,
      current_position: null,
    }).eq('id', userId)
    if (!profileRes.error) anonymizedTables.push('user_profiles')

    const candidateRes = await supabase.from('candidates').update({
      full_name: 'Deleted User',
      email: deletedEmail,
      phone: null,
      location: null,
      linkedin_url: null,
      portfolio_url: null,
    }).eq('email', originalEmail)
    if (!candidateRes.error) anonymizedTables.push('candidates')

    await supabase.from('chat_messages').update({ content: '[Message deleted]' }).eq('user_id', userId)
    anonymizedTables.push('chat_messages')

    await supabase.from('pdpa_consents').update({
      data_subject_email: deletedEmail,
      consent_given: false,
      purposes: [],
    }).eq('company_id', companyId)
    anonymizedTables.push('pdpa_consents')

    await supabase.from('audit_logs').insert({
      company_id: companyId,
      user_id: userId,
      action: 'pdpa_data_deletion',
      resource_type: 'user',
      resource_id: userId,
      details: { anonymized_tables: anonymizedTables, reason: 'user_requested_deletion' },
    })

    return { success: true, anonymized_tables: anonymizedTables }
  },

  async getDataCategories(userId: string, companyId: string): Promise<DataCategory[]> {
    const categories: DataCategory[] = []

    const profileRes = await supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('id', userId)
    categories.push({ category: 'Profile Information', table_name: 'user_profiles', record_count: profileRes.count ?? 0, description: 'Name, email, phone, position' })

    const consentsRes = await supabase.from('pdpa_consents').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    categories.push({ category: 'Consent Records', table_name: 'pdpa_consents', record_count: consentsRes.count ?? 0, description: 'PDPA consent history and purposes' })

    const appsRes = await supabase.from('applications').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    categories.push({ category: 'Job Applications', table_name: 'applications', record_count: appsRes.count ?? 0, description: 'Application history, CV data, AI analysis' })

    const docsRes = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('company_id', companyId)
    categories.push({ category: 'Documents', table_name: 'documents', record_count: docsRes.count ?? 0, description: 'Uploaded files and parsed content' })

    const chatRes = await supabase.from('chat_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    categories.push({ category: 'Chat Messages', table_name: 'chat_messages', record_count: chatRes.count ?? 0, description: 'AI assistant conversation history' })

    const auditRes = await supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    categories.push({ category: 'Audit Logs', table_name: 'audit_logs', record_count: auditRes.count ?? 0, description: 'System activity and action history' })

    return categories
  },

  async getConsentHistory(userId: string, companyId: string): Promise<ConsentRecord[]> {
    const { data, error } = await supabase
      .from('pdpa_consents')
      .select('*')
      .eq('company_id', companyId)
      .or(`data_subject_email.eq.${userId},candidate_id.eq.${userId},employee_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as ConsentRecord[]
  },

  async withdrawConsent(consentId: string): Promise<void> {
    const { error } = await supabase
      .from('pdpa_consents')
      .update({
        consent_given: false,
        withdrawn_at: new Date().toISOString(),
        purposes: [],
      })
      .eq('id', consentId)

    if (error) throw error
  },

  downloadJSON(data: UserDataExport, filename = 'pdpa-data-export.json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  },

  downloadCSV(data: Record<string, unknown>[], filename: string) {
    if (data.length === 0) return
    const headers = Object.keys(data[0])
    const sanitize = (v: string) => sanitizeCSVCell(v)
    const rows = data.map(row => headers.map(h => sanitize(String(row[h] ?? ''))))
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
  },
}

export function sanitizeCSVCell(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`
  }
  return value
}

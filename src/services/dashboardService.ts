import { supabase } from '../lib/supabase'

export interface DashboardStats {
  active_jobs: number
  closed_jobs: number
  draft_jobs: number
  total_candidates: number
  new_applicants_7d: number
  new_applicants_30d: number
  total_applications: number
  hired_count: number
  rejected_count: number
  upcoming_interviews: number
  pending_documents: number
  expiring_documents: number
  active_onboarding: number
  completed_onboarding: number
  pending_offers: number
  accepted_offers: number
  refreshed_at: string
}

export interface RecentActivityItem {
  id: string
  type: 'application' | 'job' | 'candidate'
  title: string
  subtitle: string
  status: string
  created_at: string
}

export const dashboardService = {
  getStats: async (companyId: string): Promise<DashboardStats | null> => {
    const { data, error } = await supabase.rpc('get_dashboard_stats', { p_company_id: companyId })
    if (error) {
      console.warn('get_dashboard_stats RPC failed, falling back to direct queries:', error.message)
      return null
    }
    return (data as DashboardStats) ?? null
  },

  getRecentActivity: async (companyId: string, limit = 10): Promise<RecentActivityItem[]> => {
    const { data, error } = await supabase.rpc('get_recent_activity', {
      p_company_id: companyId,
      p_limit: limit,
    })
    if (error) throw error
    return (data as RecentActivityItem[]) ?? []
  },

  refresh: async (): Promise<void> => {
    await supabase.rpc('refresh_dashboard_stats')
  },
}

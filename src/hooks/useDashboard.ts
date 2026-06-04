import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { dashboardService, DashboardStats, RecentActivityItem } from '../services/dashboardService'

const KEYS = {
  stats: (companyId: string) => ['dashboard', 'stats', companyId] as const,
  activity: (companyId: string, limit: number) => ['dashboard', 'activity', companyId, limit] as const,
}

async function fetchStatsWithFallback(companyId: string): Promise<DashboardStats> {
  const rpc = await dashboardService.getStats(companyId)
  if (rpc) return rpc

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const [jobsRes, appsRes, docsRes, onboardingRes] = await Promise.all([
    supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
    supabase.from('applications').select('id', { count: 'exact', head: true }).eq('company_id', companyId).gte('created_at', sevenDaysAgo),
    supabase.from('documents').select('id', { count: 'exact', head: true }).eq('company_id', companyId).in('status', ['draft', 'pending_signature']),
    supabase.from('onboarding_checklists').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'in_progress'),
  ])

  return {
    active_jobs: jobsRes.count || 0,
    closed_jobs: 0,
    draft_jobs: 0,
    total_candidates: 0,
    new_applicants_7d: appsRes.count || 0,
    new_applicants_30d: 0,
    total_applications: 0,
    hired_count: 0,
    rejected_count: 0,
    upcoming_interviews: 0,
    pending_documents: docsRes.count || 0,
    expiring_documents: 0,
    active_onboarding: onboardingRes.count || 0,
    completed_onboarding: 0,
    pending_offers: 0,
    accepted_offers: 0,
    refreshed_at: new Date().toISOString(),
  }
}

export function useDashboardStats() {
  const company = useAuthStore(s => s.company)
  return useQuery({
    queryKey: KEYS.stats(company?.id ?? ''),
    queryFn: () => fetchStatsWithFallback(company!.id),
    enabled: !!company?.id,
    staleTime: 60_000,
    refetchInterval: 300_000,
  })
}

export function useRecentActivity(limit = 10) {
  const company = useAuthStore(s => s.company)
  return useQuery<RecentActivityItem[]>({
    queryKey: KEYS.activity(company?.id ?? '', limit),
    queryFn: () => dashboardService.getRecentActivity(company!.id, limit),
    enabled: !!company?.id,
    staleTime: 30_000,
  })
}

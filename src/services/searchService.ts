import { supabase } from '../lib/supabase'

export interface SearchResult {
  id: string
  title: string
  subtitle: string
  type: 'candidate' | 'job' | 'application' | 'interview'
  route: string
}

export interface GlobalSearchResults {
  candidates: SearchResult[]
  jobs: SearchResult[]
  applications: SearchResult[]
  interviews: SearchResult[]
}

export const searchService = {
  globalSearch: async (companyId: string, query: string): Promise<GlobalSearchResults> => {
    // Escape LIKE wildcards to prevent blind data enumeration via % and _ characters
    const sanitizedQuery = query.replace(/[%_]/g, '\\$&')
    // Minimum query length (3 chars) to reduce attack surface
    if (!query || query.trim().length < 3) return { candidates: [], jobs: [], applications: [], interviews: [] }
    // TODO: Add server-side rate limiting to prevent brute-force enumeration attacks
    const q = `%${sanitizedQuery}%`

    const [candidatesRes, jobsRes, applicationsRes, interviewsRes] = await Promise.all([
      supabase
        .from('candidates')
        .select('id, full_name, current_position, email, location')
        .eq('company_id', companyId)
        .or(`full_name.ilike.${q},current_position.ilike.${q},email.ilike.${q},location.ilike.${q}`)
        .limit(5),
      supabase
        .from('jobs')
        .select('id, title, department, location, status')
        .eq('company_id', companyId)
        .or(`title.ilike.${q},department.ilike.${q},location.ilike.${q}`)
        .limit(5),
      supabase
        .from('applications')
        .select('id, status, candidate_name, candidate_email, ai_match_score, candidates(full_name), jobs(title)')
        .eq('company_id', companyId)
        .or(`candidate_name.ilike.${q},candidate_email.ilike.${q},status.ilike.${q}`)
        .limit(5),
      supabase
        .from('interviews')
        .select('id, status, scheduled_at, interview_type, interviewer_name, applications(candidates(full_name), jobs(title))')
        .eq('company_id', companyId)
        .or(`interviewer_name.ilike.${q},interview_type.ilike.${q},status.ilike.${q}`)
        .limit(5),
    ])

    const candidates: SearchResult[] = (candidatesRes.data ?? []).map((c: Record<string, unknown>) => ({
      id: c.id as string,
      title: (c.full_name as string) || 'Unknown',
      subtitle: [c.current_position, c.email, c.location].filter(Boolean).join(' · ') || '',
      type: 'candidate' as const,
      route: `/recruitment/candidates/${c.id}`,
    }))

    const jobs: SearchResult[] = (jobsRes.data ?? []).map((j: Record<string, unknown>) => ({
      id: j.id as string,
      title: (j.title as string) || 'Untitled Job',
      subtitle: [j.department, j.location, j.status].filter(Boolean).join(' · ') || '',
      type: 'job' as const,
      route: `/recruitment/jobs/${j.id}`,
    }))

    const applications: SearchResult[] = (applicationsRes.data ?? []).map((a: Record<string, unknown>) => {
      const candidate = a.candidates as { full_name?: string } | null
      const job = a.jobs as { title?: string } | null
      return {
        id: a.id as string,
        title: candidate?.full_name || (a.candidate_name as string) || 'Unknown',
        subtitle: [job?.title, a.status, a.ai_match_score != null ? `${Math.round((a.ai_match_score as number) * 100)}% match` : null].filter(Boolean).join(' · ') || '',
        type: 'application' as const,
        route: `/recruitment/pipeline`,
      }
    })

    const interviews: SearchResult[] = (interviewsRes.data ?? []).map((i: Record<string, unknown>) => {
      const app = i.applications as { candidates?: { full_name?: string }; jobs?: { title?: string } } | null
      const date = i.scheduled_at ? new Date(i.scheduled_at as string).toLocaleDateString() : ''
      return {
        id: i.id as string,
        title: app?.candidates?.full_name || 'Unknown',
        subtitle: [app?.jobs?.title, i.interview_type, date].filter(Boolean).join(' · ') || '',
        type: 'interview' as const,
        route: `/recruitment/interviews`,
      }
    })

    return { candidates, jobs, applications, interviews }
  },
}

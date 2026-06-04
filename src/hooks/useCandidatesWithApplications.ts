import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { candidateService, CandidateWithApplications } from '../services/candidateService'

const KEYS = {
  allWithApps: (companyId: string) => ['candidates', 'with-applications', companyId] as const,
}

export function useCandidatesWithApplications() {
  const company = useAuthStore(s => s.company)
  return useQuery<CandidateWithApplications[]>({
    queryKey: KEYS.allWithApps(company?.id ?? ''),
    queryFn: () => candidateService.getAllWithApplications(company!.id),
    enabled: !!company?.id,
    staleTime: 30_000,
  })
}

import { useQuery, type UseQueryOptions, type UseQueryResult } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'

interface CompanyQueryOptions<TData>
  extends Omit<UseQueryOptions<TData, Error>, 'queryKey' | 'queryFn'> {
  queryKey: string[]
  queryFn: (companyId: string) => Promise<TData>
}

export function useCompanyQuery<TData>({
  queryKey,
  queryFn,
  ...options
}: CompanyQueryOptions<TData>): UseQueryResult<TData, Error> {
  const company = useAuthStore((s) => s.company)
  const companyId = company?.id ?? ''

  return useQuery({
    queryKey: [...queryKey, companyId],
    queryFn: () => queryFn(companyId),
    enabled: !!companyId && options.enabled !== false,
    ...options,
  })
}

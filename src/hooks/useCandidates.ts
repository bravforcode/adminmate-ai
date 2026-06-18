import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { candidateService } from '../services/candidateService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import i18n from '../lib/i18n'

const KEYS = { all: ['candidates'] as const, list: (id: string) => ['candidates', 'list', id] as const, detail: (id: string) => ['candidates', 'detail', id] as const }

export function useCandidates() {
  const company = useAuthStore(s => s.company)
  const isHR = useAuthStore(s => s.isAdminOrHR())
  return useQuery({ queryKey: KEYS.list(company?.id ?? ''), queryFn: () => candidateService.getAll(company!.id), enabled: !!company?.id && isHR })
}

export function useCandidate(id: string) {
  const company = useAuthStore(s => s.company)
  return useQuery({ queryKey: KEYS.detail(id), queryFn: () => candidateService.getById(id, company!.id), enabled: !!id && !!company?.id })
}

export function useCreateCandidate() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({
    mutationFn: candidateService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.list(company?.id ?? '') })
      toast.success(i18n.t('recruitment:toasts.candidate_created'))
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

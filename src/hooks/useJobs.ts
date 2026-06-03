import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobService } from '../services/jobService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

const KEYS = { all: ['jobs'] as const, list: (id: string) => ['jobs', 'list', id] as const, detail: (id: string) => ['jobs', 'detail', id] as const }

export function useJobs() {
  const company = useAuthStore(s => s.company)
  return useQuery({ queryKey: KEYS.list(company?.id ?? ''), queryFn: () => jobService.getAll(company!.id), enabled: !!company?.id, staleTime: 30_000 })
}

export function useJob(id: string) {
  return useQuery({ queryKey: KEYS.detail(id), queryFn: () => jobService.getById(id), enabled: !!id })
}

export function useCreateJob() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({ mutationFn: jobService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.list(company?.id ?? '') }); toast.success('Job created') }, onError: (e: Error) => toast.error(e.message) })
}

export function useUpdateJob() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => jobService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.list(company?.id ?? '') }) }, onError: (e: Error) => toast.error(e.message) })
}

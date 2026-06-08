import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { interviewService } from '../services/interviewService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export function useUpcomingInterviews() {
  const company = useAuthStore(s => s.company)
  return useQuery({ queryKey: ['interviews', 'upcoming', company?.id], queryFn: () => interviewService.getUpcoming(company!.id), enabled: !!company?.id })
}

export function usePastInterviews() {
  const company = useAuthStore(s => s.company)
  return useQuery({ queryKey: ['interviews', 'past', company?.id], queryFn: () => interviewService.getPast(company!.id), enabled: !!company?.id })
}

export function useScheduleInterview() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: interviewService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['interviews'] }); toast.success('Interview scheduled') }, onError: (e: Error) => toast.error(e.message) })
}

export function useUpdateInterview() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => interviewService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['interviews'] }); toast.success('Interview updated') }, onError: (e: Error) => toast.error(e.message) })
}

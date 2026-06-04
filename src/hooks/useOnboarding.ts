import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { onboardingService } from '../services/onboardingService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export function useOnboardingChecklists() {
  const company = useAuthStore(s => s.company)
  return useQuery({ queryKey: ['onboarding', 'checklists', company?.id], queryFn: () => onboardingService.getChecklists(company!.id), enabled: !!company?.id })
}

export function useCreateChecklist() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({
    mutationFn: ({ employeeId, offerId, country }: { employeeId: string; offerId: string; country: string }) => onboardingService.createChecklist(company!.id, employeeId, offerId, country),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); toast.success('Checklist created') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  const profile = useAuthStore(s => s.profile)
  return useMutation({
    mutationFn: ({ taskId, completed }: { taskId: string; completed: boolean }) => onboardingService.updateTask(taskId, completed, profile?.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['onboarding'] }); toast.success('Task updated') },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useRecalculateProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (checklistId: string) => onboardingService.updateProgress(checklistId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['onboarding'] }),
    onError: (e: Error) => toast.error(e.message),
  })
}

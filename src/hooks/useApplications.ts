import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/applicationService'
import toast from 'react-hot-toast'

export function useApplications(jobId: string) {
  return useQuery({ queryKey: ['applications', jobId], queryFn: () => applicationService.getByJob(jobId), enabled: !!jobId })
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) => applicationService.updateStatus(id, status, notes),
    onSuccess: (_, variables) => { qc.invalidateQueries({ queryKey: ['applications'] }); toast.success(`Status updated to ${variables.status.replace('_', ' ')}`) },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useTriggerAIScreening() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ applicationId, jobId, cvDocumentId, companyId }: { applicationId: string; jobId: string; cvDocumentId: string; companyId: string }) => applicationService.triggerAIScreening(applicationId, jobId, cvDocumentId, companyId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['applications'] }); toast.success('AI screening completed') },
    onError: (e: Error) => toast.error(e.message),
  })
}

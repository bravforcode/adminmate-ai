import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { applicationService } from '../services/applicationService'
import toast from 'react-hot-toast'
import i18n from '../lib/i18n'

export function useApplications(jobId: string) {
  return useQuery({ queryKey: ['applications', jobId], queryFn: async () => { const result = await applicationService.getByJob(jobId); return result.data; }, enabled: !!jobId })
}

export function useUpdateApplicationStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) => applicationService.updateStatus(id, status, notes),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast.success(i18n.t('recruitment:toasts.status_updated', {
        status: i18n.t(`recruitment:pipeline.${variables.status}`),
      }))
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useTriggerAIScreening() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ applicationId, jobId, cvDocumentId, companyId }: { applicationId: string; jobId: string; cvDocumentId: string; companyId: string }) => applicationService.triggerAIScreening(applicationId, jobId, cvDocumentId, companyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast.success(i18n.t('recruitment:toasts.ai_screening_completed'))
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

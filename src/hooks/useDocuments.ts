import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService, type DocumentWithRelations } from '../services/documentService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import i18n from '../lib/i18n'

export function useDocuments() {
  const company = useAuthStore(s => s.company)
  return useQuery({
    queryKey: ['documents', company?.id],
    queryFn: async () => {
      const result = await documentService.getAll(company!.id)
      return result.data as unknown as DocumentWithRelations[]
    },
    enabled: !!company?.id,
  })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({
    mutationFn: ({ doc, consentGiven }: { doc: import('../services/documentService').CreateDocumentInput; consentGiven?: boolean }) => documentService.create(doc, consentGiven),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', company?.id] })
      toast.success(i18n.t('documents:document_created'))
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: import('../services/documentService').UpdateDocumentInput }) => documentService.update(id, data, company!.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents', company?.id] }) }, onError: (e: Error) => toast.error(e.message) })
}

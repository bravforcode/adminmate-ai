import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { documentService } from '../services/documentService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export function useDocuments() {
  const company = useAuthStore(s => s.company)
  return useQuery({ queryKey: ['documents', company?.id], queryFn: () => documentService.getAll(company!.id), enabled: !!company?.id })
}

export function useCreateDocument() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({ mutationFn: documentService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents', company?.id] }); toast.success('Document created') }, onError: (e: Error) => toast.error(e.message) })
}

export function useUpdateDocument() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: import('../services/documentService').UpdateDocumentInput }) => documentService.update(id, data, company!.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents', company?.id] }) }, onError: (e: Error) => toast.error(e.message) })
}

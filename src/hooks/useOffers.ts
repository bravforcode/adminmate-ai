import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { offerService } from '../services/offerService'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'

export function useOffers() {
  const company = useAuthStore(s => s.company)
  return useQuery({ queryKey: ['offers', company?.id], queryFn: () => offerService.getAll(company!.id), enabled: !!company?.id })
}

export function useCreateOffer() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({ mutationFn: offerService.create, onSuccess: () => { qc.invalidateQueries({ queryKey: ['offers', company?.id] }); toast.success('Offer created') }, onError: (e: Error) => toast.error(e.message) })
}

export function useUpdateOffer() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => offerService.update(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ['offers', company?.id] }) }, onError: (e: Error) => toast.error(e.message) })
}

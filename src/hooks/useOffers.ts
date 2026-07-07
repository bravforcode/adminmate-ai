import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { offerService } from '../services/offerService'
import type { Offer } from '../types/models'
import { useAuthStore } from '../stores/authStore'
import toast from 'react-hot-toast'
import i18n from '../lib/i18n'

export function useOffers() {
  const company = useAuthStore(s => s.company)
  return useQuery({
    queryKey: ['offers', company?.id],
    queryFn: async () => {
      const result = await offerService.getAll(company!.id)
      return result.data as unknown as (Offer & { id: string; created_at?: string })[]
    },
    enabled: !!company?.id,
  })
}

export function useCreateOffer() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({
    mutationFn: offerService.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offers', company?.id] })
      toast.success(i18n.t('hiring:toasts.offer_created'))
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

export function useUpdateOffer() {
  const qc = useQueryClient()
  const company = useAuthStore(s => s.company)
  return useMutation({ mutationFn: ({ id, data }: { id: string; data: import('../services/offerService').UpdateOfferInput }) => offerService.update(id, data, company!.id), onSuccess: () => { qc.invalidateQueries({ queryKey: ['offers', company?.id] }) }, onError: (e: Error) => toast.error(e.message) })
}

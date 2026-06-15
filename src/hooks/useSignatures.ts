import { useQuery } from '@tanstack/react-query'
import { signatureService } from '../services/signatureService'

export function useSignatures(documentId: string | null) {
  return useQuery({
    queryKey: ['signatures', documentId],
    queryFn: () => signatureService.getSignatures(documentId!),
    enabled: !!documentId,
  })
}

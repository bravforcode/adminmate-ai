import { useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { FileText, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { signatureService } from '../../services/signatureService'
import { SignaturePad } from '../../components/documents/SignaturePad'


type SigningState = 'loading' | 'sign' | 'signed' | 'declined' | 'error' | 'not_found'

export default function DocumentSigningPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { t } = useTranslation(['documents', 'common'])

  const [state, setState] = useState<SigningState>('loading')
  const [signatureId, setSignatureId] = useState<string | null>(null)
  const [showDecline, setShowDecline] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [signerName, setSignerName] = useState('')

  const { isLoading } = useQuery({
    queryKey: ['sign', token],
    queryFn: async () => {
      if (!token) { setState('not_found'); return null }
      const data = await signatureService.getByVerificationToken(token)
      if (!data || data.status !== 'pending') {
        setState(data?.status === 'signed' ? 'signed' : data?.status === 'declined' ? 'declined' : 'not_found')
        return null
      }
      setSignatureId(data.id)
      setDocumentName(data.documents?.name || 'Document')
      setSignerName(data.signer_name)
      setState('sign')
      return data
    },
    enabled: !!token,
    retry: false,
  })

  const signMutation = useMutation({
    mutationFn: (signatureData: string) => signatureService.signDocument(signatureId!, signatureData, token!),
    onSuccess: () => setState('signed'),
    onError: () => setState('error'),
  })

  const declineMutation = useMutation({
    mutationFn: () => signatureService.declineSignature(signatureId!, token!, declineReason),
    onSuccess: () => setState('declined'),
    onError: () => setState('error'),
  })

  const handleSign = useCallback((dataUrl: string) => {
    signMutation.mutate(dataUrl)
  }, [signMutation])

  const handleDecline = useCallback(() => {
    declineMutation.mutate()
  }, [declineMutation])

  if (isLoading || state === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface bg-surface-sunken-lowest">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-primary" />
          <p className="text-sm text-ink-variant text-ink-variant">{t('common:loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface bg-surface-sunken-lowest py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {state === 'sign' && (
          <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText size={20} className="text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-ink text-ink">{t('sign_title')}</h1>
                <p className="text-sm text-ink-variant text-ink-variant">{documentName}</p>
              </div>
            </div>

            <div className="mb-6 p-4 bg-surface-sunken bg-surface-sunken/30 rounded-xl">
              <p className="text-sm text-ink-variant text-ink-variant">{t('signing_as')}</p>
              <p className="font-medium text-ink text-ink">{signerName}</p>
            </div>

            {!showDecline ? (
              <>
                <SignaturePad onSave={handleSign} className="mb-6" />

                <button
                  onClick={() => setShowDecline(true)}
                  className="w-full text-center text-sm text-ink-variant text-ink-variant hover:text-destructive dark:hover:text-destructive transition-colors py-2"
                >
                  {t('decline_to_sign')}
                </button>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-destructive dark:text-destructive">
                  <AlertTriangle size={18} />
                  <span className="font-medium">{t('decline_reason_label')}</span>
                </div>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface-sunken-lowest bg-surface-sunken-lowest text-sm focus:border-error dark:focus:border-error outline-none resize-none"
                  rows={3}
                  placeholder={t('decline_reason_placeholder')}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDecline(false)}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-surface-sunken dark:hover:bg-surface-sunken transition-colors text-ink"
                  >
                    {t('common:cancel')}
                  </button>
                  <button
                    onClick={handleDecline}
                    disabled={declineMutation.isPending}
                    className="flex-1 px-4 py-2 bg-error text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {t('confirm_decline')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {state === 'signed' && (
          <div className="bg-surface rounded-2xl border border-border p-8 shadow-lg text-center">
            <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-success-subtle/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600 dark:text-success" />
            </div>
            <h1 className="text-xl font-semibold text-ink mb-2">{t('signed_title')}</h1>
            <p className="text-ink-variant text-ink-variant">{t('signed_message')}</p>
          </div>
        )}

        {state === 'declined' && (
          <div className="bg-surface rounded-2xl border border-border p-8 shadow-lg text-center">
            <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-destructive-subtle/30 flex items-center justify-center mx-auto mb-4">
              <XCircle size={32} className="text-red-600 dark:text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-ink mb-2">{t('declined_title')}</h1>
            <p className="text-ink-variant text-ink-variant">{t('declined_message')}</p>
          </div>
        )}

        {(state === 'error' || state === 'not_found') && (
          <div className="bg-surface rounded-2xl border border-border p-8 shadow-lg text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-50 dark:bg-warning-subtle/30 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} className="text-yellow-600 dark:text-warning" />
            </div>
            <h1 className="text-xl font-semibold text-ink mb-2">{t('invalid_link_title')}</h1>
            <p className="text-ink-variant text-ink-variant">{t('invalid_link_message')}</p>
          </div>
        )}
      </div>
    </div>
  )
}

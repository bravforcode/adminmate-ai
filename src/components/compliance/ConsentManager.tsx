import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import { CheckCircle, XCircle, Clock, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface ConsentRecord {
  id: string
  consent_type: string
  purposes: string[]
  consent_given: boolean
  consent_form_version: string
  created_at: string
  withdrawn_at: string | null
  data_subject_email: string
  ip_address: string | null
}

export function ConsentManager() {
  const { t } = useTranslation('common')
  const { company } = useAuthStore()
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data: consents, isLoading } = useQuery<ConsentRecord[]>({
    queryKey: ['consent-manager', company?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('pdpa_consents')
        .select('*')
        .eq('company_id', company?.id)
        .order('created_at', { ascending: false })
      return (data || []) as ConsentRecord[]
    },
    enabled: !!company?.id,
  })

  const withdrawMutation = useMutation({
    mutationFn: async (consentId: string) => {
      const { error } = await supabase
        .from('pdpa_consents')
        .update({ consent_given: false, withdrawn_at: new Date().toISOString(), purposes: [] })
        .eq('id', consentId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success(t('pdpa.withdraw_success') || 'Consent withdrawn')
      queryClient.invalidateQueries({ queryKey: ['consent-manager'] })
    },
  })

  if (isLoading) {
    return <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-16 bg-surface-sunken rounded-lg animate-shimmer" />)}</div>
  }

  return (
    <div className="space-y-3">
      {consents?.map(consent => (
        <div key={consent.id} className="border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setExpandedId(expandedId === consent.id ? null : consent.id)}
            className="w-full flex items-center justify-between p-3 hover:bg-surface-sunken transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${consent.consent_given ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {consent.consent_given ? <CheckCircle size={16} /> : <XCircle size={16} />}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-ink">{consent.consent_type}</p>
                <p className="text-xs text-ink-muted flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(consent.created_at).toLocaleDateString()} · v{consent.consent_form_version}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                consent.consent_given
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {consent.consent_given ? 'Active' : 'Revoked'}
              </span>
              {expandedId === consent.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>
          {expandedId === consent.id && (
            <div className="px-3 pb-3 border-t border-border pt-2 space-y-2">
              <div className="text-xs text-ink-muted">
                <p><strong>Email:</strong> {consent.data_subject_email}</p>
                <p><strong>Purposes:</strong> {consent.purposes.join(', ') || 'None'}</p>
                {consent.ip_address && <p><strong>IP:</strong> {consent.ip_address}</p>}
                {consent.withdrawn_at && <p><strong>Withdrawn:</strong> {new Date(consent.withdrawn_at).toLocaleString()}</p>}
              </div>
              {consent.consent_given && (
                <button
                  onClick={() => withdrawMutation.mutate(consent.id)}
                  disabled={withdrawMutation.isPending}
                  className="flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50"
                >
                  {withdrawMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                  {t('pdpa.revoke_button') || 'Revoke'}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      {consents?.length === 0 && (
        <p className="text-sm text-ink-muted text-center py-4">{t('pdpa.no_consents') || 'No consent records found.'}</p>
      )}
    </div>
  )
}

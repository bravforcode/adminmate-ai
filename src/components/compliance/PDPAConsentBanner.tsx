import { useState, useEffect, useCallback } from 'react'
import { Shield, Check, X, ExternalLink, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { APP_URL } from '../../utils/constants'

const CONSENT_FORM_VERSION = '2.0'
const PRIVACY_POLICY_URL = `${APP_URL}/privacy`

const AVAILABLE_PURPOSES = [
  { id: 'recruitment_processing', key: 'pdpa.purpose_recruitment' },
  { id: 'cv_storage', key: 'pdpa.purpose_cv_storage' },
  { id: 'communication', key: 'pdpa.purpose_communication' },
  { id: 'analytics', key: 'pdpa.purpose_analytics' },
] as const

interface Props { candidateId?: string; employeeId?: string }

export function PDPAConsentBanner({ candidateId, employeeId }: Props) {
  const { t } = useTranslation('common')
  const { profile, company } = useAuthStore()
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedPurposes, setSelectedPurposes] = useState<Set<string>>(new Set(['recruitment_processing']))
  const [existingConsentId, setExistingConsentId] = useState<string | null>(null)

  const email = profile?.email || ''
  const subjectId = candidateId || employeeId || profile?.id || ''

  useEffect(() => {
    if (!company?.id || !subjectId) return
    supabase.from('pdpa_consents')
      .select('id, purposes, consent_given')
      .eq('company_id', company.id)
      .eq('data_subject_email', email)
      .eq('consent_given', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setExistingConsentId(data[0].id)
          setAccepted(true)
          setSelectedPurposes(new Set(data[0].purposes || []))
        }
      })
  }, [company?.id, subjectId, email])

  const togglePurpose = (id: string) => {
    setSelectedPurposes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAccept = useCallback(async () => {
    if (!company?.id || !email || selectedPurposes.size === 0) return
    setLoading(true)
    try {
      const ipAddress = typeof window !== 'undefined'
        ? await fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => d.ip).catch(() => '')
        : ''
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : ''

      if (existingConsentId) {
        await supabase.from('pdpa_consents').update({
          consent_given: true,
          purposes: Array.from(selectedPurposes),
          consent_form_version: CONSENT_FORM_VERSION,
          data_subject_email: email,
          ip_address: ipAddress,
          user_agent: userAgent,
        }).eq('id', existingConsentId)
      } else {
        await supabase.from('pdpa_consents').insert({
          company_id: company.id,
          candidate_id: candidateId,
          employee_id: employeeId,
          data_subject_email: email,
          consent_type: 'recruitment',
          purposes: Array.from(selectedPurposes),
          consent_given: true,
          consent_form_version: CONSENT_FORM_VERSION,
          ip_address: ipAddress,
          user_agent: userAgent,
        })
      }
      setAccepted(true)
    } finally {
      setLoading(false)
    }
  }, [company?.id, email, selectedPurposes, existingConsentId, candidateId, employeeId])

  const handleWithdraw = useCallback(async () => {
    if (!existingConsentId) return
    setLoading(true)
    try {
      await supabase.from('pdpa_consents').update({
        consent_given: false,
        withdrawn_at: new Date().toISOString(),
        purposes: [],
      }).eq('id', existingConsentId)
      setAccepted(false)
      setExistingConsentId(null)
      setSelectedPurposes(new Set(['recruitment_processing']))
    } finally {
      setLoading(false)
    }
  }, [existingConsentId])

  if (!subjectId) return null

  return (
    <div className={`rounded-xl border p-4 mb-4 ${
      accepted
        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        : 'bg-surface border-primary/20'
    }`}>
      <div className="flex items-start gap-3">
        <Shield size={20} className={`flex-shrink-0 mt-0.5 ${accepted ? 'text-green-600 dark:text-green-400' : 'text-primary'}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-on-surface">{t('pdpa.title')}</h4>
          <p className="text-xs text-on-surface-variant mt-1">{t('pdpa.description')}</p>

          {!accepted && (
            <div className="mt-3 space-y-2">
              {AVAILABLE_PURPOSES.map(p => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedPurposes.has(p.id)}
                    onChange={() => togglePurpose(p.id)}
                    className="rounded border-outline-variant text-primary focus:ring-primary/30"
                  />
                  <span className="text-xs text-on-surface-variant group-hover:text-on-surface transition-colors">
                    {t(p.key)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {accepted && existingConsentId && (
            <div className="mt-2 flex items-center gap-2">
              <Check size={14} className="text-green-600 dark:text-green-400" />
              <span className="text-xs text-green-700 dark:text-green-300">
                {t('pdpa.consent_active') || 'Consent given'} · v{CONSENT_FORM_VERSION}
              </span>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2 items-center">
            {!accepted ? (
              <button
                onClick={handleAccept}
                disabled={loading || selectedPurposes.size === 0 || !email}
                className="flex items-center gap-1 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                {t('pdpa.consent_button')}
              </button>
            ) : (
              <button
                onClick={handleWithdraw}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-error/10 text-error rounded-lg text-xs font-medium hover:bg-error/20 disabled:opacity-50"
              >
                {loading ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                {t('pdpa.withdraw_button') || 'Withdraw Consent'}
              </button>
            )}
            <a
              href={PRIVACY_POLICY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <ExternalLink size={12} />
              {t('pdpa.privacy_policy') || 'Privacy Policy'}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Logo } from '../../components/brand/Logo'
import { CheckCircle, Clock, XCircle, AlertCircle, Loader2 } from 'lucide-react'

/* ============================================================
   AdminMate AI — Public Application Tracking Page
   Route: /portal/track/:trackingToken (no auth required)
   ============================================================ */

interface ApplicationStatus {
  id: string
  status: string
  applied_at: string
  job_title: string
  company_name: string
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const STATUS_CONFIG: Record<string, { icon: typeof CheckCircle; color: string; label: Record<string, string> }> = {
  applied: { icon: Clock, color: 'text-blue-500', label: { en: 'Applied', th: 'สมัครแล้ว' } },
  screened: { icon: Clock, color: 'text-yellow-500', label: { en: 'Under Review', th: 'อยู่ระหว่างตรวจสอบ' } },
  shortlisted: { icon: CheckCircle, color: 'text-green-500', label: { en: 'Shortlisted', th: 'ผ่านการคัดเลือก' } },
  interviewed: { icon: Clock, color: 'text-purple-500', label: { en: 'Interviewed', th: 'สัมภาษณ์แล้ว' } },
  offered: { icon: CheckCircle, color: 'text-green-600', label: { en: 'Offer Extended', th: 'ได้รับข้อเสนอ' } },
  hired: { icon: CheckCircle, color: 'text-green-700', label: { en: 'Hired', th: 'ได้รับการว่าจ้าง' } },
  rejected: { icon: XCircle, color: 'text-red-500', label: { en: 'Not Selected', th: 'ไม่ผ่านการคัดเลือก' } },
}

export default function TrackApplicationPage() {
  const { trackingToken } = useParams<{ trackingToken: string }>()
  const { t, i18n } = useTranslation('portal')

  const [application, setApplication] = useState<ApplicationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!trackingToken) return
    const controller = new AbortController()

    async function fetchStatus() {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/track-application?token=${trackingToken}`, {
          signal: controller.signal,
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        setApplication(json.application)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (!(err instanceof DOMException && err.name === 'AbortError')) setError(msg || 'Failed to track application')
      } finally {
        setLoading(false)
      }
    }
    fetchStatus()
    return () => controller.abort()
  }, [trackingToken])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 mx-auto text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            {t('track.not_found')}
          </h1>
          <p className="text-secondary mb-6">
            {error || t('track.not_found_msg')}
          </p>
          <Link to="/" className="text-[var(--color-primary)] hover:underline">
            {t('apply.back_home')}
          </Link>
        </div>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[application.status] || STATUS_CONFIG.applied
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Minimal header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <Logo size={22} showText={false} />
          <span className="text-sm font-medium text-secondary">AdminMate AI</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6">
          {t('track.title')}
        </h1>

        {/* Status card */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center bg-current/10 ${statusConfig.color}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--color-text-primary)]">
                {t(`track.statuses.${application.status}`, statusConfig.label.en)}
              </h2>
              <p className="text-sm text-secondary">
                {application.job_title}
              </p>
            </div>
          </div>
          <div className="border-t border-[var(--color-border)] pt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-secondary">{t('track.company')}</span>
              <span className="text-[var(--color-text-primary)] font-medium">{application.company_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">{t('track.applied')}</span>
              <span className="text-[var(--color-text-primary)]">
                {new Date(application.applied_at).toLocaleDateString(i18n.language === 'th' ? 'th-TH' : 'en-US')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-secondary">{t('track.status')}</span>
              <span className={`font-medium ${statusConfig.color}`}>
                {t(`track.statuses.${application.status}`, statusConfig.label.en)}
              </span>
            </div>
          </div>
        </div>

        {/* Tracking code */}
        <div className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-6 mb-8">
          <p className="text-sm text-secondary mb-1">
            {t('track.your_code')}
          </p>
          <p className="font-mono text-lg font-bold text-[var(--color-primary)]">{trackingToken}</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-2">
            {t('track.save_code')}
          </p>
        </div>

        <footer className="text-center text-xs text-[var(--color-text-muted)]">
          Powered by AdminMate AI
        </footer>
      </main>
    </div>
  )
}

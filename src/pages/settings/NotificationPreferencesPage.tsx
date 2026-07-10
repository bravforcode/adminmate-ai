import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { notificationPreferencesService, NOTIFICATION_TYPES, type NotificationPreference, type PreferenceType } from '../../services/notificationPreferencesService'
import { Bell, Mail, Smartphone, ArrowLeft } from 'lucide-react'
import { cn } from '../../lib/utils'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={cn(
        'relative w-11 h-6 rounded-full transition-colors',
        enabled ? 'bg-primary' : 'bg-surface-sunken border border-border',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      <div
        className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full shadow-sm transition-all',
          enabled ? 'right-0.5 bg-white' : 'left-0.5 bg-outline-variant',
        )}
      />
    </button>
  )
}

export function NotificationPreferencesPage() {
  const { t } = useTranslation('common')
  const profile = useAuthStore((s) => s.profile)
  const company = useAuthStore((s) => s.company)
  const [preferences, setPreferences] = useState<Record<PreferenceType, NotificationPreference | null>>({
    application_received: null,
    interview_scheduled: null,
    offer_sent: null,
    document_reminder: null,
    onboarding_update: null,
    chatbot_message: null,
    system_alert: null,
  })
  const [loading, setLoading] = useState(true)

  const loadPreferences = useCallback(async () => {
    if (!profile?.id) return
    try {
      const data = await notificationPreferencesService.getPreferences(profile.id)
      const map: Record<string, NotificationPreference> = {}
      data.forEach((p) => { map[p.preference_type] = p })
      const merged: typeof preferences = {
        application_received: null, interview_scheduled: null, offer_sent: null,
        document_reminder: null, onboarding_update: null, chatbot_message: null, system_alert: null,
      }
      Object.keys(merged).forEach((k) => { merged[k as PreferenceType] = map[k] ?? null })
      setPreferences(merged)
    } catch {
      toast.error(t('errors.generic'))
    } finally {
      setLoading(false)
    }
  }, [profile?.id, t])

  useEffect(() => { loadPreferences() }, [loadPreferences])

  const toggle = async (type: PreferenceType, field: 'email_enabled' | 'in_app_enabled') => {
    const current = preferences[type]
    const currentVal = current ? current[field] : true
    const newVal = !currentVal

    setPreferences((prev) => ({
      ...prev,
      [type]: current
        ? { ...current, [field]: newVal }
        : { id: '', user_id: profile?.id ?? '', company_id: company?.id ?? '', preference_type: type, email_enabled: field === 'email_enabled' ? newVal : true, in_app_enabled: field === 'in_app_enabled' ? newVal : true, push_enabled: false, created_at: '', updated_at: '' },
    }))

    try {
      if (!profile?.id || !company?.id) return
      await notificationPreferencesService.updatePreference(profile.id, type, { [field]: newVal }, company.id)
    } catch {
      setPreferences((prev) => ({
        ...prev,
        [type]: current ? { ...current, [field]: currentVal } : null,
      }))
      toast.error(t('errors.generic'))
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-sunken rounded-lg animate-shimmer" />
        <div className="space-y-4 skeleton-stagger">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-surface-sunken rounded-xl animate-shimmer" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/settings" className="inline-flex items-center gap-1 text-sm text-ink-variant hover:text-primary mb-3">
          <ArrowLeft size={14} /> {t('settings.title') || 'Settings'}
        </Link>
        <h1 className="text-headline-md font-bold text-ink">{t('notifications_prefs.title') || 'Notification Preferences'}</h1>
        <p className="text-body-md text-ink-variant mt-1">{t('notifications_prefs.subtitle') || 'Choose how you want to be notified'}</p>
      </div>

      <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-surface-container pb-3">
          <Bell size={20} className="text-primary" />
          <h3 className="text-title-lg font-semibold text-ink">{t('notifications_prefs.channels') || 'Notification Channels'}</h3>
        </div>

        <div className="grid grid-cols-12 text-xs font-medium text-ink-variant mb-3 px-1">
          <div className="col-span-5 sm:col-span-4">{t('notifications_prefs.type') || 'Type'}</div>
          <div className="col-span-1" />
          <div className="col-span-3 sm:col-span-2 text-center">{t('notifications_prefs.email') || 'Email'}</div>
          <div className="col-span-3 sm:col-span-2 text-center">{t('notifications_prefs.in_app') || 'In-App'}</div>
        </div>

        <div className="divide-y divide-outline-variant">
          {NOTIFICATION_TYPES.map(({ type, labelKey, descKey }) => {
            const pref = preferences[type]
            return (
              <div key={type} className="grid grid-cols-12 items-center py-4 px-1 gap-2">
                <div className="col-span-5 sm:col-span-4">
                  <div className="text-sm font-medium text-ink">{t(labelKey) || type.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-ink-variant mt-0.5">{t(descKey) || ''}</div>
                </div>
                <div className="col-span-1 flex justify-center">
                  <Smartphone size={14} className="text-ink-variant hidden sm:block" />
                </div>
                <div className="col-span-3 sm:col-span-2 flex justify-center">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-ink-variant hidden sm:block" />
                    <Toggle
                      enabled={pref?.email_enabled ?? true}
                      onChange={() => toggle(type, 'email_enabled')}
                    />
                  </div>
                </div>
                <div className="col-span-3 sm:col-span-2 flex justify-center">
                  <Toggle
                    enabled={pref?.in_app_enabled ?? true}
                    onChange={() => toggle(type, 'in_app_enabled')}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default NotificationPreferencesPage

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore, useAuthLoading, useAuthError } from '../../stores/authStore'
import { companyService } from '../../services/companyService'
import { Save, Building2, Shield, Gavel, MessageSquare, Phone, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { cn } from '../../utils/cn'
import { LoadingState } from '../../components/shared/LoadingState'
import { ErrorState } from '../../components/shared/ErrorState'

const companySchema = z.object({ name: z.string().min(1), name_th: z.string().optional(), tax_id: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')), city: z.string().optional(), website_url: z.string().optional(), industry: z.string().optional() })

type FormData = z.infer<typeof companySchema>

export function SettingsPage() {
  const { t } = useTranslation('common')
  const { profile, company, setCompany } = useAuthStore()
  const isLoading = useAuthLoading()
  const authError = useAuthError()
  const [saving, setSaving] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(companySchema),
    values: { name: company?.name || '', name_th: company?.name_th || '', tax_id: company?.tax_id || '', phone: company?.phone || '', email: company?.email || '', city: company?.city || '', industry: company?.industry || '' },
  })

  const onSubmit = async (data: FormData) => {
    if (!company?.id) return
    setSaving(true)
    try {
      const updated = await companyService.update(company.id, data)
      setCompany(updated)
      toast.success(t('settings.saved') || 'Settings saved')
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed to save settings') }
    finally { setSaving(false) }
  }

  if (isLoading && !company) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-surface-container-high rounded animate-pulse" />
          <div className="h-4 w-64 bg-surface-container-high rounded animate-pulse mt-2" />
        </div>
        <LoadingState variant="cards" rows={3} />
      </div>
    )
  }

  if (authError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">{t('settings.title') || 'Settings'}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{t('settings.subtitle') || 'Manage your company and account settings'}</p>
        </div>
        <ErrorState
          title={t('errors.load_failed', { ns: 'common' })}
          message={authError}
          onRetry={() => window.location.reload()}
          retryLabel={t('errors.retry', { ns: 'common' })}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h1 className="text-headline-md font-bold text-on-surface">{t('settings.title') || 'Settings'}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{t('settings.subtitle') || 'Manage your company and account settings'}</p>
        </div>
        <button type="submit" form="settings-form" disabled={saving}
          className="flex items-center justify-center gap-2 px-6 py-2 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 disabled:opacity-50 shadow-sm self-start sm:self-auto">
          <Save size={16} /> {saving ? (t('settings.saving') || 'Saving...') : (t('settings.save_changes') || 'Save Changes')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Company Profile (8) */}
        <div className="lg:col-span-8">
          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-surface-container pb-3">
              <Building2 size={20} className="text-primary" />
              <h3 className="text-title-lg font-semibold text-on-surface">{t('settings.company_profile') || 'Company Profile'}</h3>
            </div>
            <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-6 mb-2">
                <div className="w-full sm:w-32 h-32 rounded-xl bg-surface-container-low border border-outline-variant flex-shrink-0 flex items-center justify-center text-on-surface-variant">
                  <Building2 size={40} />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('settings.legal_name') || 'Legal Name (English)'} *</label>
                    <input {...register('name')}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    {errors.name && <p className="text-error text-xs mt-1">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('settings.tax_id') || 'Tax ID'}</label>
                    <input {...register('tax_id')}
                      className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('settings.industry') || 'Primary Industry'}</label>
                    <select {...register('industry')} className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                      <option value="">Select industry...</option>
                      <option value="Technology">Technology</option>
                      <option value="Finance">Finance</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Manufacturing">Manufacturing</option>
                      <option value="Retail">Retail</option>
                      <option value="Education">Education</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('settings.phone') || 'Phone'}</label>
                  <input {...register('phone')}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('settings.email') || 'Email'}</label>
                  <input {...register('email')} type="email"
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-on-surface-variant">{t('settings.city') || 'City'}</label>
                  <input {...register('city')}
                    className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Account + Pricing (4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={20} className="text-primary" />
              <h3 className="text-title-lg font-semibold text-on-surface">{t('settings.account') || 'Account'}</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-outline-variant"><span className="text-on-surface-variant">{t('settings.name') || 'Name'}</span><span className="font-medium">{profile?.full_name}</span></div>
              <div className="flex justify-between py-2 border-b border-outline-variant"><span className="text-on-surface-variant">{t('settings.email') || 'Email'}</span><span className="font-medium">{profile?.email}</span></div>
              <div className="flex justify-between py-2 border-b border-outline-variant"><span className="text-on-surface-variant">{t('settings.role') || 'Role'}</span><span className="font-medium">{profile?.role}</span></div>
              <div className="flex justify-between py-2 border-b border-outline-variant"><span className="text-on-surface-variant">{t('settings.country') || 'Country'}</span><span className="font-medium">{company?.country}</span></div>
              <div className="flex justify-between py-2"><span className="text-on-surface-variant">{t('settings.subscription') || 'Subscription'}</span><span className="font-medium capitalize">{company?.subscription_tier || 'free'}</span></div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-fixed-dim rounded-full blur-3xl opacity-20 pointer-events-none" />
            <div className="flex justify-between items-start mb-3">
              <h3 className="text-title-lg font-semibold text-on-surface">{t('settings.current_plan') || 'Current Plan'}</h3>
              <span className="bg-primary-fixed text-on-primary-fixed-variant px-2 py-0.5 rounded text-xs font-semibold capitalize">{company?.subscription_tier || 'Free'}</span>
            </div>
            <div className="mb-4">
              <p className="text-3xl font-bold text-primary tracking-tight">—</p>
              <p className="text-sm text-on-surface-variant">{t('settings.contact_sales') || 'Contact sales for plan details'}</p>
            </div>
            <button onClick={() => toast('Billing portal will open in a new tab')} className="w-full bg-surface border border-outline-variant text-primary rounded-lg py-2 text-sm font-medium hover:bg-surface-container-low transition-colors">
              {t('settings.manage_billing') || 'Manage Billing'}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Compliance */}
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 border-b border-surface-container pb-3">
            <div className="flex items-center gap-2">
              <Gavel size={20} className="text-tertiary" />
              <h3 className="text-title-lg font-semibold text-on-surface">{t('settings.regional_compliance') || 'Regional Compliance'}</h3>
            </div>
            <span className="text-xs font-semibold text-on-surface-variant bg-surface-container px-2 py-1 rounded">DATA GOVERNANCE</span>
          </div>
          <div className="space-y-4">
            {[
              { code: 'TH', name: 'Thailand (PDPA)', desc: 'Data residency in Bangkok, strict consent logs.', active: true },
              { code: 'VN', name: 'Vietnam (Decree 13)', desc: 'Cross-border transfer assessments active.', active: true },
              { code: 'ID', name: 'Indonesia (PDP Law)', desc: 'Pending DPO appointment verification.', active: false },
            ].map(item => (
              <div key={item.code} className="flex items-center justify-between p-3 bg-surface-container-lowest border border-outline-variant rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary font-bold text-lg">{item.code}</div>
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface">{item.name}</h4>
                    <p className="text-xs text-on-surface-variant">{item.desc}</p>
                  </div>
                </div>
                <div className={cn('w-12 h-6 rounded-full relative cursor-pointer transition-colors', item.active ? 'bg-primary' : 'bg-surface-container-high border border-outline-variant')}>
                  <div className={cn('absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all', item.active ? 'right-1 bg-white' : 'left-1 bg-outline-variant')} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Integrations */}
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-surface-container pb-3">
            <MessageSquare size={20} className="text-secondary" />
            <h3 className="text-title-lg font-semibold text-on-surface">{t('settings.chat_integrations') || 'Chat Integrations'}</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[
              { name: 'LINE Official Account', connected: '@adminmate_th', color: 'text-[#00B900]', bg: 'bg-[#00B900]/10', active: true },
              { name: 'WhatsApp Business', connected: '+66 81 234 5678', color: 'text-[#25D366]', bg: 'bg-[#25D366]/10', active: true },
              { name: 'Zalo OA', connected: 'Not connected', color: 'text-[#0068FF]', bg: 'bg-[#0068FF]/10', active: false },
            ].map(item => (
              <div key={item.name} className={cn('flex items-center justify-between p-3 bg-surface-container-lowest border border-outline-variant rounded-lg', !item.active && 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all')}>
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded flex items-center justify-center', item.bg, item.color)}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-on-surface">{item.name}</h4>
                    <p className="text-xs text-on-surface-variant">{item.connected}</p>
                  </div>
                </div>
                {item.active ? (
                  <button onClick={() => toast('Disconnecting integration. This may take a moment.')} className="text-error text-xs font-medium hover:underline px-2 py-1">{t('common.disconnect') || 'Disconnect'}</button>
                ) : (
                  <button onClick={() => toast(`Starting setup flow for ${item.name}...`)} className="bg-surface-container-high text-primary text-xs font-medium px-3 py-1 rounded hover:bg-surface-container-highest transition-colors">{t('common.connect') || 'Connect'}</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Onboarding Tour */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <RotateCcw size={20} className="text-primary" />
          <h3 className="text-title-lg font-semibold text-on-surface">{t('tour.restart') || 'Restart Tour'}</h3>
        </div>
        <p className="text-sm text-on-surface-variant mb-4">
          {t('tour.restartDescription') || 'Replay the onboarding tour to refresh your memory on key features.'}
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('adminmate_onboarding_tour_completed')
            window.location.reload()
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
        >
          <RotateCcw size={15} />
          {t('tour.restart') || 'Restart Tour'}
        </button>
      </div>
    </div>
  )
}

export default SettingsPage

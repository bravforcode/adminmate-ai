import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore, useAuthLoading, useAuthError } from '../../stores/authStore'
import { companyService } from '../../services/companyService'
import { Save, Building2, Shield, Gavel, MessageSquare, Phone, RotateCcw, ScrollText, Bell, Lock, CreditCard } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { cn } from '../../lib/utils'
import { LoadingState } from '../../components/shared/LoadingState'
import { ErrorState } from '../../components/shared/ErrorState'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Link } from 'react-router-dom'

const companySchema = z.object({ name: z.string().min(1), name_th: z.string().optional(), tax_id: z.string().optional(), phone: z.string().optional(), email: z.string().email().optional().or(z.literal('')), city: z.string().optional(), website_url: z.string().optional(), industry: z.string().optional() })

type FormData = z.infer<typeof companySchema>

export function SettingsPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
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
        <div className="space-y-2">
          <div className="h-8 w-48 bg-surface-sunken rounded-lg animate-shimmer" />
          <div className="h-4 w-64 bg-surface-sunken rounded-lg animate-shimmer" />
        </div>
        <LoadingState variant="cards" rows={3} />
      </div>
    )
  }

  if (authError) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-headline-md font-bold text-ink">{t('settings.title') || 'Settings'}</h1>
          <p className="text-body-md text-ink-muted mt-1">{t('settings.subtitle') || 'Manage your company and account settings'}</p>
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
          <h1 className="text-headline-md font-bold text-ink">{t('settings.title') || 'Settings'}</h1>
          <p className="text-body-md text-ink-muted mt-1">{t('settings.subtitle') || 'Manage your company and account settings'}</p>
        </div>
        <Button type="submit" form="settings-form" disabled={saving}
          variant="default" size="md"
          icon={<Save size={16} />}>
          {saving ? (t('settings.saving') || 'Saving...') : (t('settings.save_changes') || 'Save Changes')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Company Profile (8) */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="border-b border-surface-container pb-3 flex-row items-center gap-2">
              <Building2 size={20} className="text-primary" />
              <CardTitle>{t('settings.company_profile') || 'Company Profile'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form id="settings-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-6 mb-2">
                  <div className="w-full sm:w-32 h-32 rounded-xl bg-surface-sunken border border-border flex-shrink-0 flex items-center justify-center text-ink-muted">
                    <Building2 size={40} />
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium mb-1 text-ink-muted">{t('settings.legal_name') || 'Legal Name (English)'} *</label>
                      <input {...register('name')}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                      {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-ink-muted">{t('settings.tax_id') || 'Tax ID'}</label>
                      <input {...register('tax_id')}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-ink-muted">{t('settings.industry') || 'Primary Industry'}</label>
                      <select {...register('industry')} className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all">
                        <option value="">{t('auth.reg_select_industry')}</option>
                        <option value="Technology">{t('auth.industry_technology')}</option>
                        <option value="Finance">{t('auth.industry_finance')}</option>
                        <option value="Healthcare">{t('auth.industry_healthcare')}</option>
                        <option value="Manufacturing">{t('auth.industry_manufacturing')}</option>
                        <option value="Retail">{t('auth.industry_retail')}</option>
                        <option value="Education">{t('auth.industry_education')}</option>
                        <option value="Logistics">{t('auth.industry_logistics')}</option>
                        <option value="Other">{t('auth.industry_other')}</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-ink-muted">{t('settings.phone') || 'Phone'}</label>
                    <input {...register('phone')}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-ink-muted">{t('settings.email') || 'Email'}</label>
                    <input {...register('email')} type="email"
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-ink-muted">{t('settings.city') || 'City'}</label>
                    <input {...register('city')}
                      className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right: Account + Pricing (4) */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <Shield size={20} className="text-primary" />
              <CardTitle>{t('settings.account') || 'Account'}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-border"><span className="text-ink-muted">{t('settings.name') || 'Name'}</span><span className="font-medium">{profile?.full_name}</span></div>
                <div className="flex justify-between py-2 border-b border-border"><span className="text-ink-muted">{t('settings.email') || 'Email'}</span><span className="font-medium">{profile?.email}</span></div>
                <div className="flex justify-between py-2 border-b border-border"><span className="text-ink-muted">{t('settings.role') || 'Role'}</span><span className="font-medium">{profile?.role}</span></div>
                <div className="flex justify-between py-2 border-b border-border"><span className="text-ink-muted">{t('settings.country') || 'Country'}</span><span className="font-medium">{company?.country}</span></div>
                <div className="flex justify-between py-2"><span className="text-ink-muted">{t('settings.subscription') || 'Subscription'}</span><span className="font-medium capitalize">{company?.subscription_tier || 'free'}</span></div>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary-fixed-dim rounded-full blur-3xl opacity-20 pointer-events-none" />
            <CardHeader className="flex-row items-start justify-between">
              <CardTitle>{t('settings.current_plan') || 'Current Plan'}</CardTitle>
              <span className="bg-primary-fixed text-white-fixed-variant px-2 py-0.5 rounded text-xs font-semibold capitalize">{company?.subscription_tier || 'Free'}</span>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-3xl font-bold text-primary tracking-tight">—</p>
                <p className="text-sm text-ink-muted">{t('settings.contact_sales') || 'Contact sales for plan details'}</p>
              </div>
              <Button variant="outline" fullWidth onClick={() => navigate('/settings/billing')}>
                {t('settings.manage_billing') || 'Manage Billing'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notification Preferences */}
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <Bell size={20} className="text-primary" />
            <CardTitle>{t('notifications_prefs.title') || 'Notification Preferences'}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              {t('notifications_prefs.settings_desc') || 'Choose how you want to receive notifications for different events.'}
            </CardDescription>
            <Link
              to="/settings/notifications"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
            >
              <Bell size={15} />
              {t('notifications_prefs.manage') || 'Manage Preferences'}
            </Link>
          </CardContent>
        </Card>
        {/* Audit Log */}
        {profile?.role === 'admin' || profile?.role === 'hr' ? (
          <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <ScrollText size={20} className="text-primary" />
              <h3 className="text-title-lg font-semibold text-ink">{t('settings.audit_log') || 'Audit Log'}</h3>
            </div>
            <p className="text-sm text-ink-muted mb-4">
              {t('settings.audit_log_desc') || 'Track all system activity, user actions, and security events.'}
            </p>
            <Link
              to="/settings/audit-log"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
            >
              <ScrollText size={15} />
              {t('settings.view_audit_log') || 'View Audit Log'}
            </Link>
          </div>
        ) : null}

        {/* Privacy & Data (PDPA) */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={20} className="text-primary" />
            <h3 className="text-title-lg font-semibold text-ink">{t('pdpa.short_title') || 'Privacy & Data'}</h3>
          </div>
          <p className="text-sm text-ink-muted mb-4">
            {t('pdpa.settings_desc') || 'Export or delete your personal data. View consent history.'}
          </p>
          <Link
            to="/settings/pdpa"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
          >
            <Lock size={15} />
            {t('pdpa.manage') || 'Manage Privacy'}
          </Link>
        </div>

        {/* Billing & Plans */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard size={20} className="text-primary" />
            <h3 className="text-title-lg font-semibold text-ink">{t('billing.title') || 'Billing & Plans'}</h3>
          </div>
          <p className="text-sm text-ink-muted mb-4">
            {t('billing.subtitle') || 'Manage your subscription and billing'}
          </p>
          <Link
            to="/settings/billing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
          >
            <CreditCard size={15} />
            {t('billing.current_plan_btn') || 'Manage Billing'}
          </Link>
        </div>

        {/* Regional Compliance */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6 border-b border-surface-container pb-3">
            <div className="flex items-center gap-2">
              <Gavel size={20} className="text-ink-faint" />
              <h3 className="text-title-lg font-semibold text-ink">{t('settings.regional_compliance') || 'Regional Compliance'}</h3>
            </div>
            <span className="text-xs font-semibold text-ink-muted bg-surface-sunken px-2 py-1 rounded">DATA GOVERNANCE</span>
          </div>
          <div className="space-y-4">
            {[
              { code: 'TH', name: 'Thailand (PDPA)', desc: 'Data residency in Bangkok, strict consent logs.', active: true },
              { code: 'VN', name: 'Vietnam (Decree 13)', desc: 'Cross-border transfer assessments active.', active: true },
              { code: 'ID', name: 'Indonesia (PDP Law)', desc: 'Pending DPO appointment verification.', active: false },
            ].map(item => (
              <div key={item.code} className="flex items-center justify-between p-3 bg-surface-sunken-lowest border border-border rounded-lg hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center text-primary font-bold text-lg">{item.code}</div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">{item.name}</h4>
                    <p className="text-xs text-ink-muted">{item.desc}</p>
                  </div>
                </div>
                <div className={cn('w-12 h-6 rounded-full relative cursor-pointer transition-colors', item.active ? 'bg-primary' : 'bg-surface-sunken border border-border')}>
                  <div className={cn('absolute top-1 w-4 h-4 rounded-full shadow-sm transition-all', item.active ? 'right-1 bg-white' : 'left-1 bg-outline-variant')} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Integrations */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-surface-container pb-3">
            <MessageSquare size={20} className="text-secondary" />
            <h3 className="text-title-lg font-semibold text-ink">{t('settings.chat_integrations') || 'Chat Integrations'}</h3>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {[
              {
                name: 'LINE Official Account',
                connected: 'Not connected',
                helpText: 'Configure in your Supabase Edge Function secrets: LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN',
                color: 'text-[#00B900]', bg: 'bg-[#00B900]/10', active: false,
              },
              {
                name: 'WhatsApp Business',
                connected: 'Not connected',
                helpText: 'Configure in your Supabase Edge Function secrets: WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN, WHATSAPP_APP_SECRET',
                color: 'text-[#25D366]', bg: 'bg-[#25D366]/10', active: false,
              },
              {
                name: 'Zalo OA',
                connected: 'Not connected',
                helpText: 'Configure required secrets in your Supabase Edge Function settings',
                color: 'text-[#0068FF]', bg: 'bg-[#0068FF]/10', active: false,
              },
            ].map(item => (
              <div key={item.name} className={cn('flex items-center justify-between p-3 bg-surface-sunken-lowest border border-border rounded-lg', !item.active && 'opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all')}>
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded flex items-center justify-center', item.bg, item.color)}>
                    <Phone size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink">{item.name}</h4>
                    <p className="text-xs text-ink-muted">{item.connected}</p>
                  </div>
                </div>
                <Button variant="secondary" size="xs" onClick={() => toast(item.helpText)}>
                  {t('common.connect') || 'Connect'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Onboarding Tour */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <RotateCcw size={20} className="text-primary" />
          <h3 className="text-title-lg font-semibold text-ink">{t('tour.restart') || 'Restart Tour'}</h3>
        </div>
        <p className="text-sm text-ink-muted mb-4">
          {t('tour.restartDescription') || 'Replay the onboarding tour to refresh your memory on key features.'}
        </p>
        <Button
          variant="default"
          size="md"
          onClick={() => {
            localStorage.removeItem('adminmate_onboarding_tour_completed')
            window.location.reload()
          }}
          icon={<RotateCcw size={15} />}
        >
          {t('tour.restart') || 'Restart Tour'}
        </Button>
      </div>
    </div>
  )
}

export default SettingsPage

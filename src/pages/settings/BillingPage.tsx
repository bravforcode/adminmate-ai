import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Check, ArrowLeft, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../stores/authStore'
import { PLAN_LIMITS, PLAN_PRICES, PLAN_NAMES, formatPrice, type SubscriptionTier } from '../../lib/subscriptions'
import { supabase } from '../../lib/supabase'

const TIERS: SubscriptionTier[] = ['free', 'growth', 'pro']
const PRICE_IDS = {
  growth: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_GROWTH_MONTHLY ?? '',
    annual: import.meta.env.VITE_STRIPE_PRICE_GROWTH_ANNUAL ?? '',
  },
  pro: {
    monthly: import.meta.env.VITE_STRIPE_PRICE_PRO_MONTHLY ?? '',
    annual: import.meta.env.VITE_STRIPE_PRICE_PRO_ANNUAL ?? '',
  },
} as const

export default function BillingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const company = useAuthStore(s => s.company)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  const [checkoutTier, setCheckoutTier] = useState<SubscriptionTier | null>(null)

  const currentTier: SubscriptionTier = (company?.subscription_tier as SubscriptionTier) || 'free'

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (tier === 'free' || tier === currentTier) return

    const priceId = PRICE_IDS[tier]?.[billingCycle]
    if (!priceId) {
      toast.error(t('billing.not_configured'))
      return
    }

    setCheckoutTier(tier)
    try {
      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
        body: { priceId },
      })

      if (error) throw error
      if (!data?.url) throw new Error(t('billing.checkout_failed'))

      window.location.assign(data.url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('billing.checkout_failed'))
    } finally {
      setCheckoutTier(null)
    }
  }

  return (
    <div className="min-h-screen bg-surface-sunken">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/settings')}
            className="flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4"
          >
            <ArrowLeft size={14} /> {t('billing.back_to_settings', 'Back to Settings')}
          </button>
          <h1 className="text-2xl font-semibold text-ink">{t('billing.title', 'Billing & Plans')}</h1>
          <p className="text-sm text-ink-muted mt-1">{t('billing.subtitle', 'Manage your subscription and billing')}</p>
        </div>

        {/* Current Plan */}
        <div className="mb-8 p-5 rounded-xl border border-border bg-surface">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-ink">{t('billing.current_plan', 'Current Plan')}</h2>
              <p className="text-sm text-ink-muted mt-1">
                {t('billing.current_plan_desc', 'You are on the')} <span className="font-medium text-primary">{PLAN_NAMES[currentTier]}</span> {t('billing.current_plan_desc2', 'plan')}
              </p>
            </div>
            <div className="px-3 py-1 rounded-full bg-primary-subtle text-primary font-medium text-sm">
              {PLAN_NAMES[currentTier]}
            </div>
          </div>

          {/* Plan Limits Summary */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('billing.limit_hr_users', 'HR Users'), value: PLAN_LIMITS[currentTier].hrUsers },
              { label: t('billing.limit_employees', 'Employees'), value: PLAN_LIMITS[currentTier].employees },
              { label: t('billing.limit_jobs', 'Jobs'), value: PLAN_LIMITS[currentTier].jobs === Infinity ? '∞' : PLAN_LIMITS[currentTier].jobs },
              { label: t('billing.limit_candidates', 'Candidates'), value: PLAN_LIMITS[currentTier].candidates === Infinity ? '∞' : PLAN_LIMITS[currentTier].candidates },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-surface-sunken">
                <p className="text-xs text-ink-muted">{item.label}</p>
                <p className="text-lg font-semibold text-ink mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Billing Cycle Toggle */}
        {currentTier !== 'pro' && (
          <div className="mb-6 flex items-center justify-center">
            <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-surface-sunken">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  billingCycle === 'monthly' ? 'bg-surface shadow-xs text-ink' : 'text-ink-muted'
                }`}
              >
                {t('billing.monthly', 'Monthly')}
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  billingCycle === 'annual' ? 'bg-surface shadow-xs text-ink' : 'text-ink-muted'
                }`}
              >
                {t('billing.annual', 'Annual')} <span className="text-xs text-success">-17%</span>
              </button>
            </div>
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {TIERS.map((tier) => {
            const isCurrent = tier === currentTier
            const limits = PLAN_LIMITS[tier]
            const price = tier === 'free' ? 0 : PLAN_PRICES[tier][billingCycle]

            return (
              <div
                key={tier}
                className={`relative p-6 rounded-xl border ${
                  isCurrent
                    ? 'border-primary bg-surface shadow-md'
                    : 'border-border bg-surface'
                }`}
              >
                {isCurrent && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-xs font-medium rounded-full">
                    {t('billing.current', 'Current')}
                  </div>
                )}

                <h3 className="text-lg font-semibold text-ink">{PLAN_NAMES[tier]}</h3>
                <div className="mt-3 mb-4">
                  <span className="text-3xl font-bold text-ink">{tier === 'free' ? '฿0' : formatPrice(price)}</span>
                  {tier !== 'free' && <span className="text-ink-muted text-sm">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>}
                </div>

                <button
                  onClick={() => void handleUpgrade(tier)}
                  disabled={isCurrent || tier === 'free'}
                  className={`w-full py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                    isCurrent
                      ? 'bg-surface-sunken text-ink-muted cursor-not-allowed'
                      : tier === 'free'
                      ? 'bg-surface-sunken text-ink-muted cursor-not-allowed'
                      : 'bg-primary text-white hover:opacity-90'
                  }`}
                >
                  {isCurrent
                    ? t('billing.current_plan_btn', 'Current Plan')
                    : tier === 'free'
                    ? t('billing.free_btn', 'Free')
                    : checkoutTier === tier
                    ? t('common:loading')
                    : t('billing.upgrade_btn', 'Upgrade')}
                </button>

                <ul className="mt-5 space-y-2">
                  {[
                    { text: t('billing.feature_count_hr_users', { count: limits.hrUsers }), check: true },
                    { text: t('billing.feature_count_employees', { count: limits.employees }), check: true },
                    { text: limits.jobs === Infinity ? t('billing.feature_unlimited_jobs') : t('billing.feature_count_jobs', { count: limits.jobs }), check: true },
                    { text: limits.candidates === Infinity ? t('billing.feature_unlimited_candidates') : t('billing.feature_count_candidates', { count: limits.candidates }), check: true },
                    { text: t('billing.feature_count_ai_messages', { count: limits.aiMessagesPerMonth }), check: true },
                    { text: t('billing.feature_esign', 'E-signature'), check: limits.documentSigning },
                    { text: t('billing.feature_pdpa', 'PDPA tools'), check: limits.pdpaTools },
                    { text: t('billing.feature_bulk', 'Bulk import'), check: limits.bulkImport },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check size={14} className={`mt-0.5 flex-shrink-0 ${item.check ? 'text-success' : 'text-ink-faint'}`} />
                      <span className={item.check ? 'text-ink-secondary' : 'text-ink-faint'}>{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        {/* Notes */}
        <div className="mt-8 p-4 rounded-lg bg-surface-sunken text-sm text-ink-muted">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-ink">{t('billing.note_title', 'Billing Information')}</p>
              <p className="mt-1">{t('billing.note_text', 'Payments are processed securely through Stripe. You can cancel your subscription at any time from this page. Cancellation takes effect at the end of the current billing period.')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

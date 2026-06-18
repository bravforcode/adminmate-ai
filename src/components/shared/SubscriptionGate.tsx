import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { hasFeature, type SubscriptionTier, type PlanLimits } from '../../lib/subscriptions'

/* ============================================================
   AdminMate AI — Subscription Gate Component
   Wraps content that requires a specific subscription tier.
   Shows upgrade prompt if user's tier doesn't have the feature.
   ============================================================ */

interface SubscriptionGateProps {
  feature: keyof PlanLimits
  children: ReactNode
  fallback?: ReactNode
}

export function SubscriptionGate({ feature, children, fallback }: SubscriptionGateProps) {
  const { t } = useTranslation()
  const company = useAuthStore(s => s.company)
  const tier: SubscriptionTier = (company?.subscription_tier as SubscriptionTier) || 'free'

  if (hasFeature(tier, feature)) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
        <Lock size={24} className="text-[var(--color-primary)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
        {t('gate.title', 'Upgrade Required')}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary)] max-w-sm mb-6">
        {t('gate.description', 'This feature requires a higher subscription tier. Upgrade to access this and more features.')}
      </p>
      <a
        href="/settings/billing"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
      >
        {t('gate.upgrade', 'Upgrade Plan')}
        <ArrowRight size={16} />
      </a>
    </div>
  )
}

/* ============================================================
   Inline Gate — for individual buttons/actions
   ============================================================ */

interface InlineGateProps {
  feature: keyof PlanLimits
  children: ReactNode
}

export function InlineGate({ feature, children }: InlineGateProps) {
  const company = useAuthStore(s => s.company)
  const tier: SubscriptionTier = (company?.subscription_tier as SubscriptionTier) || 'free'

  if (hasFeature(tier, feature)) {
    return <>{children}</>
  }

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <a
          href="/settings/billing"
          className="px-3 py-1.5 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Upgrade
        </a>
      </div>
    </div>
  )
}

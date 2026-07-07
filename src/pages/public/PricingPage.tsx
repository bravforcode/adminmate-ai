import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Check, ArrowRight, Sparkles, X } from 'lucide-react'

/* ============================================================
   AdminMate AI — Pricing Page
   Route: /pricing (public)
   ============================================================ */

const PLANS = [
  {
    name: 'Free',
    nameKey: 'pricing.plan_free',
    price: '฿0',
    period: '/mo',
    annual: '฿0/yr',
    description: 'pricing.plan_free_desc',
    desc: 'For solo HR evaluating the platform',
    cta: 'pricing.cta_free',
    ctaText: 'Get Started Free',
    ctaPath: '/register',
    featured: false,
    features: [
      { textKey: 'pricing.feature_1_hr_user', text: '1 HR user', included: true },
      { textKey: 'pricing.feature_50_employees', text: '50 employees', included: true },
      { textKey: 'pricing.feature_1_job', text: '1 job posting', included: true },
      { textKey: 'pricing.feature_5_candidates', text: '5 candidates', included: true },
      { textKey: 'pricing.feature_ai_chat_10', text: 'AI chat (10/mo)', included: true },
      { textKey: 'pricing.feature_basic_dashboard', text: 'Basic dashboard', included: true },
      { textKey: 'pricing.feature_esign', text: 'E-signature', included: false },
      { textKey: 'pricing.feature_pdpa', text: 'PDPA tools', included: false },
      { textKey: 'pricing.feature_audit_log', text: 'Audit log', included: false },
      { textKey: 'pricing.feature_bulk_import', text: 'Bulk import', included: false },
    ],
  },
  {
    name: 'Growth',
    nameKey: 'pricing.plan_growth',
    price: '฿2,900',
    period: '/mo',
    annual: '฿29,000/yr',
    description: 'pricing.plan_growth_desc',
    desc: 'For SMEs with active hiring needs',
    cta: 'pricing.cta_growth',
    ctaText: 'Start Growth Plan',
    ctaPath: '/register',
    featured: true,
    features: [
      { textKey: 'pricing.feature_5_hr_users', text: '5 HR users', included: true },
      { textKey: 'pricing.feature_500_employees', text: '500 employees', included: true },
      { textKey: 'pricing.feature_10_jobs', text: '10 job postings', included: true },
      { textKey: 'pricing.feature_100_candidates', text: '100 candidates', included: true },
      { textKey: 'pricing.feature_ai_chat_100', text: 'AI chat (100/mo)', included: true },
      { textKey: 'pricing.feature_esign', text: 'E-signature', included: true },
      { textKey: 'pricing.feature_pdpa_consent', text: 'PDPA consent tools', included: true },
      { textKey: 'pricing.feature_90day_audit', text: '90-day audit log', included: true },
      { textKey: 'pricing.feature_standard_reports', text: 'Standard reports', included: true },
      { textKey: 'pricing.feature_bulk_import', text: 'Bulk import', included: false },
    ],
  },
  {
    name: 'Pro',
    nameKey: 'pricing.plan_pro',
    price: '฿7,900',
    period: '/mo',
    annual: '฿79,000/yr',
    description: 'pricing.plan_pro_desc',
    desc: 'For growing companies with complex needs',
    cta: 'pricing.cta_pro',
    ctaText: 'Start Pro Plan',
    ctaPath: '/register',
    featured: false,
    features: [
      { textKey: 'pricing.feature_20_hr_users', text: '20 HR users', included: true },
      { textKey: 'pricing.feature_5000_employees', text: '5,000 employees', included: true },
      { textKey: 'pricing.feature_unlimited_jobs', text: 'Unlimited jobs', included: true },
      { textKey: 'pricing.feature_1000_candidates', text: '1,000 candidates', included: true },
      { textKey: 'pricing.feature_ai_chat_unlimited', text: 'AI chat (unlimited)', included: true },
      { textKey: 'pricing.feature_esign', text: 'E-signature', included: true },
      { textKey: 'pricing.feature_pdpa_consent', text: 'PDPA consent tools', included: true },
      { textKey: 'pricing.feature_1yr_audit', text: '1-year audit log', included: true },
      { textKey: 'pricing.feature_custom_reports', text: 'Custom reports', included: true },
      { textKey: 'pricing.feature_bulk_import', text: 'Bulk import', included: true },
    ],
  },
]

export default function PricingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* ── Navigation ──────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--color-surface)]/80 border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">AdminMate AI</span>
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors">
              {t('landing.nav_sign_in', 'Sign In')}
            </button>
            <button onClick={() => navigate('/register')} className="px-5 py-2.5 text-sm font-medium bg-[var(--color-primary)] text-white rounded-xl hover:opacity-90 transition-opacity">
              {t('landing.nav_start_free', 'Start Free')}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Header ──────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
              {t('pricing.title', 'Simple, transparent pricing')}
            </h1>
            <p className="mt-4 text-lg text-secondary">
              {t('pricing.subtitle', 'Start free. Upgrade when you need more. No hidden fees.')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Plans Grid ──────────────────────────────────────── */}
      <section className="pb-20 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 items-start">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className={`relative p-8 rounded-2xl border ${
                  plan.featured
                    ? 'border-[var(--color-primary)] bg-[var(--color-surface)] shadow-lg ring-1 ring-[var(--color-primary)]/20'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full">
                    {t('pricing.most_popular', 'Most Popular')}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold">{t(plan.nameKey, plan.name)}</h3>
                  <p className="text-sm text-secondary mt-1">{t(plan.description, plan.desc)}</p>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-[var(--color-text-muted)]">{plan.period}</span>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">{t('pricing.annual_available', 'Annual:')} {plan.annual}</p>
                </div>

                <button
                  onClick={() => navigate(plan.ctaPath)}
                  className={`w-full py-3 px-6 rounded-xl font-medium flex items-center justify-center gap-2 transition-opacity ${
                    plan.featured
                      ? 'bg-[var(--color-primary)] text-white hover:opacity-90'
                      : 'border border-[var(--color-border)] hover:bg-[var(--color-surface-alt)]'
                  }`}
                >
                  {t(plan.cta, plan.ctaText)}
                  <ArrowRight size={16} />
                </button>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm">
                      {feature.included ? (
                        <Check size={16} className="text-[var(--color-success)] mt-0.5 flex-shrink-0" />
                      ) : (
                        <X size={16} className="text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.included ? '' : 'text-[var(--color-text-muted)]'}>
                        {t(feature.textKey, feature.text)}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-[var(--color-surface)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">
            {t('pricing.faq_title', 'Pricing FAQ')}
          </h2>
          <div className="space-y-6">
            {[
              { q: t('pricing.faq1_q', 'Can I try before I buy?'), a: t('pricing.faq1_a', 'Yes. The Free tier lets you explore the platform with no time limit. Upgrade when you need more features or higher limits.') },
              { q: t('pricing.faq2_q', 'Can I change plans later?'), a: t('pricing.faq2_a', 'Yes. You can upgrade or downgrade from Settings at any time. Changes take effect at the start of your next billing cycle.') },
              { q: t('pricing.faq3_q', 'What payment methods do you accept?'), a: t('pricing.faq3_a', 'We accept major credit and debit cards through Stripe. Bank transfer options may be available for annual plans.') },
              { q: t('pricing.faq4_q', 'Is there a discount for annual billing?'), a: t('pricing.faq4_a', 'Yes. Annual billing saves approximately 2 months compared to monthly billing — roughly 17% off.') },
            ].map((item, i) => (
              <div key={i} className="p-5 rounded-xl border border-[var(--color-border)]">
                <h3 className="font-medium mb-2">{item.q}</h3>
                <p className="text-sm text-secondary leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 bg-[var(--color-primary)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {t('pricing.cta_title', 'Ready to get started?')}
          </h2>
          <p className="mt-4 text-lg text-white/80">
            {t('pricing.cta_subtitle', 'Create your free account in minutes. No credit card required.')}
          </p>
          <button
            onClick={() => navigate('/register')}
            className="mt-8 px-8 py-4 text-base font-semibold bg-white text-[var(--color-primary)] rounded-2xl hover:opacity-90 transition-opacity inline-flex items-center gap-2"
          >
            {t('pricing.cta_button', 'Create Free Account')}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}

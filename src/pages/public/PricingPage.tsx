import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Check, ArrowRight, X } from 'lucide-react'
import { Button } from '../../components/ui/Button'

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
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <span className="text-white font-semibold text-sm">A</span>
            </div>
            <span className="font-semibold text-ink text-sm">AdminMate AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
              {t('landing.nav_sign_in', 'Sign In')}
            </Button>
            <Button variant="default" size="sm" onClick={() => navigate('/register')}>
              {t('landing.nav_start_free', 'Start Free')}
            </Button>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="py-16 text-center">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-ink">
              {t('pricing.title', 'Simple, transparent pricing')}
            </h1>
            <p className="mt-3 text-base text-ink-muted">
              {t('pricing.subtitle', 'Start free. Upgrade when you need more. No hidden fees.')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className={`relative p-6 rounded-xl border ${
                  plan.featured
                    ? 'border-primary bg-surface shadow-md'
                    : 'border-border bg-surface'
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-white text-xs font-medium rounded-full">
                    {t('pricing.most_popular', 'Most Popular')}
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-ink">{t(plan.nameKey, plan.name)}</h3>
                  <p className="text-sm text-ink-muted mt-0.5">{t(plan.description, plan.desc)}</p>
                </div>

                <div className="mb-5">
                  <span className="text-3xl font-bold text-ink">{plan.price}</span>
                  <span className="text-ink-muted text-sm">{plan.period}</span>
                  <p className="text-xs text-ink-faint mt-0.5">{t('pricing.annual_available', 'Annual:')} {plan.annual}</p>
                </div>

                <Button
                  variant={plan.featured ? 'default' : 'outline'}
                  size="lg"
                  fullWidth
                  onClick={() => navigate(plan.ctaPath)}
                  icon={<ArrowRight size={16} />}
                  iconPosition="right"
                >
                  {t(plan.cta, plan.ctaText)}
                </Button>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm">
                      {feature.included ? (
                        <Check size={15} className="text-success mt-0.5 flex-shrink-0" />
                      ) : (
                        <X size={15} className="text-ink-faint mt-0.5 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-ink-secondary' : 'text-ink-faint'}>
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

      {/* FAQ */}
      <section className="py-16 bg-surface-sunken">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold text-center mb-10 text-ink">
            {t('pricing.faq_title', 'Pricing FAQ')}
          </h2>
          <div className="space-y-4">
            {[
              { q: t('pricing.faq1_q', 'Can I try before I buy?'), a: t('pricing.faq1_a', 'Yes. The Free tier lets you explore the platform with no time limit. Upgrade when you need more features or higher limits.') },
              { q: t('pricing.faq2_q', 'Can I change plans later?'), a: t('pricing.faq2_a', 'Yes. You can upgrade or downgrade from Settings at any time. Changes take effect at the start of your next billing cycle.') },
              { q: t('pricing.faq3_q', 'What payment methods do you accept?'), a: t('pricing.faq3_a', 'We accept major credit and debit cards through Stripe. Bank transfer options may be available for annual plans.') },
              { q: t('pricing.faq4_q', 'Is there a discount for annual billing?'), a: t('pricing.faq4_a', 'Yes. Annual billing saves approximately 2 months compared to monthly billing — roughly 17% off.') },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-surface">
                <h3 className="font-medium text-ink text-sm mb-1">{item.q}</h3>
                <p className="text-sm text-ink-muted leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
            {t('pricing.cta_title', 'Ready to get started?')}
          </h2>
          <p className="mt-3 text-base text-white/70">
            {t('pricing.cta_subtitle', 'Create your free account in minutes. No credit card required.')}
          </p>
          <Button
            variant="secondary"
            size="lg"
            className="mt-6"
            onClick={() => navigate('/register')}
            icon={<ArrowRight size={16} />}
            iconPosition="right"
          >
            {t('pricing.cta_button', 'Create Free Account')}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
                <span className="text-white font-semibold text-[10px]">A</span>
              </div>
              <span className="text-xs text-ink-faint">&copy; {new Date().getFullYear()} AdminMate AI</span>
            </div>
            <div className="flex gap-4 text-xs text-ink-faint">
              <Link to="/terms" className="hover:text-ink transition-colors no-underline">Terms</Link>
              <Link to="/privacy" className="hover:text-ink transition-colors no-underline">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Globe,
  Shield,
  MessageSquare,
  Users,
  Clock,
  FileText,
  Bot,
  Zap,
  ChevronRight,
  Building2,
  Play,
  CheckCircle2,
  ArrowRight,
  Eye,
  Heart,
  ShieldCheck,
  Timer,
  UserCheck,
  Star,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { useTranslation } from 'react-i18next';

const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
};

// ─── Data ───────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Globe, key: 'global', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { icon: Shield, key: 'compliance', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { icon: MessageSquare, key: 'applicant', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { icon: Bot, key: 'ai', color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { icon: FileText, key: 'payroll', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
  { icon: Users, key: 'recruitment', color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  { icon: Clock, key: 'attendance', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { icon: Zap, key: 'automation', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
];

const UNIQUE_DIFFERENTIATORS = [
  { icon: MessageSquare, key: 'appPortal', color: 'text-amber-500' },
  { icon: Bot, key: 'aiAdvisor', color: 'text-violet-500' },
  { icon: Globe, key: 'regional', color: 'text-blue-500' },
  { icon: Zap, key: 'realTime', color: 'text-yellow-500' },
  { icon: Timer, key: 'bgIntel', color: 'text-orange-500' },
  { icon: Users, key: 'unifiedRecruit', color: 'text-cyan-500' },
  { icon: ShieldCheck, key: 'aiCompliance', color: 'text-emerald-500' },
  { icon: Building2, key: 'taxEngine', color: 'text-indigo-500' },
  { icon: UserCheck, key: 'selfService', color: 'text-pink-500' },
  { icon: Star, key: 'multiCountry', color: 'text-yellow-500' },
  { icon: Eye, key: 'aiInsights', color: 'text-purple-500' },
  { icon: Heart, key: 'engagement', color: 'text-rose-500' },
];

const TESTIMONIALS = [
  {
    quote: 'AdminMate AI cut our HR admin time by 60%. The AI compliance advisor alone saved us from three potential penalties.',
    author: 'Sarah Chen',
    role: 'HR Director, TechFlow Asia',
  },
  {
    quote: 'The applicant tracking system with LINE integration is a game changer for our Thai operations. Candidates love it.',
    author: 'Somchai Prasert',
    role: 'COO, Bangkok Manufacturing',
  },
  {
    quote: 'Managing 200+ employees across 3 countries used to be a nightmare. AdminMate AI made it seamless.',
    author: 'Maria Santos',
    role: 'VP People, Regional Logistics Co',
  },
];

const TRUSTED_BY = [
  { name: 'TechFlow Asia', employees: '500+' },
  { name: 'Bangkok Manufacturing', employees: '200+' },
  { name: 'Regional Logistics Co', employees: '1,000+' },
  { name: 'Pacific Trading', employees: '300+' },
  { name: 'Digital Commerce TH', employees: '150+' },
];

const ROI_DATA = {
  avgTimeSaved: 60,
  avgCostSaved: 45000,
  avgCompliancePenalties: 3,
  avgPayrollErrors: 95,
};

const INTERACTIVE_DEMO_STEPS = [
  { step: 1, title: 'Onboard Employee', description: 'AI fills forms from ID scan, auto-generates contracts in local language' },
  { step: 2, title: 'Process Payroll', description: 'One-click multi-country payroll with auto tax calculations' },
  { step: 3, title: 'Track Compliance', description: 'Real-time alerts for expiring documents and regulatory changes' },
  { step: 4, title: 'Generate Reports', description: 'AI-powered analytics with benchmark comparisons' },
];

// ─── Sub-components ─────────────────────────────────────────────────────────

function SocialProofBar() {
  const { t } = useTranslation('landing');

  return (
    <section className="py-10 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-ink-muted mb-6">
          {t('trustedBy')}
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
          {TRUSTED_BY.map((company) => (
            <div key={company.name} className="flex items-center gap-2 opacity-50 hover:opacity-80 transition-opacity">
              <Building2 className="w-4 h-4 text-ink-faint" />
              <div>
                <p className="font-medium text-ink-secondary text-sm">{company.name}</p>
                <p className="text-[11px] text-ink-faint">{company.employees} employees</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { t } = useTranslation('landing');

  return (
    <section className="py-16 bg-surface-sunken">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-3">
            {t('testimonials.title')}
          </h2>
          <p className="text-base text-ink-muted">
            {t('testimonials.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.3 }}
            >
              <Card className="h-full">
                <CardContent className="p-5">
                  <p className="text-ink-secondary mb-5 text-sm leading-relaxed">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-subtle text-primary flex items-center justify-center text-xs font-semibold">
                      {testimonial.author.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-medium text-ink text-sm">{testimonial.author}</p>
                      <p className="text-xs text-ink-muted">{testimonial.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ROICalculatorSection() {
  const { t } = useTranslation('landing');

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-3">
              {t('roi.title')}
            </h2>
            <p className="text-base text-ink-muted mb-8">
              {t('roi.subtitle')}
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-primary-subtle rounded-lg p-4">
                <p className="text-2xl font-bold text-primary">{ROI_DATA.avgTimeSaved}%</p>
                <p className="text-sm text-ink-muted">{t('roi.timeSaved')}</p>
              </div>
              <div className="bg-success-subtle rounded-lg p-4">
                <p className="text-2xl font-bold text-success">${ROI_DATA.avgCostSaved.toLocaleString()}</p>
                <p className="text-sm text-ink-muted">{t('roi.costSaved')}</p>
              </div>
              <div className="bg-warning-subtle rounded-lg p-4">
                <p className="text-2xl font-bold text-warning">{ROI_DATA.avgCompliancePenalties}</p>
                <p className="text-sm text-ink-muted">{t('roi.penaltiesAvoided')}</p>
              </div>
              <div className="bg-info-subtle rounded-lg p-4">
                <p className="text-2xl font-bold text-info">{ROI_DATA.avgPayrollErrors}%</p>
                <p className="text-sm text-ink-muted">{t('roi.payrollAccuracy')}</p>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden">
              <div className="bg-primary p-5 text-white">
                <h3 className="text-lg font-semibold mb-1">{t('roi.calculatorTitle')}</h3>
                <p className="text-white/70 text-sm">{t('roi.calculatorSubtitle')}</p>
              </div>
              <CardContent className="p-5 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    {t('roi.employeeCount')}
                  </label>
                  <input
                    type="number"
                    defaultValue={50}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    {t('roi.countries')}
                  </label>
                  <input
                    type="number"
                    defaultValue={3}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all duration-150"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    {t('roi.avgSalary')}
                  </label>
                  <input
                    type="number"
                    defaultValue={3000}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-ink focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all duration-150"
                  />
                </div>
                <div className="bg-success-subtle rounded-lg p-4 border border-success/20">
                  <p className="text-sm text-success">{t('roi.estimatedSavings')}</p>
                  <p className="text-2xl font-bold text-success">$54,000/year</p>
                  <p className="text-xs text-success/70 mt-1">{t('roi.basedOn')}</p>
                </div>
                <Button variant="default" className="w-full" size="lg">
                  {t('roi.cta')}
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function InteractiveDemoSection() {
  const { t } = useTranslation('landing');

  return (
    <section className="py-16 bg-surface-sunken">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-3">
            {t('demo.title')}
          </h2>
          <p className="text-base text-ink-muted">
            {t('demo.subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-3">
            {INTERACTIVE_DEMO_STEPS.map((step) => (
              <div
                key={step.step}
                className="flex gap-3 p-3 rounded-lg hover:bg-surface transition-colors cursor-pointer group"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-primary-subtle rounded-lg flex items-center justify-center text-primary font-semibold text-sm">
                  {step.step}
                </div>
                <div>
                  <h3 className="font-medium text-ink text-sm group-hover:text-primary transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-ink-muted text-xs">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="overflow-hidden">
              <div className="bg-surface-raised p-3 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-error/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
              </div>
              <div className="bg-surface p-8 min-h-[250px] flex items-center justify-center">
                <div className="text-center">
                  <div className="w-14 h-14 bg-primary-subtle rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Play className="w-6 h-6 text-primary ml-0.5" />
                  </div>
                  <p className="text-sm text-ink-muted">{t('demo.clickToTry')}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ─── Main Landing Page ──────────────────────────────────────────────────────

export default function LandingPage() {
  const { t } = useTranslation('landing');

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
            <Link to="/pricing">
              <Button variant="ghost" size="sm">{t('nav.pricing')}</Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="sm">{t('nav.signIn')}</Button>
            </Link>
            <Link to="/register">
              <Button variant="default" size="sm">{t('hero.cta')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center max-w-3xl mx-auto" {...fadeIn}>
            <h1 className="text-3xl md:text-5xl font-bold text-ink mb-5 leading-tight tracking-tight">
              {t('hero.title')}
            </h1>
            <p className="text-lg text-ink-muted mb-8 max-w-xl mx-auto">
              {t('hero.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button variant="default" size="lg" className="w-full sm:w-auto">
                  {t('hero.cta')}
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {t('hero.watchDemo')}
                <Play className="ml-1 w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-ink-faint mt-4">
              {t('hero.noCreditCard')}
            </p>
          </motion.div>
        </div>
      </section>

      <SocialProofBar />

      {/* Features */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-3">
              {t('features.title')}
            </h2>
            <p className="text-base text-ink-muted max-w-xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <motion.div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4" {...stagger} animate="animate">
            {FEATURES.map((feature) => (
              <motion.div key={feature.key} variants={fadeIn}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 ${feature.bg} rounded-lg flex items-center justify-center mb-3`}>
                      <feature.icon className={`w-5 h-5 ${feature.color}`} />
                    </div>
                    <h3 className="font-medium text-ink text-sm mb-1">
                      {t(`landing.features.${feature.key}.title`)}
                    </h3>
                    <p className="text-ink-muted text-xs">
                      {t(`landing.features.${feature.key}.description`)}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Differentiators */}
      <section className="py-16 bg-surface-sunken">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-3">
              {t('differentiators.title')}
            </h2>
            <p className="text-base text-ink-muted">
              {t('differentiators.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {UNIQUE_DIFFERENTIATORS.map((diff, i) => (
              <motion.div
                key={diff.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.3 }}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface transition-colors"
              >
                <diff.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${diff.color}`} />
                <div>
                  <h3 className="font-medium text-ink text-sm">
                    {t(`landing.differentiators.${diff.key}.title`)}
                  </h3>
                  <p className="text-ink-muted text-xs mt-0.5">
                    {t(`landing.differentiators.${diff.key}.description`)}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />
      <ROICalculatorSection />
      <InteractiveDemoSection />

      {/* Final CTA */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div {...fadeIn}>
            <h2 className="text-2xl md:text-3xl font-semibold text-ink mb-3">
              {t('cta.title')}
            </h2>
            <p className="text-base text-ink-muted mb-8">
              {t('cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register">
                <Button variant="default" size="lg" className="w-full sm:w-auto">
                  {t('cta.primary')}
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('cta.secondary')}
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-5 mt-6 text-xs text-ink-muted">
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {t('cta.freeTrial')}</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {t('cta.noContract')}</span>
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-success" /> {t('cta.support247')}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center">
                <span className="text-white font-semibold text-xs">A</span>
              </div>
              <span className="text-sm text-ink-muted">&copy; {new Date().getFullYear()} AdminMate AI</span>
            </div>
            <div className="flex gap-5 text-sm text-ink-muted">
              <Link to="/terms" className="hover:text-ink transition-colors no-underline">Terms</Link>
              <Link to="/privacy" className="hover:text-ink transition-colors no-underline">Privacy</Link>
              <Link to="/cookies" className="hover:text-ink transition-colors no-underline">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

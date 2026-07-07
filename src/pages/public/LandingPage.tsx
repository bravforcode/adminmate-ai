import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Logo } from '../../components/brand/Logo'
import {
  Users, FileText, MessageSquare, Shield, Clock,
  ArrowRight, ChevronDown, ChevronUp, Sparkles,
  Briefcase, ClipboardCheck, Building2, Globe, Lock, Zap
} from 'lucide-react'

/* ============================================================
   AdminMate AI — Public Landing Page
   Route: / (public, unauthenticated)
   ============================================================ */

const FAQ_ITEMS = [
  { q: 'What is AdminMate AI?', a: 'AdminMate AI is an AI-powered HR platform built for small and medium enterprises in Southeast Asia. It helps HR teams manage recruitment, onboarding, documents, compliance, and team operations in one place.' },
  { q: 'Which countries do you support?', a: 'AdminMate AI supports operations in Thailand, Vietnam, and Indonesia, with multi-language support for English, Thai, Vietnamese, Chinese, and Indonesian.' },
  { q: 'Is my data secure?', a: 'AdminMate AI follows PDPA compliance standards for Thailand and similar regulations across SEA. Data is stored securely, and you can export or delete your data at any time from the Privacy & Data settings.' },
  { q: 'Can I try it for free?', a: 'Yes. AdminMate AI offers a free tier so you can explore the platform before committing to a paid plan.' },
  { q: 'How does the AI assistant work?', a: 'The built-in Mate AI assistant helps HR teams with drafting job descriptions, answering compliance questions, generating reports, and supporting onboarding tasks — all within the platform.' },
]

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  return (
    <div className="space-y-3">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="border border-[var(--color-border)] rounded-xl overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between p-5 text-left bg-[var(--color-surface)] hover:bg-[var(--color-surface-alt)] transition-colors"
          >
            <span className="font-medium text-[var(--color-text-primary)]">{item.q}</span>
            {openIndex === i ? <ChevronUp size={18} className="text-[var(--color-text-muted)]" /> : <ChevronDown size={18} className="text-[var(--color-text-muted)]" />}
          </button>
          {openIndex === i && (
            <div className="px-5 pb-5 text-secondary leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default function LandingPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleCTA = (path: string) => navigate(path)

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* ── Navigation Bar ──────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--color-surface)]/80 border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={28} showText={false} />
            <span className="text-lg font-semibold tracking-tight">AdminMate AI</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleCTA('/login')}
              className="px-4 py-2 text-sm font-medium text-secondary hover:text-primary transition-colors"
            >
              {t('landing.nav_sign_in', 'Sign In')}
            </button>
            <button
              onClick={() => handleCTA('/login')}
              className="px-5 py-2.5 text-sm font-medium bg-[var(--color-primary)] text-white rounded-xl hover:opacity-90 transition-opacity"
            >
              {t('landing.nav_start_free', 'Start Free')}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 sm:pt-28 sm:pb-32 text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-sm font-medium mb-6">
              <Sparkles size={14} />
              {t('landing.hero_badge', 'AI-Powered HR for Southeast Asia')}
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight max-w-4xl mx-auto">
              {t('landing.hero_title', 'HR work that used to take all day now takes minutes')}
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-secondary max-w-2xl mx-auto leading-relaxed">
              {t('landing.hero_subtitle', 'AdminMate AI helps SEA SMEs hire faster, onboard smarter, and stay compliant — with an AI assistant built for HR teams.')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => handleCTA('/login')}
                className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-[var(--color-primary)] text-white rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {t('landing.hero_cta', 'Start Free — No Credit Card')}
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => handleCTA('/login')}
                className="w-full sm:w-auto px-8 py-4 text-base font-medium border border-[var(--color-border)] rounded-2xl hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                {t('landing.hero_cta_secondary', 'See How It Works')}
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pain Points ─────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t('landing.pain_title', 'HR in SEA shouldn\'t feel this hard')}
            </h2>
            <p className="mt-4 text-lg text-secondary">
              {t('landing.pain_subtitle', 'Small HR teams juggle spreadsheets, chat apps, paper forms, and guesswork. AdminMate AI replaces the chaos with one focused platform.')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Clock, titleKey: 'landing.pain1_title', descKey: 'landing.pain1_desc', title: 'Too many manual tasks', desc: 'Posting jobs, screening CVs, scheduling interviews, chasing documents — all by hand.' },
              { icon: FileText, titleKey: 'landing.pain2_title', descKey: 'landing.pain2_desc', title: 'Scattered paperwork', desc: 'Offers, contracts, and onboarding forms spread across email, LINE, and Google Drive.' },
              { icon: Shield, titleKey: 'landing.pain3_title', descKey: 'landing.pain3_desc', title: 'Compliance uncertainty', desc: 'PDPA, labor law, data residency — hard to track when you\'re a 5-person HR team.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-error-container)] flex items-center justify-center mb-4">
                  <item.icon size={22} className="text-[var(--color-error)]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(item.titleKey, item.title)}</h3>
                <p className="text-secondary leading-relaxed">{t(item.descKey, item.desc)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Product Value ───────────────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t('landing.value_title', 'One platform for the full HR lifecycle')}
            </h2>
            <p className="mt-4 text-lg text-secondary">
              {t('landing.value_subtitle', 'From the first job post to the last compliance check — AdminMate AI covers every step.')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Briefcase, color: 'var(--color-primary)', titleKey: 'landing.mod_recruitment', descKey: 'landing.mod_recruitment_desc', title: 'Recruitment', desc: 'Post jobs, screen CVs with AI, manage your pipeline.' },
              { icon: ClipboardCheck, color: 'var(--color-success)', titleKey: 'landing.mod_onboarding', descKey: 'landing.mod_onboarding_desc', title: 'Onboarding', desc: 'Track tasks, send documents, guide new hires.' },
              { icon: FileText, color: 'var(--color-warning)', titleKey: 'landing.mod_documents', descKey: 'landing.mod_documents_desc', title: 'Documents', desc: 'Upload, send for e-signature, track status.' },
              { icon: MessageSquare, color: 'var(--color-primary)', titleKey: 'landing.mod_chat', descKey: 'landing.mod_chat_desc', title: 'AI Assistant', desc: 'Ask Mate AI for job drafts, compliance answers, reports.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `color-mix(in srgb, ${item.color} 12%, transparent)` }}>
                  <item.icon size={22} style={{ color: item.color }} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(item.titleKey, item.title)}</h3>
                <p className="text-sm text-secondary leading-relaxed">{t(item.descKey, item.desc)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Key Workflows ───────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t('landing.workflows_title', 'Built for how HR actually works')}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                { step: '01', titleKey: 'landing.flow1_title', descKey: 'landing.flow1_desc', title: 'Post a job in minutes', desc: 'AI generates job descriptions from your requirements. Publish to your career page instantly.' },
                { step: '02', titleKey: 'landing.flow2_title', descKey: 'landing.flow2_desc', title: 'Screen and pipeline candidates', desc: 'AI scores resumes against your criteria. Drag candidates through your custom pipeline stages.' },
                { step: '03', titleKey: 'landing.flow3_title', descKey: 'landing.flow3_desc', title: 'Schedule and collect feedback', desc: 'Book interviews, collect structured feedback, and make offers — all in one flow.' },
                { step: '04', titleKey: 'landing.flow4_title', descKey: 'landing.flow4_desc', title: 'Onboard and stay compliant', desc: 'Track onboarding tasks, send documents for e-signature, and maintain PDPA consent records.' },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.4 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold text-lg flex items-center justify-center">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{t(item.titleKey, item.title)}</h3>
                    <p className="text-secondary leading-relaxed">{t(item.descKey, item.desc)}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 to-[var(--color-accent)]/10 border border-[var(--color-border)] flex items-center justify-center">
                <div className="w-full max-w-md p-6 space-y-3">
                  {[
                    { title: t('landing.mod_recruitment', 'Recruitment'), desc: t('landing.mod_recruitment_desc', 'Post jobs, screen CVs with AI, manage your pipeline.') },
                    { title: t('landing.mod_onboarding', 'Onboarding'), desc: t('landing.mod_onboarding_desc', 'Track tasks, send documents, guide new hires.') },
                    { title: t('landing.mod_documents', 'Documents'), desc: t('landing.mod_documents_desc', 'Upload, send for e-signature, track status.') },
                  ].map((item, index) => (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-[var(--color-border)] bg-white/70 dark:bg-black/20 backdrop-blur px-4 py-3 shadow-sm"
                      style={{ transform: `translateX(${index * 8}px)` }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-sm text-[var(--color-text-primary)]">{item.title}</p>
                        <span className="inline-flex items-center rounded-full bg-[var(--color-primary)]/10 px-2 py-1 text-[11px] font-medium text-[var(--color-primary)]">Live</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-secondary">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Security / PDPA Trust ───────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t('landing.security_title', 'Your data stays yours')}
            </h2>
            <p className="mt-4 text-lg text-secondary">
              {t('landing.security_subtitle', 'AdminMate AI is built with privacy and compliance at its core.')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Shield, titleKey: 'landing.trust1_title', descKey: 'landing.trust1_desc', title: 'PDPA-ready consent', desc: 'Built-in consent banners, purpose tracking, and consent history for Thai PDPA compliance.' },
              { icon: Lock, titleKey: 'landing.trust2_title', descKey: 'landing.trust2_desc', title: 'Data export & deletion', desc: 'Export your data or request account deletion at any time from Privacy & Data settings.' },
              { icon: Building2, titleKey: 'landing.trust3_title', descKey: 'landing.trust3_desc', title: 'Your infrastructure', desc: 'Supabase-hosted with regional data residency options. You control access with role-based permissions.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-success-container)] flex items-center justify-center mb-4">
                  <item.icon size={22} className="text-[var(--color-success)]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(item.titleKey, item.title)}</h3>
                <p className="text-secondary leading-relaxed">{t(item.descKey, item.desc)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who It Is For ───────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-[var(--color-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t('landing.audience_title', 'Built for growing HR teams in Southeast Asia')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Users, titleKey: 'landing.aud1_title', descKey: 'landing.aud1_desc', title: 'SME HR teams (2–20 people)', desc: 'Lean teams that need one platform instead of five tools.' },
              { icon: Globe, titleKey: 'landing.aud2_title', descKey: 'landing.aud2_desc', title: 'Multi-country operations', desc: 'Companies operating across Thailand, Vietnam, and Indonesia.' },
              { icon: Zap, titleKey: 'landing.aud3_title', descKey: 'landing.aud3_desc', title: 'First-time HR system adopters', desc: 'Teams moving from spreadsheets and chat apps to their first HR platform.' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="p-6 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center mb-4">
                  <item.icon size={22} className="text-[var(--color-primary)]" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(item.titleKey, item.title)}</h3>
                <p className="text-secondary leading-relaxed">{t(item.descKey, item.desc)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              {t('landing.faq_title', 'Frequently asked questions')}
            </h2>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="py-20 sm:py-24 bg-[var(--color-primary)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {t('landing.cta_title', 'Ready to simplify your HR?')}
          </h2>
          <p className="mt-4 text-lg text-white/80">
            {t('landing.cta_subtitle', 'Start free. No credit card required. Set up in minutes.')}
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => handleCTA('/login')}
              className="w-full sm:w-auto px-8 py-4 text-base font-semibold bg-white text-[var(--color-primary)] rounded-2xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {t('landing.cta_button', 'Create Free Account')}
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="py-12 border-t border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Logo size={24} showText={false} />
              <span className="font-semibold">AdminMate AI</span>
            </div>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm text-[var(--color-text-muted)]">
              <button onClick={() => handleCTA('/pricing')} className="hover:text-primary transition-colors">{t('landing.footer_pricing', 'Pricing')}</button>
              <button onClick={() => handleCTA('/login')} className="hover:text-primary transition-colors">{t('landing.footer_sign_in', 'Sign In')}</button>
              <button onClick={() => handleCTA('/login')} className="hover:text-primary transition-colors">{t('landing.footer_get_started', 'Get Started')}</button>
              <button onClick={() => handleCTA('/terms')} className="hover:text-primary transition-colors">{t('landing.footer_terms', 'Terms')}</button>
              <button onClick={() => handleCTA('/privacy')} className="hover:text-primary transition-colors">{t('landing.footer_privacy', 'Privacy')}</button>
            </div>
          </div>
          <p className="mt-6 text-xs text-center text-[var(--color-text-muted)]">
            {t('landing.footer_disclaimer', 'AdminMate AI is a product for HR workflow management. It does not provide legal, tax, or compliance advice. Consult qualified professionals for regulatory guidance.')}
          </p>
          <p className="mt-2 text-xs text-center text-[var(--color-text-muted)]">
            {t('landing.footer_contact', 'Questions?')} <a href="mailto:support@adminmate-ai.com" className="underline hover:text-primary">support@adminmate-ai.com</a>
          </p>
        </div>
      </footer>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Sparkles } from 'lucide-react'

/* ============================================================
   AdminMate AI — Privacy Policy Page
   Route: /privacy (public)
   ============================================================ */

export default function PrivacyPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--color-surface)]/80 border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--color-primary)] flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-lg font-semibold tracking-tight">AdminMate AI</span>
          </button>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            <ArrowLeft size={14} /> {t('legal.back', 'Back')}
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8">
          <span className="inline-block px-3 py-1 text-xs font-medium bg-[var(--color-warning-container)] text-[var(--color-warning)] rounded-full mb-4">
            {t('legal.draft_status', 'DRAFT — For Review')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('legal.privacy_title', 'Privacy Policy')}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t('legal.last_updated', 'Last updated:')} June 2026</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-[var(--color-text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.privacy_s1_title', '1. Introduction')}</h2>
            <p>{t('legal.privacy_s1', 'This Privacy Policy describes how AdminMate AI collects, uses, and protects your personal information when you use our HR workflow management platform.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.privacy_s2_title', '2. Data We Collect')}</h2>
            <p className="font-medium text-[var(--color-text-primary)]">{t('legal.privacy_s2_account', 'Account Information:')}</p>
            <ul className="list-disc pl-5 space-y-1 mt-1 mb-4">
              <li>{t('legal.privacy_s2_1', 'Name, email address, phone number')}</li>
              <li>{t('legal.privacy_s2_2', 'Company name, industry, country')}</li>
              <li>{t('legal.privacy_s2_3', 'Role and permissions within the Service')}</li>
            </ul>
            <p className="font-medium text-[var(--color-text-primary)]">{t('legal.privacy_s2_hr', 'Employee and Candidate Data (uploaded by you):')}</p>
            <ul className="list-disc pl-5 space-y-1 mt-1 mb-4">
              <li>{t('legal.privacy_s2_4', 'Names, contact information, employment history')}</li>
              <li>{t('legal.privacy_s2_5', 'CVs, cover letters, and application materials')}</li>
              <li>{t('legal.privacy_s2_6', 'Interview notes and evaluation scores')}</li>
            </ul>
            <p className="font-medium text-[var(--color-text-primary)]">{t('legal.privacy_s2_usage', 'Usage Data:')}</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>{t('legal.privacy_s2_7', 'Pages visited, features used, actions taken')}</li>
              <li>{t('legal.privacy_s2_8', 'Device type, browser, operating system')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.privacy_s3_title', '3. How We Use Your Data')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.privacy_s3_1', 'To provide and maintain the Service')}</li>
              <li>{t('legal.privacy_s3_2', 'To process recruitment, onboarding, and document workflows')}</li>
              <li>{t('legal.privacy_s3_3', 'To generate AI-assisted content based on your inputs')}</li>
              <li>{t('legal.privacy_s3_4', 'To communicate with you about your account')}</li>
              <li>{t('legal.privacy_s3_5', 'To comply with legal obligations')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.privacy_s4_title', '4. Your Rights (PDPA)')}</h2>
            <p>{t('legal.privacy_s4', 'Under Thailand\'s Personal Data Protection Act (PDPA), you have the right to:')}</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>{t('legal.privacy_s4_1', 'Access your personal data')}</li>
              <li>{t('legal.privacy_s4_2', 'Correct inaccurate data')}</li>
              <li>{t('legal.privacy_s4_3', 'Delete your account and data')}</li>
              <li>{t('legal.privacy_s4_4', 'Export your data in a portable format')}</li>
              <li>{t('legal.privacy_s4_5', 'Withdraw consent for data processing')}</li>
            </ul>
            <p className="mt-3">{t('legal.privacy_s4_note', 'These rights can be exercised from the Privacy & Data settings in the Service.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.privacy_s5_title', '5. Data Security')}</h2>
            <p>{t('legal.privacy_s5', 'Data is stored in Supabase cloud infrastructure with industry-standard encryption for data in transit and at rest. Access is controlled through role-based permissions.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.privacy_s6_title', '6. Data Sharing')}</h2>
            <p>{t('legal.privacy_s6', 'We do not sell your personal data. We may share data with infrastructure providers (Supabase, Vercel) as necessary to provide the Service, or with law enforcement when required by law.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.privacy_s7_title', '7. Contact')}</h2>
            <p>{t('legal.privacy_s7', 'For questions about this Privacy Policy, contact us at privacy@adminmate-ai.com')}</p>
          </section>
        </div>
      </main>
    </div>
  )
}

import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Sparkles } from 'lucide-react'

/* ============================================================
   AdminMate AI — Terms of Service Page
   Route: /terms (public)
   ============================================================ */

export default function TermsPage() {
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
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-secondary hover:text-primary">
            <ArrowLeft size={14} /> {t('legal.back', 'Back')}
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="mb-8">
          <span className="inline-block px-3 py-1 text-xs font-medium bg-[var(--color-warning-container)] text-[var(--color-warning)] rounded-full mb-4">
            {t('legal.draft_status', 'DRAFT — For Review')}
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('legal.terms_title', 'Terms of Service')}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t('legal.last_updated', 'Last updated:')} June 2026</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-secondary leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.terms_s1_title', '1. Agreement')}</h2>
            <p>{t('legal.terms_s1', 'By accessing or using AdminMate AI ("the Service"), you agree to these Terms of Service ("Terms"). If you do not agree, do not use the Service.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.terms_s2_title', '2. Description of Service')}</h2>
            <p>{t('legal.terms_s2', 'AdminMate AI is a cloud-based HR workflow management platform that provides recruitment, onboarding, document management, compliance tools, and AI-assisted features for human resources teams.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.terms_s3_title', '3. Account Registration')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.terms_s3_1', 'You must provide accurate and complete registration information')}</li>
              <li>{t('legal.terms_s3_2', 'You are responsible for maintaining the confidentiality of your account credentials')}</li>
              <li>{t('legal.terms_s3_3', 'You must notify us immediately of any unauthorized use of your account')}</li>
              <li>{t('legal.terms_s3_4', 'One person or entity may not maintain more than one free account')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.terms_s4_title', '4. Acceptable Use')}</h2>
            <p>{t('legal.terms_s4', 'You agree not to:')}</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>{t('legal.terms_s4_1', 'Use the Service for any unlawful purpose')}</li>
              <li>{t('legal.terms_s4_2', 'Upload malicious code or content')}</li>
              <li>{t('legal.terms_s4_3', 'Attempt to access other users\' accounts without authorization')}</li>
              <li>{t('legal.terms_s4_4', 'Resell or redistribute the Service without written permission')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.terms_s5_title', '5. Data Processing')}</h2>
            <p>{t('legal.terms_s5', 'We process your data in accordance with our Privacy Policy. You are responsible for ensuring you have legal basis to process personal data of your employees and candidates. We act as a data processor for data you upload; you are the data controller.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.terms_s6_title', '6. Subscription and Payment')}</h2>
            <p>{t('legal.terms_s6', 'Free tier is provided at no cost with limited features. Paid subscriptions are billed in advance on a monthly or annual basis. You may cancel your subscription at any time from Settings.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.terms_s7_title', '7. Limitation of Liability')}</h2>
            <p>{t('legal.terms_s7', 'The Service is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.terms_s8_title', '8. Governing Law')}</h2>
            <p>{t('legal.terms_s8', 'These Terms are governed by the laws of the Kingdom of Thailand.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.terms_s9_title', '9. Contact')}</h2>
            <p>{t('legal.terms_s9', 'For questions about these Terms, contact us at support@adminmate-ai.com')}</p>
          </section>
        </div>
      </main>
    </div>
  )
}

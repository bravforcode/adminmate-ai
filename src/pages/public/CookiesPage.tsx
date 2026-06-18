import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Sparkles } from 'lucide-react'

/* ============================================================
   AdminMate AI — Cookie Notice Page
   Route: /cookies (public)
   ============================================================ */

export default function CookiesPage() {
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
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{t('legal.cookies_title', 'Cookie Notice')}</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t('legal.last_updated', 'Last updated:')} June 2026</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-[var(--color-text-secondary)] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.cookies_s1_title', '1. What Are Cookies')}</h2>
            <p>{t('legal.cookies_s1', 'Cookies are small text files stored on your device when you visit a website. They help the website remember your preferences and improve your experience.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.cookies_s2_title', '2. Essential Cookies')}</h2>
            <p>{t('legal.cookies_s2', 'We use cookies that are strictly necessary for the Service to function:')}</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>{t('legal.cookies_s2_1', 'Authentication session cookies (managed by Supabase)')}</li>
              <li>{t('legal.cookies_s2_2', 'Theme preference (stored in localStorage)')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.cookies_s3_title', '3. Analytics Cookies')}</h2>
            <p>{t('legal.cookies_s3', 'No analytics cookies are currently set. If analytics tracking is added in the future, we will update this notice and request your consent before any tracking begins.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.cookies_s4_title', '4. Managing Cookies')}</h2>
            <p>{t('legal.cookies_s4', 'You can control cookies through your browser settings. Disabling essential cookies may prevent the Service from functioning properly.')}</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-3">{t('legal.cookies_s5_title', '5. Contact')}</h2>
            <p>{t('legal.cookies_s5', 'For questions about our cookie practices, contact us at privacy@adminmate-ai.com')}</p>
          </section>
        </div>
      </main>
    </div>
  )
}

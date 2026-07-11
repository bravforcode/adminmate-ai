import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../stores/uiStore'
import { Logo } from '../../components/brand/Logo'
import { LoginForm } from '../../components/auth/LoginForm'
import { Link } from 'react-router-dom'
import { cn } from '../../lib/utils'

const LANGS = [
  { code: 'th', label: 'TH' },
  { code: 'en', label: 'EN' },
  { code: 'vi', label: 'VI' },
  { code: 'zh', label: '中文' },
]

export function LoginPage() {
  const { t } = useTranslation('common')
  const { i18n } = useTranslation()
  const setLanguage = useUIStore(s => s.setLanguage)
  const currentLang = useUIStore(s => s.language) || 'th'

  const switchLang = (code: string) => {
    i18n.changeLanguage(code)
    setLanguage(code)
  }

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Left: Brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[520px] bg-primary flex-col justify-between p-8 xl:p-12 shrink-0">
        <div>
          <div className="mb-16">
            <Logo size={32} variant="light" />
          </div>

          <h1 className="text-white text-3xl xl:text-[2.5rem] font-semibold leading-tight tracking-tight mb-4">
            {t('auth.login_select_title')}
          </h1>
          <p className="text-white/70 text-base leading-relaxed max-w-[380px]">
            {t('auth.login_select_sub')}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <span>Thailand, Vietnam, Indonesia</span>
          </div>
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <span>AI-powered compliance</span>
          </div>
          <div className="flex items-center gap-3 text-white/50 text-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
            <span>Multi-country payroll</span>
          </div>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex justify-between items-center px-6 md:px-8 py-4">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <Logo size={28} />
          </div>
          <div className="hidden lg:block" />

          {/* Language switcher */}
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => switchLang(l.code)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-[11px] font-medium border-none cursor-pointer transition-colors duration-150',
                  currentLang === l.code
                    ? 'bg-surface text-ink shadow-xs'
                    : 'bg-transparent text-ink-muted hover:text-ink'
                )}
                aria-pressed={currentLang === l.code}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 md:px-8 py-8">
          <div className="w-full max-w-[380px] animate-fade-in-up">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-ink mb-1">
                {t('auth.sign_in')}
              </h2>
              <p className="text-sm text-ink-muted">
                {t('auth.login_select_sub')}
              </p>
            </div>

            <LoginForm />

            <p className="text-center text-sm text-ink-muted mt-6">
              {t('auth.no_account')}{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">
                {t('auth.sign_up')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 md:px-8 py-4 text-center">
          <p className="text-[11px] text-ink-faint">
            &copy; {new Date().getFullYear()} AdminMate AI &mdash; {t('auth.login_footer')}
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

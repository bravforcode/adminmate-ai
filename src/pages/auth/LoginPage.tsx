import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../stores/uiStore'
import { ArrowLeft, Users } from 'lucide-react'
import { Logo } from '../../components/brand/Logo'
import { RoleCard } from '../../components/auth/RoleCard'
import { LoginForm } from '../../components/auth/LoginForm'

type LoginStep = 'role-select' | 'login-form'

const LANGS = [
  { code: 'th', label: 'TH' },
  { code: 'en', label: 'EN' },
  { code: 'vi', label: 'VI' },
  { code: 'zh', label: '中文' },
]

/**
 * ponytail: Refactored from 555-line inline-style component.
 * - Role content moved to i18n (auth.login_* keys)
 * - Role cards extracted to RoleCard component
 * - Inline styles replaced with Tailwind + CSS variables
 * - JS hover handlers replaced with CSS :hover classes
 * - Dark mode via semantic tokens
 * - Applicant role selection removed (HR-only)
 */
export function LoginPage() {
  const { t } = useTranslation('common')
  const { i18n } = useTranslation()
  const setLanguage = useUIStore(s => s.setLanguage)
  const currentLang = useUIStore(s => s.language) || 'th'

  const [step, setStep] = useState<LoginStep>('role-select')
  const loginFormRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (step === 'login-form' && loginFormRef.current) {
      const firstInput = loginFormRef.current.querySelector<HTMLElement>('input')
      if (firstInput) firstInput.focus()
    }
  }, [step])

  const switchLang = (code: string) => {
    i18n.changeLanguage(code)
    setLanguage(code)
  }

  const handleRoleSelect = () => {
    setStep('login-form')
  }

  const handleBack = () => {
    setStep('role-select')
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gradient-to-br from-[#f0f5ff] via-[#e8f0fe] to-[#dce8fa] relative overflow-hidden animate-gradient dark:from-surface-container-lowest dark:via-surface dark:to-surface-container-lowest">
      {/* Floating decorative shapes */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="animate-float1 absolute top-[10%] left-[5%] w-[280px] h-[280px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.06)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(37,99,235,0.03)_0%,transparent_70%)]" />
        <div className="animate-float2 absolute top-[60%] right-[8%] w-[220px] h-[220px] rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.05)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(96,165,250,0.02)_0%,transparent_70%)]" />
        <div className="animate-float1 absolute bottom-[15%] left-[20%] w-[180px] h-[180px] rounded-[40%_60%_70%_30%/40%_50%_60%_50%] bg-[radial-gradient(circle,rgba(37,99,235,0.04)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(37,99,235,0.02)_0%,transparent_70%)]" style={{ animationDelay: '-3s', animationDuration: '12s' }} />
        <div className="animate-float2 absolute top-[30%] left-[50%] w-[150px] h-[150px] rounded-[30%_70%_50%_50%/50%_40%_60%_50%] bg-[radial-gradient(circle,rgba(147,197,253,0.05)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(147,197,253,0.02)_0%,transparent_70%)]" style={{ animationDelay: '-5s', animationDuration: '9s' }} />
        <div className="animate-pulse-subtle absolute top-[20%] right-[25%] w-[100px] h-[100px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.03)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(37,99,235,0.015)_0%,transparent_70%)]" />
      </div>

      {/* Top bar */}
      <div className="flex justify-between items-center px-8 py-[18px] relative z-1">
        <Logo size={32} />

        {/* Language Switcher */}
        <div className="flex gap-[2px] bg-white/70 dark:bg-white/10 backdrop-blur-md rounded-lg p-[3px]">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => switchLang(l.code)}
              id={`login-lang-${l.code}`}
              className={`px-3 py-[5px] rounded-md text-[11px] font-semibold tracking-[0.04em] border-none cursor-pointer transition-all duration-250 ease-out ${
                currentLang === l.code
                  ? 'bg-primary text-white dark:bg-primary'
                  : 'bg-transparent text-text-muted dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface'
              }`}
              aria-pressed={currentLang === l.code}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-1">
        {step === 'role-select' ? (
          <div className="w-full max-w-[800px] animate-fade-in-up">
            {/* Headline */}
            <div className="text-center mb-12">
              <h1 className="font-serif text-[clamp(30px,4.5vw,48px)] font-normal text-on-surface dark:text-on-surface tracking-[-0.03em] leading-tight m-0 mb-3">
                {t('auth.login_select_title')}
              </h1>
              <p className="text-base font-light text-text-secondary dark:text-on-surface-variant leading-relaxed m-0">
                {t('auth.login_select_sub')}
              </p>
            </div>

            {/* Role cards — HR only */}
            <div className="flex justify-center">
              <RoleCard
                id="role-card-hr"
                title={t('auth.login_hr_title')}
                subtitle={t('auth.login_hr_sub')}
                features={[t('auth.login_hr_f1'), t('auth.login_hr_f2'), t('auth.login_hr_f3')]}
                ctaLabel={t('auth.sign_in')}
                icon={<Users size={20} strokeWidth={1.8} className="text-white" />}
                accentColor="primary"
                staggerClass="stagger-1"
                onSelect={handleRoleSelect}
              />
            </div>
          </div>
        ) : (
          /* Login Form Step */
          <div ref={loginFormRef} className="w-full max-w-[420px] animate-slide-in-right">
            {/* Back button */}
            <button
              onClick={handleBack}
              id="btn-back-role"
              className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer text-text-secondary dark:text-on-surface-variant hover:text-primary dark:hover:text-primary text-[13px] font-medium pb-7 transition-colors duration-250 ease-out"
            >
              <ArrowLeft size={14} />
              {t('auth.login_back')}
            </button>

            {/* Role badge + heading */}
            <div className="mb-7">
              <p className="text-[11px] font-semibold text-text-muted dark:text-outline-variant tracking-[0.12em] uppercase mb-2">
                {t('auth.login_signing_as')} — {t('auth.login_hr_title')}
              </p>
              <h1 className="font-serif text-[clamp(26px,3.5vw,36px)] font-normal text-on-surface dark:text-on-surface tracking-[-0.03em] leading-tight m-0">
                {t('auth.sign_in')}
              </h1>
            </div>

            {/* Login Form Card */}
            <div className="bg-surface dark:bg-surface rounded-[20px] p-9 shadow-[0_4px_24px_rgba(37,99,235,0.06),0_1px_2px_rgba(37,99,235,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
              <LoginForm />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-[18px] text-center relative z-1">
        <p className="text-[11px] text-text-muted dark:text-outline-variant m-0 tracking-[0.02em]">
          &copy; {new Date().getFullYear()} AdminMate AI &mdash; {t('auth.login_footer')}
        </p>
      </div>
    </div>
  )
}

export default LoginPage

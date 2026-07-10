import { Logo } from '../brand/Logo'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

/**
 * ponytail: AuthLayout for Forgot/Reset password pages.
 * Uses Tailwind + CSS variables for consistency with LoginPage.
 */
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background bg-surface-sunken-lowest p-6 font-sans">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-block mb-4">
            <Logo size={40} showText={false} />
          </div>
          <h1 className="font-serif text-xl font-normal text-ink tracking-[-0.02em] m-0 mb-1">
            AdminMate AI
          </h1>
          <p className="text-xs text-ink-muted dark:text-outline-variant m-0 font-normal">
            HR Intelligence for SME
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border-subtle rounded-[14px] p-9 shadow-[0_4px_24px_rgba(37,99,235,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
          <h2 className="font-serif text-2xl font-normal text-ink tracking-[-0.02em] m-0 mb-1">
            {title}
          </h2>
          {subtitle && (
            <p className="text-sm font-light text-ink-secondary text-ink-variant m-0 mb-6 leading-relaxed">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}

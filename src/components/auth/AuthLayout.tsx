import { useTranslation } from 'react-i18next'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const { t } = useTranslation('common')

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg mx-auto mb-4 flex items-center justify-center">
            <span className="text-on-primary text-xl font-bold">A</span>
          </div>
          <h1 className="text-headline-md font-bold text-on-surface">{t('app.name')}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{t('app.tagline')}</p>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-8">
          <h2 className="text-title-lg font-semibold text-on-surface mb-1">{title}</h2>
          {subtitle && <p className="text-body-md text-on-surface-variant mb-6">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  )
}

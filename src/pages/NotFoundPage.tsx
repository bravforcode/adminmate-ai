import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-56px)] text-center px-4 bg-surface">
      <div className="text-7xl font-bold text-ink-faint mb-4">404</div>
      <h1 className="text-xl font-semibold text-ink mb-2">{t('not_found.title') || 'Page Not Found'}</h1>
      <p className="text-sm text-ink-muted mb-8">{t('not_found.message') || 'The page you are looking for does not exist.'}</p>
      <Link to="/dashboard" className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity no-underline">
        <Home size={16} /> {t('not_found.back_home') || 'Back to Dashboard'}
      </Link>
    </div>
  )
}

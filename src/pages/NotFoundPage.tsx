import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center px-4">
      <div className="text-8xl font-bold text-outline-variant mb-4">404</div>
      <h1 className="text-headline-md font-bold text-on-surface mb-2">{t('not_found.title') || 'Page Not Found'}</h1>
      <p className="text-body-md text-on-surface-variant mb-8">{t('not_found.message') || 'The page you are looking for does not exist.'}</p>
      <Link to="/dashboard" className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity">
        <Home size={16} /> {t('not_found.back_home') || 'Back to Dashboard'}
      </Link>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function NotFoundPage() {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] text-center px-4 bg-surface dark:bg-[#0f172a]">
      <div className="text-8xl font-bold text-outline-variant dark:text-[#334155] mb-4">404</div>
      <h1 className="text-headline-md font-bold text-on-surface dark:text-[#f1f5f9] mb-2">{t('not_found.title') || 'Page Not Found'}</h1>
      <p className="text-body-md text-on-surface-variant dark:text-[#94a3b8] mb-8">{t('not_found.message') || 'The page you are looking for does not exist.'}</p>
      <Link to="/dashboard" className="flex items-center gap-2 px-6 py-3 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity">
        <Home size={16} /> {t('not_found.back_home') || 'Back to Dashboard'}
      </Link>
    </div>
  )
}

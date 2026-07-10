import { useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react'

const TOUR_KEY = 'adminmate_onboarding_tour_completed'

export function RestartTourButton() {
  const { t } = useTranslation('common')

  const handleRestart = () => {
    localStorage.removeItem(TOUR_KEY)
    window.location.reload()
  }

  return (
    <button
      onClick={handleRestart}
      className="flex items-center gap-2 text-sm text-ink-variant hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-surface-sunken w-full"
    >
      <RotateCcw size={16} />
      {t('tour.restart')}
    </button>
  )
}

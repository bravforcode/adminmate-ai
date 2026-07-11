import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../stores/uiStore'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { t } = useTranslation('common')
  const theme = useUIStore(s => s.theme)
  const toggleTheme = useUIStore(s => s.toggleTheme)

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors hover:bg-surface-sunken dark:hover:bg-surface-sunken"
      style={{
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-text-secondary, #475569)',
      }}
    >
      <Sun
        size={18}
        style={{
          position: 'absolute',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)',
          opacity: theme === 'dark' ? 1 : 0,
        }}
      />
      <Moon
        size={18}
        style={{
          position: 'absolute',
          transition: 'transform 0.3s ease, opacity 0.3s ease',
          transform: theme === 'dark' ? 'rotate(-90deg) scale(0)' : 'rotate(0deg) scale(1)',
          opacity: theme === 'dark' ? 0 : 1,
        }}
      />
    </button>
  )
}

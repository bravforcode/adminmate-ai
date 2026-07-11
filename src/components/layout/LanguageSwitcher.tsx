import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../stores/uiStore'

const LANGUAGES = [
  { code: 'th', label: 'TH' },
  { code: 'en', label: 'EN' },
  { code: 'vi', label: 'VI' },
  { code: 'zh', label: '中文' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const setLanguage = useUIStore(s => s.setLanguage)
  const currentLang = useUIStore(s => s.language)

  const switchLang = (code: string) => {
    i18n.changeLanguage(code)
    setLanguage(code)
  }

  return (
    <div role="group" aria-label="Language selector" style={{
      display: 'flex',
      gap: '2px',
      backgroundColor: 'var(--color-surface-alt, #eef1f6)',
      borderRadius: '8px',
      padding: '3px',
    }}>
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          onClick={() => switchLang(lang.code)}
          id={`lang-${lang.code}`}
          aria-label={`Switch to ${lang.label}`}
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.25s ease-out',
            backgroundColor: currentLang === lang.code
              ? 'var(--color-primary)'
              : 'transparent',
            color: currentLang === lang.code
              ? '#ffffff'
              : 'var(--color-text-muted, #5c6b82)',
            fontFamily: 'var(--font-sans, Inter, sans-serif)',
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  )
}

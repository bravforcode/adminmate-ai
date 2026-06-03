import { useTranslation } from 'react-i18next'
import { useUIStore } from '../../stores/uiStore'
import { cn } from '../../utils/cn'
import { Globe } from 'lucide-react'

const LANGUAGES = [
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'vi', label: 'VI', flag: '🇻🇳' },
  { code: 'id', label: 'ID', flag: '🇮🇩' },
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
    <div className="flex items-center gap-1 bg-surface-container-low rounded-full p-0.5">
      {LANGUAGES.map(lang => (
        <button key={lang.code} onClick={() => switchLang(lang.code)}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
            currentLang === lang.code ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
          )}>
          {lang.flag} {lang.label}
        </button>
      ))}
    </div>
  )
}

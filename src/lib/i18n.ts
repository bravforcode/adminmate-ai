import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

const STORAGE_KEY = 'adminmate-language'

// Supported languages — extend as translations are added
export const SUPPORTED_LANGUAGES = [
  'en', 'th', 'vi', 'zh', 'id',
  'ms', 'ja', 'ko', 'hi', 'ar',
  'pt', 'es', 'fr', 'de', 'ru',
] as const

export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: {
      default: ['en'],
      th: ['en'],
      vi: ['en'],
      zh: ['en'],
      id: ['en'],
      ms: ['en'],
      ja: ['en'],
      ko: ['en'],
      hi: ['en'],
      ar: ['en'],
      pt: ['en'],
      es: ['en'],
      fr: ['en'],
      de: ['en'],
      ru: ['en'],
    },
    supportedLngs: [...SUPPORTED_LANGUAGES],
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    ns: ['common', 'chat', 'recruitment', 'hiring', 'onboarding', 'documents', 'compliance', 'reports', 'dashboard', 'health', 'system', 'calendar', 'portal', 'messages', 'notifications', 'billing'],
    defaultNS: 'common',
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    returnNull: false,
    saveMissing: false,
    react: {
      useSuspense: false,
    },
  })

if (typeof window !== 'undefined') {
  const cached = window.localStorage.getItem(STORAGE_KEY)
  if (cached && SUPPORTED_LANGUAGES.includes(cached as SupportedLanguage)) {
    i18n.changeLanguage(cached)
  }
}

export default i18n

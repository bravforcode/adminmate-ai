import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import Backend from 'i18next-http-backend'

const STORAGE_KEY = 'adminmate-language'

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: {
      default: ['en'],
      th: ['en'],
      vi: ['en'],
      id: ['en'],
    },
    supportedLngs: ['th', 'en', 'vi', 'id'],
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    ns: ['common', 'recruitment', 'hiring', 'onboarding', 'documents', 'compliance', 'reports', 'dashboard', 'health', 'system'],
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
  if (cached && ['th', 'en', 'vi', 'id'].includes(cached)) {
    i18n.changeLanguage(cached)
  }
}

export default i18n

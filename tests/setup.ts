import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Prevent demo mode from bypassing auth in tests
vi.stubEnv('VITE_DEMO_MODE', 'false')

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({ select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), eq: vi.fn() })),
    auth: { getUser: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), signOut: vi.fn() },
    storage: { from: vi.fn(() => ({ upload: vi.fn(), getPublicUrl: vi.fn() })) },
    functions: { invoke: vi.fn() },
    channel: vi.fn(() => ({ on: vi.fn(), subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })),
  })),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'th', changeLanguage: vi.fn() } }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}))

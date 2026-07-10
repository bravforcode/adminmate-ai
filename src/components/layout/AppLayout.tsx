import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { ChatWidget } from '../chat/ChatWidget'
import { OnboardingTour } from '../onboarding/OnboardingTour'
import { useAuthStore } from '../../stores/authStore'
import { Toaster } from 'react-hot-toast'

const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur']

export function AppLayout() {
  const userLanguage = useAuthStore(s => s.userLanguage)
  const lang = userLanguage()
  const isRtl = RTL_LANGUAGES.includes(lang)

  useEffect(() => {
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }, [isRtl, lang])

  return (
    <div className="min-h-screen bg-surface-sunken flex">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-surface focus:p-2 focus:rounded focus:ring-2 focus:ring-primary">
        Skip to main content
      </a>
      <Sidebar />
      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen">
        <Header />
        <main id="main-content" role="main" className="flex-1 px-4 md:px-6 pt-14 pb-[max(72px,env(safe-area-inset-bottom))] md:pb-6 max-w-[1440px] mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <ChatWidget />
      <OnboardingTour />
      <Toaster
        position="top-right"
        gutter={10}
        containerStyle={{ top: 16 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-ink)',
            border: '1px solid var(--color-border)',
            borderRadius: '10px',
            padding: '10px 14px',
            fontSize: '13px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          },
          success: {
            iconTheme: { primary: 'var(--color-success)', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: 'var(--color-error)', secondary: '#fff' },
          },
        }}
      />
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { ChatWidget } from '../chat/ChatWidget'
import { OnboardingTour } from '../onboarding/OnboardingTour'
import { Toaster } from 'react-hot-toast'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-4 md:px-8 pt-[60px] pb-20 md:pb-8 max-w-[1440px] mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <ChatWidget />
      <OnboardingTour />
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { borderRadius: '12px', background: '#1e3a5f', color: '#fff', fontSize: '14px' },
      }} />
    </div>
  )
}

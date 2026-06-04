import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { MobileNav } from './MobileNav'
import { Toaster } from 'react-hot-toast'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 md:ml-[260px] flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 pt-24 p-4 md:p-8 pb-20 md:pb-8 max-w-[1440px] mx-auto w-full overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <MobileNav />
      <Toaster position="top-right" toastOptions={{
        duration: 4000,
        style: { borderRadius: '12px', background: '#051a3e', color: '#fff', fontSize: '14px' },
      }} />
    </div>
  )
}

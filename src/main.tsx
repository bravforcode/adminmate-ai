import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { queryClient } from './lib/query-client'
import { router } from './router'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { initGlobalErrorHandler } from './lib/errorHandler'
import { initPageLoadMonitoring } from './lib/performance'
import { useAuthStore } from './stores/authStore'
import { useSessionRestore } from './hooks/useSessionRestore'
import './lib/i18n'
import './index.css'
import './styles/motion.css'

// Runs the httpOnly-cookie session-restore fallback once on app boot.
// Effect deps are intentionally empty: useSessionRestore() subscribes to the
// whole auth store (no selector), so restoreSession gets a new identity on
// every store mutation — restoreSession() itself mutates the store
// (setLoading), so depending on [restoreSession] here would refire this
// effect on every call and loop forever. Empty deps = run once on mount.
function SessionBootstrap() {
  const { restoreSession } = useSessionRestore()
  useEffect(() => {
    restoreSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

initGlobalErrorHandler()
initPageLoadMonitoring()

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration failed - non-critical
    })
  })
}

// Subscribe to Supabase auth state changes (catches OAuth SIGNED_IN events)
useAuthStore.getState().subscribeAuth()

if (import.meta.env.VITE_SENTRY_DSN) {
  import('./lib/sentry').then(m => m.initSentry())
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="never">
          <SessionBootstrap />
          <RouterProvider router={router} />
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

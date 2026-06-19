import React from 'react'
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
import './lib/i18n'
import './index.css'

initGlobalErrorHandler()
initPageLoadMonitoring()

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
          <RouterProvider router={router} />
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

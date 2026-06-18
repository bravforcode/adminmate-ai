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
import './lib/i18n'
import './index.css'

initGlobalErrorHandler()
initPageLoadMonitoring()

if (import.meta.env.VITE_SENTRY_DSN) {
  import('./lib/sentry').then(m => m.initSentry())
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion="user">
          <RouterProvider router={router} />
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

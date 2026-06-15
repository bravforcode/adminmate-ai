import * as Sentry from '@sentry/react'

export function initSentry() {
  if (!import.meta.env.VITE_SENTRY_DSN) return

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>
        if (headers.Authorization) headers.Authorization = '[redacted]'
        if (headers['X-RateLimit-Key']) headers['X-RateLimit-Key'] = '[redacted]'
        if (headers['Cookie']) headers['Cookie'] = '[redacted]'
      }

      if (event.user) {
        if (event.user.email) event.user.email = '[redacted]'
        if (event.user.username) event.user.username = '[redacted]'
        if (event.user.ip_address) event.user.ip_address = '[redacted]'
      }

      if (event.request?.url) {
        try {
          const url = new URL(event.request.url)
          url.search = ''
          event.request.url = url.toString()
        } catch { /* ignore invalid URLs */ }
      }

      return event
    },
  })
}

export { Sentry }

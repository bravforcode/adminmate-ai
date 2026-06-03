let Sentry: any = null

if (import.meta.env.VITE_SENTRY_DSN) {
  import('@sentry/react').then(m => {
    Sentry = m
    m.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.1,
    })
  })
}

export { Sentry }

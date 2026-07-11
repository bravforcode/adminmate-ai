import { Component, ReactNode, createRef } from 'react'
import * as Sentry from '@sentry/react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }
  private reloadButtonRef = createRef<HTMLButtonElement>()

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (this.state.hasError && !prevState.hasError && this.reloadButtonRef.current) {
      this.reloadButtonRef.current.focus()
    }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    const payload = {
      type: 'react_error',
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      url: typeof window !== 'undefined' ? window.location.href : '',
      timestamp: new Date().toISOString(),
    }

    if (import.meta.env.DEV) console.error('[ErrorBoundary] Caught error:', payload)

    Sentry.captureException(error, { extra: { componentStack: info?.componentStack } })

    if (typeof window !== 'undefined') {
      try {
        const supabaseUrl = (import.meta as unknown as Record<string, { VITE_SUPABASE_URL?: string }>).env?.VITE_SUPABASE_URL
        if (supabaseUrl) {
          fetch(`${supabaseUrl}/functions/v1/log-client-error`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        // Remote logging is best-effort — do not let failure cascade
      }

      try {
        const buf = JSON.parse(localStorage.getItem('adminmate:client-errors') || '[]')
        buf.push(payload)
        localStorage.setItem('adminmate:client-errors', JSON.stringify(buf.slice(-20)))
      } catch {
        // localStorage may be full or unavailable — silently ignore
      }
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: null })
    if (typeof window !== 'undefined') window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-surface font-sans"
        >
          <div className="max-w-md w-full bg-surface rounded-xl shadow-md border border-border p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-xl bg-error-subtle text-destructive flex items-center justify-center text-2xl font-bold">
              !
            </div>
            <h1 className="text-xl font-semibold text-ink mb-2">
              Something went wrong
            </h1>
            <p className="text-ink-muted mb-6 text-sm leading-relaxed">
              An unexpected error occurred. Our team has been notified. You can try
              reloading the page, or contact support if the problem persists.
            </p>
            {import.meta.env.DEV && this.state.error?.message ? (
              <details className="text-left mb-6 text-xs text-ink-muted bg-surface-sunken rounded-lg p-3 border border-border">
                <summary className="cursor-pointer font-medium text-ink">
                  Error details
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words">
                  {this.state.error.message}
                </pre>
              </details>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                ref={this.reloadButtonRef}
                onClick={this.handleReload}
                className="px-5 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Reload page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2 bg-surface-sunken text-ink border border-border rounded-lg font-medium hover:bg-surface-sunken transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

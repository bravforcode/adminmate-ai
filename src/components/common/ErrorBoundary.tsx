import { Component, ReactNode } from 'react'

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

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
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

    console.error('[ErrorBoundary] Caught error:', payload)

    if (typeof window !== 'undefined') {
      try {
        const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL
        if (supabaseUrl) {
          fetch(`${supabaseUrl}/functions/v1/log-client-error`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
          }).catch(() => {})
        }
      } catch {
        void 0
      }

      try {
        const buf = JSON.parse(localStorage.getItem('adminmate:client-errors') || '[]')
        buf.push(payload)
        localStorage.setItem('adminmate:client-errors', JSON.stringify(buf.slice(-20)))
      } catch {
        void 0
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
          className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-50 font-sans"
        >
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-3xl font-bold">
              !
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-slate-600 mb-6 text-sm leading-relaxed">
              An unexpected error occurred. Our team has been notified. You can try
              reloading the page, or contact support if the problem persists.
            </p>
            {this.state.error?.message ? (
              <details className="text-left mb-6 text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
                <summary className="cursor-pointer font-medium text-slate-700">
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
                onClick={this.handleReload}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Reload page
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-6 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-lg font-medium hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
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

import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error } }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="w-16 h-16 bg-error-container text-error rounded-full flex items-center justify-center text-2xl font-bold mb-4">!</div>
          <h2 className="text-headline-md font-bold text-on-surface mb-2">Something went wrong</h2>
          <p className="text-body-md text-on-surface-variant mb-6 max-w-md">{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload() }}
            className="px-6 py-2.5 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90">
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

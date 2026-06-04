import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  fullPage?: boolean
}

export function ErrorState({ title, message, onRetry, retryLabel, fullPage }: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${fullPage ? 'min-h-[400px]' : 'py-12 px-4'}`}>
      <div className="w-12 h-12 rounded-full bg-error-container text-error flex items-center justify-center mb-3">
        <AlertCircle size={24} />
      </div>
      <h3 className="text-base font-semibold text-on-surface">{title || 'Something went wrong'}</h3>
      <p className="text-sm text-on-surface-variant mt-1 max-w-md">
        {message || 'We could not load this data. Please try again.'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <RefreshCw size={14} />
          {retryLabel || 'Retry'}
        </button>
      )}
    </div>
  )
}

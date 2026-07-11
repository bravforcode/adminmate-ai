import { ReactNode } from 'react'
import { Button } from '../ui/Button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
  icon?: ReactNode
}

export function ErrorState({ title, message, onRetry, retryLabel, icon }: ErrorStateProps) {
  return (
    <div className="bg-surface rounded-xl border border-border p-8 text-center">
      <div className="w-12 h-12 rounded-xl bg-error-subtle flex items-center justify-center mx-auto mb-4">
        {icon || <AlertCircle size={24} className="text-destructive" />}
      </div>
      <h3 className="text-base font-semibold text-ink mb-1">
        {title || 'Something went wrong'}
      </h3>
      <p className="text-sm text-ink-muted mb-4">
        {message || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <Button variant="default" size="sm" onClick={onRetry} icon={<RefreshCw size={14} />}>
          {retryLabel || 'Try Again'}
        </Button>
      )}
    </div>
  )
}

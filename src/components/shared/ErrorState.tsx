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
    <div className="bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline p-8 text-center card-hover">
      <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
        {icon || <AlertCircle size={32} className="text-error" />}
      </div>
      <h3 className="text-lg font-semibold text-on-surface dark:text-on-surface mb-1">
        {title || 'Something went wrong'}
      </h3>
      <p className="text-sm text-on-surface-variant dark:text-on-surface-variant mb-4">
        {message || 'An unexpected error occurred. Please try again.'}
      </p>
      {onRetry && (
        <Button variant="default" size="md" onClick={onRetry} icon={<RefreshCw size={14} />}>
          {retryLabel || 'Try Again'}
        </Button>
      )}
    </div>
  )
}

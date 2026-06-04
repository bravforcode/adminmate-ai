import { Loader2 } from 'lucide-react'
import { cn } from '../../utils/cn'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse bg-surface-container-high rounded', className)} />
}

interface LoadingStateProps {
  rows?: number
  variant?: 'cards' | 'table' | 'list'
  message?: string
}

export function LoadingState({ rows = 4, variant = 'cards', message }: LoadingStateProps) {
  if (variant === 'table') {
    return (
      <div className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-1/3" />
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-surface rounded-xl border border-outline-variant p-4 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-surface rounded-xl border border-outline-variant p-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
      {message && (
        <div className="flex items-center justify-center gap-2 text-sm text-on-surface-variant py-2">
          <Loader2 size={14} className="animate-spin" />
          {message}
        </div>
      )}
    </div>
  )
}

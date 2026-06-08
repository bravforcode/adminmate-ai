interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular' | 'card'
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({ className = '', variant = 'rectangular', width, height, lines = 1 }: SkeletonProps) {
  const baseClass = 'rounded-lg overflow-hidden'
  const shimmerClass = 'animate-pulse bg-gradient-to-r from-surface-alt via-border-subtle to-surface-alt'

  if (variant === 'card') {
    return (
      <div className={`bg-surface rounded-xl border border-border-subtle p-5 space-y-3 ${className}`}>
        <div className={`h-4 w-3/4 ${shimmerClass} rounded`} />
        <div className={`h-3 w-1/2 ${shimmerClass} rounded`} />
        <div className={`h-3 w-full ${shimmerClass} rounded`} />
        <div className={`h-3 w-2/3 ${shimmerClass} rounded`} />
      </div>
    )
  }

  if (variant === 'circular') {
    return <div className={`rounded-full ${shimmerClass}`} style={{ width: width || 40, height: height || 40 }} />
  }

  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`h-3 ${shimmerClass} rounded`} style={{ width: i === lines - 1 ? '60%' : '100%' }} />
        ))}
      </div>
    )
  }

  return <div className={`${shimmerClass} ${baseClass} ${className}`} style={{ width, height }} />
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="card" />
        ))}
      </div>
      <Skeleton variant="card" className="h-64" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} variant="rectangular" className="h-12 w-full" />
      ))}
    </div>
  )
}

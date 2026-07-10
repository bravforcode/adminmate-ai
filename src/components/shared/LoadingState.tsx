import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const staggerItem = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
}

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

interface SkeletonProps {
  className?: string
  shimmer?: boolean
}

export function Skeleton({ className, shimmer = true }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg relative overflow-hidden',
        'bg-surface-sunken dark:bg-surface-alt',
        shimmer && 'animate-shimmer',
        className
      )}
    />
  )
}

interface LoadingStateProps {
  rows?: number
  variant?: 'cards' | 'table' | 'list' | 'kanban' | 'detail' | 'form'
  message?: string
}

function KanbanSkeleton() {
  return (
    <motion.div
      className="flex gap-4 h-full"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {[1, 2, 3, 4].map((col) => (
        <motion.div key={col} variants={staggerItem} className="flex-1 min-w-[200px] sm:min-w-[260px] flex flex-col">
          <div className="flex items-center gap-2 mb-4 px-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-7 rounded-full" />
          </div>
          <div className="space-y-3 flex-1">
            {[1, 2, 3].map((card) => (
              <motion.div
                key={card}
                variants={staggerItem}
                className="bg-surface rounded-xl border border-border p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  )
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl">
      <Skeleton className="h-4 w-32" />
      <div className="bg-surface rounded-xl border border-border p-6">
        <div className="flex items-start gap-4 mb-6">
          <Skeleton className="h-16 w-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-4 pt-1">
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-36" />
            </div>
          </div>
        </div>
        <div className="space-y-3 pt-4 border-t border-border dark:border-border">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
        <div className="mt-6 p-4 bg-surface-sunken dark:bg-surface-alt rounded-lg space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  )
}

function FormSkeleton() {
  return (
    <div className="bg-surface rounded-xl border border-border p-6 space-y-5">
      <Skeleton className="h-6 w-48" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex gap-3 pt-2">
        <Skeleton className="h-10 w-28 rounded-lg" />
        <Skeleton className="h-10 w-20 rounded-lg" />
      </div>
    </div>
  )
}

export function LoadingState({ rows = 4, variant = 'cards', message }: LoadingStateProps) {
  if (variant === 'kanban') {
    return (
      <div className="h-full">
        <KanbanSkeleton />
        {message && (
          <div className="flex items-center justify-center gap-2 text-sm text-ink-variant py-2 mt-4">
            <Loader2 size={14} className="animate-spin" />
            {message}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'detail') {
    return (
      <div>
        <DetailSkeleton />
        {message && (
          <div className="flex items-center justify-center gap-2 text-sm text-ink-variant py-2 mt-4">
            <Loader2 size={14} className="animate-spin" />
            {message}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'form') {
    return (
      <div>
        <FormSkeleton />
        {message && (
          <div className="flex items-center justify-center gap-2 text-sm text-ink-variant py-2 mt-4">
            <Loader2 size={14} className="animate-spin" />
            {message}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b border-border dark:border-border">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20 ml-auto" />
          </div>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
          >
            {Array.from({ length: rows }).map((_, i) => (
              <motion.div key={i} variants={staggerItem} className="flex items-center gap-3 py-2">
                <Skeleton className="h-4 w-full flex-1" />
              </motion.div>
            ))}
          </motion.div>
        </div>
        {message && (
          <div className="flex items-center justify-center gap-2 text-sm text-ink-variant py-3 border-t border-border dark:border-border">
            <Loader2 size={14} className="animate-spin" />
            {message}
          </div>
        )}
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <motion.div
        className="space-y-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        {Array.from({ length: rows }).map((_, i) => (
          <motion.div key={i} variants={staggerItem} className="bg-surface rounded-xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded-full shrink-0" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-5 w-16 rounded-full ml-auto" />
            </div>
            <div className="flex gap-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-7 w-20 rounded" />
              <Skeleton className="h-7 w-16 rounded" />
            </div>
          </motion.div>
        ))}
        {message && (
          <div className="flex items-center justify-center gap-2 text-sm text-ink-variant py-2">
            <Loader2 size={14} className="animate-spin" />
            {message}
          </div>
        )}
      </motion.div>
    )
  }

  // Default: cards variant
  return (
    <motion.div
      className="space-y-3"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <motion.div key={i} variants={staggerItem} className="bg-surface rounded-xl border border-border p-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-12 w-12 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full shrink-0" />
          </div>
        </motion.div>
      ))}
      {message && (
        <div className="flex items-center justify-center gap-2 text-sm text-ink-variant py-2">
          <Loader2 size={14} className="animate-spin" />
          {message}
        </div>
      )}
    </motion.div>
  )
}

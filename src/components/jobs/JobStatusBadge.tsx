import { cn } from '../../lib/utils'

const styles: Record<string, string> = { draft: 'bg-surface-sunken text-ink-variant text-ink-variant', active: 'bg-primary-container/20 dark:bg-primary-container/20 text-primary dark:text-primary-muted', paused: 'bg-yellow-50 dark:bg-warning-subtle/30 text-yellow-700 dark:text-warning', closed: 'bg-surface-sunken text-ink-variant text-ink-variant' }

export function JobStatusBadge({ status }: { status: string }) {
  return <span className={cn('px-2 py-0.5 rounded text-xs font-medium', styles[status] || styles.draft)}>{status}</span>
}

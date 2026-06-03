import { cn } from '../../utils/cn'

const styles: Record<string, string> = { draft: 'bg-surface-container text-on-surface-variant', active: 'bg-primary-container/20 text-primary', paused: 'bg-yellow-50 text-yellow-700', closed: 'bg-surface-container-high text-on-surface-variant' }

export function JobStatusBadge({ status }: { status: string }) {
  return <span className={cn('px-2 py-0.5 rounded text-xs font-medium', styles[status] || styles.draft)}>{status}</span>
}

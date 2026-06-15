import { cn } from '../../utils/cn'

const styles: Record<string, string> = { draft: 'bg-surface-container dark:bg-[#334155] text-on-surface-variant dark:text-[#94a3b8]', active: 'bg-primary-container/20 dark:bg-[#1e40af]/20 text-primary dark:text-[#93c5fd]', paused: 'bg-yellow-50 dark:bg-[#451a03]/30 text-yellow-700 dark:text-[#fbbf24]', closed: 'bg-surface-container-high dark:bg-[#334155] text-on-surface-variant dark:text-[#94a3b8]' }

export function JobStatusBadge({ status }: { status: string }) {
  return <span className={cn('px-2 py-0.5 rounded text-xs font-medium', styles[status] || styles.draft)}>{status}</span>
}

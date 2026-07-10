import { Button } from '../ui/Button'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4 text-center',
      'animate-fade-in-up'
    )}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-surface-sunken flex items-center justify-center mb-4">
          <Icon size={24} className="text-ink-muted" />
        </div>
      )}
      <h3 className="text-base font-semibold text-ink mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-ink-muted mt-1 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && (
        <Button variant="default" size="sm" onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </div>
  )
}

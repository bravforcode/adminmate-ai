import { Button } from '../ui/Button'
import type { LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface Props { icon?: LucideIcon; title: string; description?: string; action?: { label: string; onClick: () => void } }

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4 text-center',
      'animate-in fade-in duration-500'
    )}>
      {Icon && (
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/5 to-tertiary/5 scale-150 blur-xl" />
          <div className="relative w-20 h-20 rounded-full border-2 border-dashed border-outline-variant/40 flex items-center justify-center bg-surface-container-low/50">
            <Icon size={36} className="text-on-surface-variant/60 dark:text-[#475569]" />
          </div>
        </div>
      )}
      <h3 className="text-lg font-semibold text-on-surface dark:text-[#f1f5f9] mb-1">{title}</h3>
      {description && <p className="text-sm text-on-surface-variant dark:text-[#94a3b8] mt-1 max-w-sm leading-relaxed">{description}</p>}
      {action && (
        <Button variant="default" onClick={action.onClick} className="mt-5">
          {action.label}
        </Button>
      )}
    </div>
  )
}

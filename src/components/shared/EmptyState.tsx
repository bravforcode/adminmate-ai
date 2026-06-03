import { LucideIcon } from 'lucide-react'

interface Props { icon?: LucideIcon; title: string; description?: string; action?: { label: string; onClick: () => void } }

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {Icon && <Icon size={40} className="text-outline-variant mb-4" />}
      <h3 className="text-lg font-semibold text-on-surface">{title}</h3>
      {description && <p className="text-sm text-on-surface-variant mt-1 max-w-sm">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg shadow-sm text-sm font-medium hover:opacity-90">
          {action.label}
        </button>
      )}
    </div>
  )
}

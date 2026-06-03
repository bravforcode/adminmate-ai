import type { LucideIcon } from 'lucide-react'

interface ActionCardProps {
  title: string
  description: string
  icon: LucideIcon
  variant?: 'primary' | 'error'
  onClick?: () => void
}

export function ActionCard({ title, description, icon: Icon, variant = 'primary', onClick }: ActionCardProps) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-4 p-4 rounded-lg border border-outline-variant bg-surface hover:border-primary transition-colors cursor-pointer group"
    >
      <div
        className={`p-2 rounded-full mt-1 ${
          variant === 'primary'
            ? 'bg-primary-fixed text-on-primary-fixed'
            : 'bg-error-container text-on-error-container'
        }`}
      >
        <Icon size={20} />
      </div>
      <div>
        <div className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">{title}</div>
        <p className="text-sm text-on-surface-variant mt-1">{description}</p>
      </div>
    </div>
  )
}

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface AIInsightPanelProps {
  title: string
  children: ReactNode
  icon?: LucideIcon
}

export function AIInsightPanel({ title, children, icon: Icon }: AIInsightPanelProps) {
  return (
    <div className="bg-surface rounded-xl border border-outline-variant shadow-sm flex flex-col">
      <div className="p-4 border-b border-outline-variant flex items-center gap-2">
        {Icon && <Icon size={20} className="text-primary" />}
        <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
      </div>
      <div className="p-4 flex-1">{children}</div>
    </div>
  )
}

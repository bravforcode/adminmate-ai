import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'primary' | 'tertiary' | 'error' | 'secondary'
  trend?: string
  trendUp?: boolean
}

const colorMap = {
  primary: 'text-primary',
  tertiary: 'text-tertiary',
  error: 'text-error',
  secondary: 'text-secondary',
}

export function StatCard({ title, value, icon: Icon, color = 'primary', trend, trendUp }: StatCardProps) {
  return (
    <div className="bg-surface rounded-xl p-6 border border-surface-container-high shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorMap[color]}`}>
        <Icon size={64} />
      </div>
      <div className="text-xs text-on-surface-variant uppercase tracking-wider mb-1 font-label">{title}</div>
      <div className={`text-3xl font-bold ${colorMap[color]}`}>{value}</div>
      {trend && (
        <div className={`text-xs font-medium flex items-center gap-0.5 mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
          {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trend}
        </div>
      )}
    </div>
  )
}

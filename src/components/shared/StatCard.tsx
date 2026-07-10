import type { LucideIcon } from 'lucide-react'
import { AnimatedCounter } from './AnimatedCounter'
import { Card, CardContent } from '../ui/Card'
import { cn } from '../../lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success'
  trend?: string
  trendUp?: boolean
  onClick?: () => void
  valueNode?: React.ReactNode
}

const colorMap = {
  primary:   { icon: 'text-primary',    bg: 'bg-primary-subtle',    value: 'text-ink',    trend: 'text-success' },
  secondary: { icon: 'text-ink-muted',  bg: 'bg-surface-sunken',    value: 'text-ink',    trend: 'text-success' },
  tertiary:  { icon: 'text-primary-muted', bg: 'bg-primary-subtle', value: 'text-ink',    trend: 'text-success' },
  error:     { icon: 'text-destructive',      bg: 'bg-error-subtle',      value: 'text-destructive',  trend: 'text-destructive' },
  success:   { icon: 'text-success',    bg: 'bg-success-subtle',    value: 'text-ink',    trend: 'text-success' },
}

export function StatCard({ title, value, icon: Icon, color = 'primary', trend, trendUp, onClick, valueNode }: StatCardProps) {
  const colors = colorMap[color]

  return (
    <Card
      className={cn(
        'relative overflow-hidden card-hover',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', colors.bg)}>
            <Icon size={18} className={colors.icon} />
          </div>
          {trend && (
            <span className={cn('text-xs font-medium', trendUp ? colors.trend : 'text-destructive')}>
              {trend}
            </span>
          )}
        </div>

        <p className="text-sm font-medium text-ink-muted mb-1">
          {title}
        </p>

        <p className={cn('text-2xl font-semibold tracking-tight', colors.value)}>
          {valueNode ?? (typeof value === 'number' ? <AnimatedCounter value={value} /> : value)}
        </p>
      </CardContent>
    </Card>
  )
}

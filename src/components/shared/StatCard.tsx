import type { LucideIcon } from 'lucide-react'
import { AnimatedCounter } from './AnimatedCounter'
import { Card, CardContent } from '../ui/Card'
import { cn } from '../../lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'primary' | 'tertiary' | 'error' | 'secondary'
  trend?: string
  trendUp?: boolean
  onClick?: () => void
  valueNode?: React.ReactNode
}

const colorMap = {
  primary:   { icon: 'var(--color-navy, #2563eb)',    value: 'var(--color-navy-deep, #0f172a)', trend: '#22c55e' },
  tertiary:  { icon: 'var(--color-accent, #60a5fa)',   value: 'var(--color-navy-deep, #0f172a)', trend: '#22c55e' },
  error:     { icon: '#ef4444',                         value: '#ef4444',                         trend: '#ef4444' },
  secondary: { icon: 'var(--color-accent, #60a5fa)',   value: 'var(--color-navy-deep, #0f172a)', trend: '#22c55e' },
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
      {/* Ghost background icon */}
      <div
        className="absolute -top-1 -right-1 opacity-[0.04] pointer-events-none"
        style={{ color: colors.icon }}
      >
        <Icon size={72} />
      </div>

      <CardContent className="p-6">
        {/* Icon badge */}
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--color-accent-light, #dbeafe)' }}
        >
          <Icon size={17} style={{ color: colors.icon }} />
        </div>

        {/* Label */}
        <p className="text-[11px] font-semibold text-[var(--color-text-muted,#94a3b8)] uppercase tracking-wider mb-1.5">
          {title}
        </p>

        {/* Value */}
        <p
          className="text-[clamp(24px,2.5vw,32px)] font-bold tracking-tighter leading-none mb-2"
          style={{ color: colors.value }}
        >
          {valueNode ?? (typeof value === 'number' ? <AnimatedCounter value={value} /> : value)}
        </p>

        {/* Trend */}
        {trend && (
          <p
            className="text-[11px] font-medium flex items-center gap-1"
            style={{ color: trendUp ? colors.trend : '#ef4444' }}
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: trendUp ? colors.trend : '#ef4444' }}
            />
            {trend}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

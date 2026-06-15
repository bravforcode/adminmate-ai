import type { LucideIcon } from 'lucide-react'
import { AnimatedCounter } from './AnimatedCounter'

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
    <div
      onClick={onClick}
      className={`card-hover ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        backgroundColor: 'var(--color-surface, #ffffff)',
        border: '1px solid var(--color-border-subtle, #e2e8f0)',
        borderRadius: '12px',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'var(--font-sans, Inter, sans-serif)',
      }}
    >
      {/* Ghost background icon */}
      <div style={{
        position: 'absolute', top: '-4px', right: '-4px',
        opacity: 0.04, pointerEvents: 'none',
        color: colors.icon,
      }}>
        <Icon size={72} />
      </div>

      {/* Icon badge */}
      <div style={{
        width: '36px', height: '36px',
        borderRadius: '8px',
        backgroundColor: 'var(--color-accent-light, #dbeafe)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <Icon size={17} style={{ color: colors.icon }} />
      </div>

      {/* Label */}
      <p style={{
        fontSize: '11px', fontWeight: 600,
        color: 'var(--color-text-muted, #94a3b8)',
        letterSpacing: '0.08em', textTransform: 'uppercase',
        margin: '0 0 6px 0',
      }}>
        {title}
      </p>

      {/* Value */}
      <p style={{
        fontSize: 'clamp(24px, 2.5vw, 32px)',
        fontWeight: 700,
        color: colors.value,
        letterSpacing: '-0.03em',
        lineHeight: 1,
        margin: '0 0 8px 0',
      }}>
        {valueNode ?? (typeof value === 'number' ? <AnimatedCounter value={value} /> : value)}
      </p>

      {/* Trend */}
      {trend && (
        <p style={{
          fontSize: '11px',
          fontWeight: 500,
          color: trendUp ? colors.trend : '#ef4444',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          <span style={{
            display: 'inline-block',
            width: '5px', height: '5px',
            borderRadius: '50%',
            backgroundColor: trendUp ? colors.trend : '#ef4444',
            flexShrink: 0,
          }} />
          {trend}
        </p>
      )}
    </div>
  )
}

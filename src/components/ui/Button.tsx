import * as React from 'react'
import { cn } from '../../lib/utils'
import { Spinner } from './Spinner'
import { Slot } from './Slot'

const buttonVariants = {
  default: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active',
  secondary: 'bg-surface-raised text-ink border border-border hover:bg-surface-sunken active:bg-surface-raised',
  outline: 'border border-border bg-transparent text-ink-secondary hover:bg-surface-raised active:bg-surface-sunken',
  ghost: 'text-ink-secondary hover:bg-surface-raised active:bg-surface-sunken',
  destructive: 'bg-error text-white hover:opacity-90 active:opacity-100',
  link: 'text-primary underline-offset-4 hover:underline',
  gradient: 'bg-gradient-to-r from-primary to-blue-600 text-white hover:from-primary-hover hover:to-blue-700 active:from-primary-active active:to-blue-800',
  glow: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active shadow-[0_0_16px_rgba(37,99,235,0.25)] hover:shadow-[0_0_24px_rgba(37,99,235,0.35)]',
}

const buttonSizes = {
  xs: 'h-7 px-2.5 text-xs rounded-md gap-1',
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-4 text-sm rounded-lg gap-2',
  lg: 'h-10 px-5 text-sm rounded-lg gap-2',
  xl: 'h-11 px-6 text-base rounded-lg gap-2.5',
  icon_xs: 'h-7 w-7 rounded-md',
  icon_sm: 'h-8 w-8 rounded-md',
  icon_md: 'h-9 w-9 rounded-lg',
  icon_lg: 'h-10 w-10 rounded-lg',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  radius?: 'default' | 'pill' | 'sharp'
  asChild?: boolean
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  radius = 'default',
  children,
  disabled,
  onClick,
  asChild = false,
  ...props
}: ButtonProps) {
  const [ripples, setRipples] = React.useState<Array<{id: number; x: number; y: number; size: number}>>([])
  const nextId = React.useRef(0)

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) { onClick?.(e); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const sz = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - sz / 2
    const y = e.clientY - rect.top - sz / 2
    const id = nextId.current++
    setRipples(prev => [...prev, {id, x, y, size: sz}])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 500)
    onClick?.(e)
  }

  const radii = {
    default: '',
    pill: 'rounded-full',
    sharp: 'rounded-sm',
  }

  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      className={cn(
        'relative inline-flex items-center justify-center font-medium select-none',
        'transition-all duration-150 ease-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface',
        'disabled:pointer-events-none disabled:opacity-50',
        'cursor-pointer',
        buttonVariants[variant],
        buttonSizes[size],
        radii[radius],
        fullWidth && 'w-full',
        loading && 'cursor-wait',
        className,
      )}
      onClick={!asChild ? handleClick : undefined}
      disabled={!asChild ? (disabled || loading) : undefined}
      type={!asChild ? (props.type ?? 'button') : undefined}
      {...props}
    >
      {loading && !asChild && (
        <Spinner className="absolute" size={18} />
      )}

      <span className={cn('inline-flex items-center gap-2', loading && !asChild && 'opacity-0')}>
        {icon && iconPosition === 'left' && <span>{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span>{icon}</span>}
      </span>

      {!asChild && ripples.map(r => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/25 animate-ripple pointer-events-none"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </Comp>
  )
}

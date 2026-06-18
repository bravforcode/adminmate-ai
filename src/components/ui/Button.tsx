import * as React from 'react'
import { cn } from '../../lib/utils'
import { Spinner } from './Spinner'
import { Slot } from './Slot'

const buttonVariants = {
  default: 'bg-primary text-on-primary hover:opacity-90 active:opacity-100',
  gradient: 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 shadow-md hover:shadow-lg dark:from-blue-500 dark:to-indigo-500',
  secondary: 'bg-surface-container-low text-on-surface hover:bg-surface-container-high active:bg-surface-container dark:bg-surface-alt dark:text-on-surface dark:hover:bg-surface-container dark:active:bg-surface-container-low',
  outline: 'border border-outline bg-surface text-on-surface-variant hover:bg-surface-container-low active:bg-surface-container-low dark:border-outline dark:bg-surface dark:text-on-surface-variant dark:hover:bg-surface-container-low dark:active:bg-surface-container',
  ghost: 'text-on-surface-variant hover:bg-surface-container-low active:bg-surface-container dark:text-on-surface-variant dark:hover:bg-surface-container dark:active:bg-surface-container-low',
  destructive: 'bg-error text-white hover:opacity-90 active:opacity-100',
  link: 'text-primary underline-offset-4 hover:underline',
  glow: 'bg-primary text-on-primary hover:opacity-90 active:opacity-100 shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-shadow duration-300',
  glass: 'bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30 active:bg-white/40 dark:bg-black/20 dark:border-white/10 dark:text-on-surface',
  'premium-white': 'bg-surface text-on-surface hover:bg-surface-container-low active:bg-surface-container shadow-lg hover:shadow-xl',
}

const buttonSizes = {
  xs: 'h-7 px-2.5 text-xs rounded-md gap-1',
  sm: 'h-9 px-3.5 text-sm rounded-lg gap-1.5',
  md: 'h-10 px-5 text-sm rounded-xl gap-2',
  lg: 'h-12 px-7 text-base rounded-xl gap-2.5',
  xl: 'h-14 px-8 text-lg rounded-2xl gap-3',
  icon_xs: 'h-7 w-7 rounded-md',
  icon_sm: 'h-9 w-9 rounded-lg',
  icon_md: 'h-10 w-10 rounded-xl',
  icon_lg: 'h-12 w-12 rounded-xl',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
  loading?: boolean
  ripple?: boolean
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
  ripple = true,
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
    if (!ripple || disabled) { onClick?.(e); return }
    const rect = e.currentTarget.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const x = e.clientX - rect.left - size / 2
    const y = e.clientY - rect.top - size / 2
    const id = nextId.current++
    setRipples(prev => [...prev, {id, x, y, size}])
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600)
    onClick?.(e)
  }
  
  const radii = {
    default: 'rounded-xl',
    pill: 'rounded-full',
    sharp: 'rounded-md',
  }

  const Comp = asChild ? Slot : 'button'

  const iconAttr = icon ? (iconPosition === 'left' ? 'inline-start' : 'inline-end') : undefined

  const classNames = cn(
    'relative inline-flex items-center justify-center font-medium select-none',
    !asChild && [
      'transition-all duration-200 ease-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-background',
      'disabled:pointer-events-none disabled:opacity-50',
      'cursor-pointer',
    ],
    buttonVariants[variant],
    buttonSizes[size],
    radii[radius],
    fullWidth && 'w-full',
    loading && 'cursor-wait',
    className,
  )

  return (
    <Comp
      className={classNames}
      data-icon={iconAttr}
      onClick={!asChild ? handleClick : undefined}
      disabled={!asChild ? (disabled || loading) : undefined}
      type={!asChild ? (props.type ?? 'button') : undefined}
      {...props}
    >
      {loading && !asChild && (
        <Spinner className="absolute" size={20} />
      )}
      
      <span className={cn('inline-flex items-center gap-2', loading && !asChild && 'opacity-0')}>
        {icon && iconPosition === 'left' && <span data-icon="inline-start">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span data-icon="inline-end">{icon}</span>}
      </span>
      
      {!asChild && ripples.map(r => (
        <span
          key={r.id}
          className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
          style={{
            left: r.x,
            top: r.y,
            width: r.size,
            height: r.size,
          }}
        />
      ))}
    </Comp>
  )
}

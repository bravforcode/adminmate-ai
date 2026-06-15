import * as React from 'react'
import { cn } from '../../utils/cn'

interface ButtonGroupProps {
  children: React.ReactNode
  className?: string
  orientation?: 'horizontal' | 'vertical'
  variant?: 'outline' | 'ghost'
}

export function ButtonGroup({
  children,
  className,
  orientation = 'horizontal',
  variant = 'outline',
}: ButtonGroupProps) {
  const variantStyles = {
    outline: 'border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden',
    ghost: 'bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden',
  }

  return (
    <div
      className={cn(
        'inline-flex',
        orientation === 'vertical' ? 'flex-col' : 'flex-row',
        variantStyles[variant],
        '[&>*]:rounded-none [&>*]:border-0',
        orientation === 'horizontal' ? '[&>*:first-child]:rounded-l-xl [&>*:last-child]:rounded-r-xl' : '[&>*:first-child]:rounded-t-xl [&>*:last-child]:rounded-b-xl',
        orientation === 'horizontal' ? '[&>*+*]:border-l' : '[&>*+*]:border-t',
        className,
      )}
    >
      {children}
    </div>
  )
}

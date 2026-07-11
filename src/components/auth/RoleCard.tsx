import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface RoleCardProps {
  id: string
  title: string
  subtitle: string
  features: string[]
  ctaLabel: string
  icon: ReactNode
  accentColor: 'primary' | 'secondary'
  staggerClass?: string
  onSelect: () => void
}

/**
 * ponytail: Extracted from LoginPage inline role card markup.
 * Uses semantic <button> for keyboard accessibility.
 * CSS hover/focus replaces JS onMouseEnter/onMouseLeave.
 */
export function RoleCard({
  id,
  title,
  subtitle,
  features,
  ctaLabel,
  icon,
  accentColor,
  staggerClass = 'stagger-1',
  onSelect,
}: RoleCardProps) {
  const isPrimary = accentColor === 'primary'

  return (
    <button
      id={id}
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative w-full text-left rounded-[20px] p-10 overflow-hidden',
        'bg-surface border-[1.5px] border-border',
        'transition-all duration-400 ease-luxury',
        'hover:scale-[1.02] hover:shadow-[0_24px_56px_rgba(26,86,219,0.14)]',
        'hover:border-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-4',
        'active:scale-[0.99]',
        'bg-surface dark:hover:border-primary dark:hover:shadow-[0_24px_56px_rgba(26,86,219,0.2)]',
        staggerClass,
        'animate-fade-in-up',
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-11 h-11 rounded-xl flex items-center justify-center mb-5',
          isPrimary
            ? 'bg-primary shadow-[0_8px_20px_rgba(26,86,219,0.2)]'
            : 'bg-primary-subtle border-[1.5px] border-accent-dim dark:border-primary',
        )}
      >
        {icon}
      </div>

      {/* Title */}
      <h2 className="font-serif text-[22px] font-normal text-ink tracking-[-0.02em] mb-1.5">
        {title}
      </h2>

      {/* Subtitle */}
      <p className="text-[13px] text-ink-secondary text-ink-muted leading-relaxed mb-6">
        {subtitle}
      </p>

      {/* Features */}
      <ul className="list-none p-0 m-0 flex flex-col gap-2.5 mb-7">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2.5 text-[13px] text-ink text-ink">
            <span
              className={cn(
                'w-[5px] h-[5px] rounded-full shrink-0',
                isPrimary ? 'bg-primary' : 'bg-accent',
              )}
            />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'text-[11px] font-bold uppercase tracking-[0.08em]',
            isPrimary ? 'text-primary' : 'text-accent',
          )}
        >
          {ctaLabel}
        </span>
        <ArrowRight
          size={16}
          className={isPrimary ? 'text-primary' : 'text-accent'}
        />
      </div>
    </button>
  )
}

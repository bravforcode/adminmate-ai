import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

interface TourOverlayProps {
  targetRect: DOMRect
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  stepNumber: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  onFinish: () => void
}

function getTooltipPosition(
  targetRect: DOMRect,
  placement: 'top' | 'bottom' | 'left' | 'right',
  tooltipWidth: number,
  tooltipHeight: number
) {
  const gap = 16
  const padding = 16

  let top: number
  let left: number

  switch (placement) {
    case 'top':
      top = targetRect.top - tooltipHeight - gap
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
      break
    case 'bottom':
      top = targetRect.bottom + gap
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2
      break
    case 'left':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
      left = targetRect.left - tooltipWidth - gap
      break
    case 'right':
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2
      left = targetRect.right + gap
      break
  }

  left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding))
  top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding))

  return { top, left }
}

export function TourOverlay({
  targetRect,
  title,
  content,
  placement,
  stepNumber,
  totalSteps,
  isFirstStep,
  isLastStep,
  onNext,
  onPrev,
  onSkip,
  onFinish,
}: TourOverlayProps) {
  const { t } = useTranslation('common')
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip()
      if (e.key === 'Enter') onNext()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSkip, onNext])

  const tooltipWidth = 320
  const tooltipHeight = 200
  const pos = getTooltipPosition(targetRect, placement, tooltipWidth, tooltipHeight)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9998,
          pointerEvents: 'none',
        }}
      >
        {/* Backdrop */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 28, 46, 0.55)',
            pointerEvents: 'auto',
          }}
          onClick={onSkip}
        />

        {/* Cutout hole around target */}
        <div
          style={{
            position: 'absolute',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: '12px',
            boxShadow: '0 0 0 4000px rgba(15, 28, 46, 0.55)',
            pointerEvents: 'auto',
            cursor: 'pointer',
          }}
          onClick={onNext}
        />

        {/* Pulse ring on target */}
        <motion.div
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: targetRect.top - 10,
            left: targetRect.left - 10,
            width: targetRect.width + 20,
            height: targetRect.height + 20,
            borderRadius: '14px',
            border: '2px solid var(--color-accent, #60a5fa)',
            pointerEvents: 'none',
          }}
        />

        {/* Tooltip card */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.92, y: placement === 'bottom' ? -8 : 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: tooltipWidth,
            pointerEvents: 'auto',
          }}
          className="bg-surface dark:bg-surface rounded-2xl shadow-2xl border border-outline-variant dark:border-outline overflow-hidden"
        >
          {/* Progress bar */}
          <div className="h-1 bg-surface-container dark:bg-surface-container w-full">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(stepNumber / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>

          <div className="p-5">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-on-surface leading-tight">{title}</h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {t('tour.stepOf', { current: stepNumber, total: totalSteps })}
                  </p>
                </div>
              </div>
              <button
                onClick={onSkip}
                className="p-2 rounded-lg hover:bg-surface-container dark:hover:bg-surface-container transition-colors text-on-surface-variant dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={t('tour.skip')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <p className="text-xs text-on-surface-variant leading-relaxed mb-4">
              {content}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={onSkip}
                className="text-xs text-on-surface-variant hover:text-on-surface transition-colors px-3 py-2 min-h-[44px] flex items-center"
              >
                {t('tour.skip')}
              </button>

              <div className="flex items-center gap-2">
                {!isFirstStep && (
                  <button
                    onClick={onPrev}
                    className="flex items-center gap-1 text-xs text-on-surface-variant dark:text-on-surface-variant hover:text-on-surface dark:hover:text-on-surface transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-container dark:hover:bg-surface-container"
                  >
                    <ChevronLeft size={14} />
                    {t('tour.prev')}
                  </button>
                )}
                <button
                  onClick={isLastStep ? onFinish : onNext}
                  className="flex items-center gap-1 text-xs font-medium text-on-primary bg-primary hover:bg-primary/90 transition-colors px-4 py-1.5 rounded-lg"
                >
                  {isLastStep ? t('tour.finish') : t('tour.next')}
                  {!isLastStep && <ChevronRight size={14} />}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

import { useTour } from './TourProvider'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'

export function TourOverlay() {
  const { active, step, currentStep, totalSteps, next, prev, close } = useTour()
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!active || !step) { setPos(null); return }
    const updatePos = () => {
      const el = document.querySelector(step.target)
      if (el) {
        const rect = el.getBoundingClientRect()
        const placement = step.placement || 'bottom'
        let top = 0, left = 0
        switch (placement) {
          case 'bottom': top = rect.bottom + 12; left = rect.left + rect.width / 2; break
          case 'top': top = rect.top - 12; left = rect.left + rect.width / 2; break
          case 'left': top = rect.top + rect.height / 2; left = rect.left - 12; break
          case 'right': top = rect.top + rect.height / 2; left = rect.right + 12; break
        }
        setPos({ top, left })
      }
    }
    updatePos()
    window.addEventListener('scroll', updatePos, true)
    window.addEventListener('resize', updatePos)
    return () => {
      window.removeEventListener('scroll', updatePos, true)
      window.removeEventListener('resize', updatePos)
    }
  }, [active, step])

  if (!active || !step) return null

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', pointerEvents: 'auto' }} onClick={close} />
      {pos && (
        <div
          className="tour-popup"
          style={{
            position: 'fixed',
            zIndex: 9999,
            top: pos.top,
            left: pos.left,
            transform: step.placement === 'bottom' || step.placement === 'top' ? 'translateX(-50%)' : 'translateY(-50%)',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            padding: '20px 24px',
            maxWidth: 360,
            width: '90vw',
            pointerEvents: 'auto',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">{currentStep + 1} / {totalSteps}</span>
            <button onClick={close} className="p-1 rounded hover:bg-gray-100"><X size={16} /></button>
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">{step.title}</h3>
          <p className="text-sm text-gray-600 mb-4">{step.content}</p>
          <div className="flex items-center justify-between">
            <button
              onClick={prev}
              disabled={currentStep === 0}
              className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-30"
            >
              <ChevronLeft size={16} /> Back
            </button>
            <button
              onClick={next}
              className="flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              {currentStep === totalSteps - 1 ? 'Done' : 'Next'} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

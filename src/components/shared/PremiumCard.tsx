'use client'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { ReactNode, useRef } from 'react'

interface Props {
  children: ReactNode
  className?: string
  hoverEffect?: 'lift' | 'tilt' | 'glow' | 'border'
}

export function PremiumCard({ children, className = '', hoverEffect = 'lift' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15 })
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15 })

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['4deg', '-4deg'])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-4deg', '4deg'])

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    x.set(mouseX / width - 0.5)
    y.set(mouseY / height - 0.5)
  }

  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }

  const effects = {
    lift: 'hover:-translate-y-1 hover:shadow-lg',
    tilt: '',
    glow: 'hover:shadow-[0_0_30px_rgba(37,99,235,0.15)]',
    border: 'hover:border-primary/50',
  }

  if (hoverEffect === 'tilt') {
    return (
      <motion.div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
        className={`bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] transition-shadow duration-300 ${className}`}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      ref={ref}
      className={`bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] transition-all duration-300 ${effects[hoverEffect]} ${className}`}
    >
      {children}
    </div>
  )
}

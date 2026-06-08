import { motion } from 'motion/react'

interface HoverCardProps {
  children: React.ReactNode
  className?: string
  scale?: number
}

export function HoverCard({ children, className = '', scale = 1.02 }: HoverCardProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale, boxShadow: '0 8px 30px rgba(37, 99, 235, 0.12)' }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

import { motion } from 'motion/react'

interface StaggerChildrenProps {
  children: React.ReactNode
  className?: string
  staggerDelay?: number
}

export function StaggerChildren({ children, className, staggerDelay = 0.05 }: StaggerChildrenProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
      }}
    >
      {children}
    </motion.div>
  )
}

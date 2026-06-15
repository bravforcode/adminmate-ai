import { Suspense } from 'react'
import { motion } from 'framer-motion'

const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -10, scale: 0.98 },
}

const pageTransition = {
  type: 'spring' as const,
  damping: 25,
  stiffness: 200,
}

export function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      layout
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <Suspense
        fallback={
          <div className="space-y-4 p-4">
            <div className="h-8 w-48 bg-surface-container-high rounded-lg animate-shimmer" />
            <div className="h-4 w-72 bg-surface-container-high rounded animate-shimmer" style={{ animationDelay: '75ms' }} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-surface-container-high rounded-xl animate-shimmer" style={{ animationDelay: `${i * 75}ms` }} />
              ))}
            </div>
          </div>
        }
      >
        {children}
      </Suspense>
    </motion.div>
  )
}

import { Suspense } from 'react'
import { PageTransition } from './PageTransition'

export function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="animate-pulse h-64" />}>
      <PageTransition>{children}</PageTransition>
    </Suspense>
  )
}

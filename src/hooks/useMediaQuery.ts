import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const getMatch = () => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState<boolean>(getMatch)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

export const breakpoints = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  maxSm: '(max-width: 639px)',
  maxMd: '(max-width: 767px)',
  maxLg: '(max-width: 1023px)',
  maxXl: '(max-width: 1279px)',
} as const

export function useIsMobile(): boolean {
  return !useMediaQuery(breakpoints.md)
}

export function useIsTablet(): boolean {
  return useMediaQuery(breakpoints.md) && !useMediaQuery(breakpoints.lg)
}

export function useIsDesktop(): boolean {
  return useMediaQuery(breakpoints.lg)
}

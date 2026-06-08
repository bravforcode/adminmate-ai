import { reportError } from './errorHandler'

export interface PerformanceMark {
  label: string
  durationMs: number
  startTime: number
  metadata?: Record<string, unknown>
  timestamp: string
}

export interface PageLoadMark extends PerformanceMark {
  type: 'page_load'
  url: string
  domContentLoaded?: number
  loadComplete?: number
}

export interface QueryMark extends PerformanceMark {
  type: 'query'
  queryKey?: string
}

export interface EdgeFunctionMark extends PerformanceMark {
  type: 'edge_function'
  functionName: string
  status?: number
}

export type AnyMark =
  | PageLoadMark
  | QueryMark
  | EdgeFunctionMark
  | { type: 'custom'; label: string; durationMs: number; metadata?: Record<string, unknown>; timestamp: string }

const RECENT_MARKS: AnyMark[] = []
const MAX_RECENT = 100

const SLOW_THRESHOLDS = {
  query_ms: 1_000,
  edge_function_ms: 3_000,
  page_load_ms: 4_000,
}

function pushMark(mark: AnyMark) {
  RECENT_MARKS.unshift(mark)
  if (RECENT_MARKS.length > MAX_RECENT) {
    RECENT_MARKS.length = MAX_RECENT
  }
}

function isSlow(mark: AnyMark): boolean {
  if (mark.type === 'query') return mark.durationMs > SLOW_THRESHOLDS.query_ms
  if (mark.type === 'edge_function')
    return mark.durationMs > SLOW_THRESHOLDS.edge_function_ms
  if (mark.type === 'page_load')
    return mark.durationMs > SLOW_THRESHOLDS.page_load_ms
  return false
}

export function getRecentMarks(): readonly AnyMark[] {
  return RECENT_MARKS
}

export function clearRecentMarks() {
  RECENT_MARKS.length = 0
}

export function initPageLoadMonitoring() {
  if (typeof window === 'undefined') return
  if ((window as unknown as Record<string, unknown>).__adminmate_perf_init__) return
  ;(window as unknown as Record<string, unknown>).__adminmate_perf_init__ = true

  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined

  if (nav) {
    const mark: PageLoadMark = {
      type: 'page_load',
      label: 'navigation',
      url: window.location.href,
      durationMs: Math.round(nav.duration),
      startTime: nav.startTime,
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
      loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
      timestamp: new Date().toISOString(),
    }
    pushMark(mark)
    console.info('[perf] page load', mark)
    if (isSlow(mark)) {
      reportError(new Error(`Slow page load: ${mark.durationMs}ms`), {
        type: 'manual',
        severity: 'warning',
        ...mark,
      })
    }
  }
}

export function trackPageLoad(label = 'page', metadata?: Record<string, unknown>) {
  if (typeof performance === 'undefined') return
  const start = performance.now()
  return () => {
    const mark: AnyMark = {
      type: 'page_load',
      label,
      url: typeof window !== 'undefined' ? window.location.href : '',
      durationMs: Math.round(performance.now() - start),
      startTime: start,
      timestamp: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    } as PageLoadMark
    pushMark(mark)
    console.info('[perf] page load', mark)
  }
}

export async function trackQuery<T>(
  label: string,
  queryKey: string | readonly unknown[] | undefined,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const mark: QueryMark = {
      type: 'query',
      label,
      queryKey: Array.isArray(queryKey) ? queryKey.join(':') : typeof queryKey === 'string' ? queryKey : '',
      durationMs: Math.round(performance.now() - start),
      startTime: start,
      timestamp: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    }
    pushMark(mark)
    console.info('[perf] query', mark)
    if (isSlow(mark)) {
      reportError(new Error(`Slow query ${label}: ${mark.durationMs}ms`), {
        type: 'manual',
        severity: 'warning',
        ...mark,
      })
    }
    return result
  } catch (err) {
    const durationMs = Math.round(performance.now() - start)
    const mark: QueryMark = {
      type: 'query',
      label,
      queryKey: Array.isArray(queryKey) ? queryKey.join(':') : typeof queryKey === 'string' ? queryKey : '',
      durationMs,
      startTime: start,
      timestamp: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    }
    pushMark(mark)
    reportError(err, {
      type: 'api_error',
      severity: 'error',
      ...mark,
    })
    throw err
  }
}

export async function trackEdgeFunction<T>(
  functionName: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>,
): Promise<T> {
  const start = performance.now()
  try {
    const result = await fn()
    const mark: EdgeFunctionMark = {
      type: 'edge_function',
      label: functionName,
      functionName,
      durationMs: Math.round(performance.now() - start),
      startTime: start,
      timestamp: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    }
    pushMark(mark)
    console.info('[perf] edge function', mark)
    if (isSlow(mark)) {
      reportError(new Error(`Slow edge function ${functionName}: ${mark.durationMs}ms`), {
        type: 'manual',
        severity: 'warning',
        ...mark,
      })
    }
    return result
  } catch (err) {
    const durationMs = Math.round(performance.now() - start)
    const mark: EdgeFunctionMark = {
      type: 'edge_function',
      label: functionName,
      functionName,
      durationMs,
      startTime: start,
      timestamp: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    }
    pushMark(mark)
    reportError(err, {
      type: 'api_error',
      severity: 'error',
      ...mark,
    })
    throw err
  }
}

export function trackCustom(
  label: string,
  fn: () => void | Promise<void>,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const start = performance.now()
  return Promise.resolve(fn()).then(() => {
    const mark: AnyMark = {
      type: 'custom',
      label,
      durationMs: Math.round(performance.now() - start),
      timestamp: new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    }
    pushMark(mark)
    console.info('[perf] custom', mark)
  })
}

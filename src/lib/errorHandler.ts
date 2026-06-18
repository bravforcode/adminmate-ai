import toast from 'react-hot-toast'
import i18n from './i18n'

export type ErrorSeverity = 'critical' | 'error' | 'warning' | 'info'

export interface AppErrorPayload {
  type:
    | 'unhandled_promise'
    | 'uncaught_error'
    | 'manual'
    | 'react_error'
    | 'api_error'
    | 'query'
    | 'edge_function'
    | 'page_load'
    | 'custom'
  message: string
  stack?: string
  source?: string
  lineno?: number
  colno?: number
  reason?: string
  url: string
  userAgent: string
  userId?: string | null
  companyId?: string | null
  timestamp: string
  severity: ErrorSeverity
}

let initialized = false
let lastToastAt = 0
const TOAST_THROTTLE_MS = 4000

function safeStringify(value: unknown): string {
  try {
    if (value instanceof Error) {
      return JSON.stringify({
        name: value.name,
        message: value.message,
        stack: value.stack,
      })
    }
    return JSON.stringify(value)
  } catch {
    // String conversion as last resort — safeStringify is intentionally best-effort
    return String(value)
  }
}

function buildPayload(
  type: AppErrorPayload['type'],
  raw: unknown,
  extras: Partial<AppErrorPayload> = {},
): AppErrorPayload {
  const message =
    raw instanceof Error
      ? raw.message
      : typeof raw === 'string'
        ? raw
        : safeStringify(raw)

  const stack = raw instanceof Error ? raw.stack : undefined
  const severity: ErrorSeverity = extras.severity ?? 'error'

  return {
    type,
    message,
    stack,
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent:
      typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    timestamp: new Date().toISOString(),
    severity,
    ...extras,
  }
}

async function sendToEndpoint(payload: AppErrorPayload) {
  const env = import.meta.env as unknown as Record<string, string>
  const supabaseUrl = env.VITE_SUPABASE_URL
  const anonKey = env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    if (import.meta.env.DEV) console.warn('[errorHandler] No VITE_SUPABASE_URL; skipping remote log')
    return
  }

  try {
    await fetch(`${supabaseUrl}/functions/v1/log-client-error`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[errorHandler] Failed to send error to endpoint:', err)
  }
}

function persistLocally(payload: AppErrorPayload) {
  if (typeof localStorage === 'undefined') return
  try {
    const buf = JSON.parse(localStorage.getItem('adminmate:client-errors') || '[]')
    buf.push(payload)
    localStorage.setItem(
      'adminmate:client-errors',
      JSON.stringify(buf.slice(-50)),
    )
  } catch {
    // localStorage write is best-effort — silently ignore quota/unavailable errors
  }
}

function shouldShowToast(severity: ErrorSeverity): boolean {
  if (severity === 'critical') return false
  const now = Date.now()
  if (now - lastToastAt < TOAST_THROTTLE_MS) return false
  lastToastAt = now
  return true
}

function handleUncaughtError(event: ErrorEvent) {
  const payload = buildPayload('uncaught_error', event.error ?? event.message, {
    source: event.filename,
    lineno: event.lineno,
    colno: event.colno,
  })
  if (import.meta.env.DEV) console.error('[errorHandler] uncaught error', payload)
  persistLocally(payload)
  void sendToEndpoint(payload)

  if (shouldShowToast(payload.severity)) {
    toast.error(i18n.t('common:errors.unexpected_issue_reported'), {
      id: 'uncaught-error',
    })
  }
}

function handleUnhandledRejection(event: PromiseRejectionEvent) {
  const reason = event.reason
  const payload = buildPayload('unhandled_promise', reason, {
    reason: reason instanceof Error ? reason.message : safeStringify(reason),
  })
  if (import.meta.env.DEV) console.error('[errorHandler] unhandled rejection', payload)
  persistLocally(payload)
  void sendToEndpoint(payload)

  if (shouldShowToast(payload.severity)) {
    toast.error(i18n.t('common:errors.async_operation_failed'), {
      id: 'unhandled-rejection',
    })
  }
}

export function reportError(
  error: unknown,
  extras: Partial<AppErrorPayload> = {},
): AppErrorPayload {
  const payload = buildPayload('manual', error, extras)
  if (import.meta.env.DEV) console.error('[errorHandler] manual report', payload)
  persistLocally(payload)
  void sendToEndpoint(payload)
  return payload
}

export function initGlobalErrorHandler() {
  if (initialized) return
  if (typeof window === 'undefined') return
  initialized = true

  window.addEventListener('error', handleUncaughtError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)

  if (import.meta.env.DEV) console.info('[errorHandler] Global error handlers initialized')
}

export function getBufferedErrors(): AppErrorPayload[] {
  if (typeof localStorage === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem('adminmate:client-errors') || '[]')
  } catch {
    // Corrupted localStorage data — return empty rather than crashing
    return []
  }
}

export function clearBufferedErrors() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem('adminmate:client-errors')
  } catch {
    // localStorage remove is best-effort — silently ignore unavailable storage
  }
}

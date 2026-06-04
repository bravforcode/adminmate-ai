import { reportError } from './errorHandler'

export const DEFAULT_TIMEOUT_MS = 30_000
export const DEFAULT_RETRIES = 1

export interface SafeFetchOptions extends Omit<RequestInit, 'signal'> {
  timeoutMs?: number
  retries?: number
  retryDelayMs?: number
  metadata?: Record<string, unknown>
  signal?: AbortSignal
}

export class ApiError extends Error {
  readonly status: number
  readonly statusText: string
  readonly url: string
  readonly body?: unknown
  readonly cause?: unknown
  readonly isTimeout: boolean
  readonly isNetwork: boolean
  readonly attempts: number

  constructor(params: {
    message: string
    status: number
    statusText: string
    url: string
    body?: unknown
    cause?: unknown
    isTimeout?: boolean
    isNetwork?: boolean
    attempts: number
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.statusText = params.statusText
    this.url = params.url
    this.body = params.body
    this.cause = params.cause
    this.isTimeout = params.isTimeout ?? false
    this.isNetwork = params.isNetwork ?? false
    this.attempts = params.attempts
  }
}

const isAbortError = (err: unknown): boolean =>
  err instanceof DOMException && err.name === 'AbortError'

const isNetworkError = (err: unknown): boolean => {
  if (err instanceof TypeError) return true
  if (err instanceof Error) {
    const msg = err.message.toLowerCase()
    return (
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('network request failed')
    )
  }
  return false
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

async function readBodySafely(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function safeFetch(
  input: RequestInfo | URL,
  init: SafeFetchOptions = {},
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    retryDelayMs = 500,
    metadata,
    ...requestInit
  } = init

  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : (input as Request).url

  const start = performance.now()
  let lastError: unknown = null
  const totalAttempts = retries + 1

  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    if (requestInit.signal) {
      const external = requestInit.signal
      if (external.aborted) controller.abort()
      else external.addEventListener('abort', () => controller.abort(), { once: true })
    }

    try {
      const res = await fetch(input, { ...requestInit, signal: controller.signal })
      clearTimeout(timer)
      const duration = performance.now() - start

      console.info('[safeFetch] response', {
        url,
        method: requestInit.method ?? 'GET',
        status: res.status,
        ok: res.ok,
        attempt,
        durationMs: Math.round(duration),
        ...(metadata ?? {}),
      })

      if (!res.ok) {
        const body = await readBodySafely(res)
        const apiErr = new ApiError({
          message: `HTTP ${res.status} ${res.statusText}`.trim(),
          status: res.status,
          statusText: res.statusText,
          url,
          body,
          attempts: attempt,
        })
        reportError(apiErr, {
          type: 'api_error',
          severity: res.status >= 500 ? 'error' : 'warning',
          ...(metadata ?? {}),
        })
        throw apiErr
      }

      return res
    } catch (err) {
      clearTimeout(timer)
      lastError = err

      const timedOut = isAbortError(err)
      const network = isNetworkError(err)
      const retriable = timedOut || network || (err instanceof ApiError && err.status >= 500)

      console.warn('[safeFetch] attempt failed', {
        url,
        attempt,
        totalAttempts,
        timedOut,
        network,
        retriable,
        error: err instanceof Error ? err.message : String(err),
      })

      if (attempt >= totalAttempts || !retriable) {
        const apiErr =
          err instanceof ApiError
            ? err
            : new ApiError({
                message:
                  (err instanceof Error ? err.message : String(err)) ||
                  'Request failed',
                status: 0,
                statusText: '',
                url,
                cause: err,
                isTimeout: timedOut,
                isNetwork: network,
                attempts: attempt,
              })

        reportError(apiErr, {
          type: 'api_error',
          severity: timedOut || network ? 'error' : 'warning',
          ...(metadata ?? {}),
        })
        throw apiErr
      }

      await sleep(retryDelayMs * attempt)
    }
  }

  throw new ApiError({
    message: 'safeFetch: exhausted retries',
    status: 0,
    statusText: '',
    url,
    cause: lastError,
    attempts: totalAttempts,
  })
}

export async function safeFetchJson<T = unknown>(
  input: RequestInfo | URL,
  init: SafeFetchOptions = {},
): Promise<T> {
  const res = await safeFetch(input, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (res.status === 204) return undefined as T
  const text = await res.text()
  if (!text) return undefined as T
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

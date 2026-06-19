/**
 * Minimal Sentry error capture for Supabase Edge Functions (Deno runtime).
 * No external dependencies — uses Sentry REST API directly.
 * No-ops if SENTRY_DSN is not configured.
 */

const SENTRY_DSN = Deno.env.get('SENTRY_DSN') || ''
const ENVIRONMENT = Deno.env.get('DENO_DEPLOYMENT_ID') ? 'production' : 'development'

interface SentryEvent {
  message: string
  level: 'error' | 'warning' | 'info'
  platform: string
  environment: string
  timestamp: number
  exception?: {
    values: Array<{
      type: string
      value: string
      stacktrace?: { frames: Array<{ filename: string; function: string; lineno: number }> }
    }>
  }
  extra?: Record<string, unknown>
  tags?: Record<string, string>
}

function parseDsn(dsn: string): { projectId: string; ingestUrl: string; authToken?: string } | null {
  try {
    // Format: https://<key>@<host>/<projectId>
    const url = new URL(dsn)
    const projectId = url.pathname.replace('/', '')
    const ingestUrl = `${url.protocol}//${url.host}/api/${projectId}/envelope/`
    const authToken = url.username || undefined
    return { projectId, ingestUrl, authToken }
  } catch {
    return null
  }
}

/**
 * Capture an error event and send to Sentry (fire-and-forget).
 * Never throws — failures are silently logged to console only.
 */
export async function captureError(
  error: unknown,
  context: {
    function: string
    userId?: string
    extra?: Record<string, unknown>
  }
): Promise<void> {
  if (!SENTRY_DSN) return

  const parsed = parseDsn(SENTRY_DSN)
  if (!parsed) {
    console.error('[Sentry] Invalid SENTRY_DSN format')
    return
  }

  const rawMessage = error instanceof Error ? error.message : String(error)
  const errorType = error instanceof Error ? error.constructor.name : 'UnknownError'

  // Sanitize PII from error message before sending to Sentry
  const errorMessage = rawMessage
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/sk_(live|test)_[a-zA-Z0-9]+/g, '[STRIPE_KEY]')
    .replace(/Bearer\s+[a-zA-Z0-9._-]{20,}/g, 'Bearer [TOKEN]')
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '[UUID]')
    .replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
    .replace(/password[^,]*/gi, 'password=[REDACTED]')
    .replace(/secret[^,]*/gi, 'secret=[REDACTED]')

  let stacktrace: SentryEvent['exception']['values'][0]['stacktrace'] | undefined
  if (error instanceof Error && error.stack) {
    const frames = error.stack.split('\n').slice(1, 6).map(line => {
      const match = line.match(/at\s+(.+?)\s+\((.+):(\d+):(\d+)\)/)
      if (match) {
        return { filename: match[2], function: match[1], lineno: parseInt(match[3]) }
      }
      const matchSimple = line.match(/at\s+(.+):(\d+)/)
      if (matchSimple) {
        return { filename: matchSimple[1], function: '<anonymous>', lineno: parseInt(matchSimple[2]) }
      }
      return { filename: 'unknown', function: line.trim(), lineno: 0 }
    })
    stacktrace = { frames }
  }

  const event: SentryEvent = {
    message: `[${context.function}] ${errorMessage}`,
    level: 'error',
    platform: 'javascript',
    environment: ENVIRONMENT,
    timestamp: Date.now() / 1000,
    exception: {
      values: [{
        type: errorType,
        value: errorMessage,
        ...(stacktrace && { stacktrace }),
      }],
    },
    tags: {
      function: context.function,
      runtime: 'deno-edge',
    },
    ...(context.userId && { user: { id: context.userId } as unknown as SentryEvent['user'] }),
    ...(context.extra && { extra: context.extra }),
  }

  try {
    const envelope = `sentry-json-envelope\n${JSON.stringify({ trace: { environment: ENVIRONMENT, public_key: parsed.authToken || '', trace_id: crypto.randomUUID() } })}\n${JSON.stringify(event)}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-sentry-envelope',
      'User-Agent': 'adminmate-edge/1.0',
    }
    if (parsed.authToken) {
      headers['X-Sentry-Auth'] = `Sentry sentry_key=${parsed.authToken}, sentry_version=7, sentry_client=adminmate-edge/1.0`
    }

    // Fire-and-forget — don't await in production to avoid blocking
    fetch(parsed.ingestUrl, {
      method: 'POST',
      headers,
      body: envelope,
      keepalive: true,
    }).catch(() => {
      // Silently ignore Sentry transmission failures
    })
  } catch {
    // Silently ignore — Sentry should never break the request
  }
}

/**
 * Higher-order wrapper to capture unhandled errors in Edge Function handlers.
 */
export function withSentryCapture<T>(
  fnName: string,
  handler: () => Promise<T>
): Promise<T> {
  return handler().catch((error: unknown) => {
    captureError(error, { function: fnName })
    throw error
  })
}

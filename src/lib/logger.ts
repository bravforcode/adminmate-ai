export interface LogEntry {
  correlation_id: string
  timestamp: string
  level: 'debug' | 'info' | 'warn' | 'error'
  service: string
  message: string
  context?: Record<string, unknown>
  user_id?: string
  company_id?: string
}

interface LoggerOptions {
  service?: string
  userId?: string
  companyId?: string
}

const correlationId = crypto.randomUUID()

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]+/g
const PHONE_RE = /\+?\d[\d\s-]{8,}/g
const TOKEN_RE = /Bearer\s+[\w-]+\.[\w-]+\.[\w-]+/g

function redact(text: string): string {
  return text
    .replace(EMAIL_RE, '[REDACTED_EMAIL]')
    .replace(PHONE_RE, '[REDACTED_PHONE]')
    .replace(TOKEN_RE, 'Bearer [REDACTED_TOKEN]')
}

class Logger {
  private service: string
  private userId?: string
  private companyId?: string

  constructor(opts: LoggerOptions = {}) {
    this.service = opts.service ?? 'adminmate-web'
    this.userId = opts.userId
    this.companyId = opts.companyId
  }

  setUser(userId: string | undefined, companyId?: string) {
    this.userId = userId
    if (companyId !== undefined) this.companyId = companyId
  }

  private shouldLog(): boolean {
    if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return true
    if (typeof process !== 'undefined' && process.env?.DEBUG === 'true') return true
    return false
  }

  private buildEntry(level: LogEntry['level'], message: string, context?: Record<string, unknown>): LogEntry {
    const entry: LogEntry = {
      correlation_id: correlationId,
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message: redact(message),
    }
    if (context) entry.context = context
    if (this.userId) entry.user_id = this.userId
    if (this.companyId) entry.company_id = this.companyId
    return entry
  }

  private output(entry: LogEntry) {
    const fn = entry.level === 'error' ? console.error
      : entry.level === 'warn' ? console.warn
      : entry.level === 'debug' ? console.debug
      : console.info
    fn(JSON.stringify(entry))
  }

  private async sendRemote(entry: LogEntry) {
    try {
      const env = (typeof import.meta !== 'undefined' ? import.meta.env : undefined) as Record<string, string> | undefined
      const supabaseUrl = env?.VITE_SUPABASE_URL
      const anonKey = env?.VITE_SUPABASE_ANON_KEY
      if (!supabaseUrl) return

      await fetch(`${supabaseUrl}/functions/v1/log-client-error`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { apikey: anonKey, Authorization: `Bearer ${anonKey}` } : {}),
        },
        body: JSON.stringify(entry),
        keepalive: true,
      })
    } catch {
      // Remote logging is best-effort
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog()) return
    this.output(this.buildEntry('debug', message, context))
  }

  info(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog()) return
    this.output(this.buildEntry('info', message, context))
  }

  warn(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog()) return
    this.output(this.buildEntry('warn', message, context))
  }

  error(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog()) return
    const entry = this.buildEntry('error', message, context)
    this.output(entry)
    void this.sendRemote(entry)
  }
}

export const logger = new Logger()

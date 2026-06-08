const STORAGE_PREFIX = 'adminmate-rl:'
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 60_000

interface LockoutState {
  attempts: number
  lockedUntil: number | null
  firstAttemptAt: number
}

function now(): number {
  return Date.now()
}

function read(key: string): LockoutState {
  if (typeof window === 'undefined') {
    return { attempts: 0, lockedUntil: null, firstAttemptAt: 0 }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return { attempts: 0, lockedUntil: null, firstAttemptAt: 0 }
    const parsed = JSON.parse(raw) as LockoutState
    if (parsed.lockedUntil && parsed.lockedUntil < now()) {
      return { attempts: 0, lockedUntil: null, firstAttemptAt: 0 }
    }
    return parsed
  } catch {
    return { attempts: 0, lockedUntil: null, firstAttemptAt: 0 }
  }
}

function write(key: string, value: LockoutState): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch { /* localStorage may be full or unavailable */ }
}

function clear(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + key)
  } catch { /* localStorage may be unavailable */ }
}

export function getLockoutRemainingMs(key: string): number {
  const state = read(key)
  if (!state.lockedUntil) return 0
  const remaining = state.lockedUntil - now()
  return remaining > 0 ? remaining : 0
}

export function isLockedOut(key: string): boolean {
  return getLockoutRemainingMs(key) > 0
}

export function recordFailure(key: string): LockoutState {
  const state = read(key)
  const next: LockoutState = {
    attempts: state.attempts + 1,
    lockedUntil: null,
    firstAttemptAt: state.firstAttemptAt || now(),
  }
  if (next.attempts >= MAX_ATTEMPTS) {
    next.lockedUntil = now() + LOCKOUT_MS
    next.attempts = 0
    next.firstAttemptAt = 0
  }
  write(key, next)
  return next
}

export function recordSuccess(key: string): void {
  clear(key)
}

export function getAttemptCount(key: string): number {
  return read(key).attempts
}

export const RATE_LIMIT_MAX_ATTEMPTS = MAX_ATTEMPTS
export const RATE_LIMIT_LOCKOUT_MS = LOCKOUT_MS

export const COOKIE_NAME = 'sb-auth-refresh'

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

export function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!cookieHeader) return cookies
  for (const part of cookieHeader.split(';')) {
    const eqPos = part.indexOf('=')
    if (eqPos > -1) {
      const name = part.slice(0, eqPos).trim()
      const value = part.slice(eqPos + 1).trim()
      cookies[name] = decodeURIComponent(value)
    }
  }
  return cookies
}

export function createRefreshCookie(value: string): string {
  // __Host- prefix requires: Secure, Path=/, no Domain attribute
  // SameSite=Strict prevents CSRF via top-level navigation
  return `__Host-${COOKIE_NAME}=${value}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE}`
}

export function clearRefreshCookie(): string {
  return `__Host-${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
}

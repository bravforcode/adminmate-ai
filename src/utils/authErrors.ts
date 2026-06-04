import type { TFunction } from 'i18next'

interface SupabaseErrorShape {
  message?: string
  status?: number
  code?: string
  name?: string
  __isAuthError?: boolean
}

const ERROR_MAP: Array<{ match: RegExp; key: string }> = [
  { match: /invalid login credentials/i, key: 'errors.auth_invalid_credentials' },
  { match: /invalid credentials/i, key: 'errors.auth_invalid_credentials' },
  { match: /email not confirmed/i, key: 'errors.auth_email_not_confirmed' },
  { match: /user already registered/i, key: 'errors.auth_user_exists' },
  { match: /already registered/i, key: 'errors.auth_user_exists' },
  { match: /signups not allowed/i, key: 'errors.auth_signups_disabled' },
  { match: /signup disabled/i, key: 'errors.auth_signups_disabled' },
  { match: /unsupported provider/i, key: 'errors.auth_provider_disabled' },
  { match: /provider is not enabled/i, key: 'errors.auth_provider_disabled' },
  { match: /email rate limit/i, key: 'errors.auth_rate_limited' },
  { match: /rate limit/i, key: 'errors.auth_rate_limited' },
  { match: /too many requests/i, key: 'errors.auth_rate_limited' },
  { match: /password should be at least/i, key: 'errors.auth_weak_password' },
  { match: /password is too weak/i, key: 'errors.auth_weak_password' },
  { match: /unable to validate email address/i, key: 'errors.auth_invalid_email_format' },
  { match: /email address .* is invalid/i, key: 'errors.auth_invalid_email_format' },
  { match: /token has expired/i, key: 'errors.auth_token_expired' },
  { match: /expired/i, key: 'errors.auth_token_expired' },
  { match: /refresh token/i, key: 'errors.auth_session_expired' },
  { match: /session expired/i, key: 'errors.auth_session_expired' },
  { match: /auth session missing/i, key: 'errors.auth_session_missing' },
  { match: /network/i, key: 'errors.network' },
  { match: /failed to fetch/i, key: 'errors.network' },
  { match: /invalid email or password/i, key: 'errors.auth_invalid_credentials' },
  { match: /user not found/i, key: 'errors.auth_user_not_found' },
]

export function translateAuthError(err: unknown, t: TFunction, fallbackKey = 'errors.generic'): string {
  if (!err) return t(fallbackKey)
  const e = err as SupabaseErrorShape
  const message = (e?.message || String(err) || '').toString()
  for (const { match, key } of ERROR_MAP) {
    if (match.test(message)) {
      const translated = t(key)
      if (translated && translated !== key) return translated
    }
  }
  if (typeof message === 'string' && message.length > 0 && message.length < 200) {
    return message
  }
  return t(fallbackKey)
}

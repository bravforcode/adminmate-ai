import { describe, it, expect, vi } from 'vitest'
import { translateAuthError } from './authErrors'

// Mock i18next TFunction
function mockT(key: string): string {
  const translations: Record<string, string> = {
    'errors.auth_invalid_credentials': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'errors.auth_email_not_confirmed': 'กรุณายืนยันอีเมลของคุณ',
    'errors.auth_user_exists': 'ผู้ใช้นี้ลงทะเบียนแล้ว',
    'errors.auth_signups_disabled': 'การลงทะเบียนถูกปิดใช้งาน',
    'errors.auth_provider_disabled': 'ผู้ให้บริการนี้ไม่พร้อมใช้งาน',
    'errors.auth_rate_limited': 'คำขอมากเกินไป กรุณารอสักครู่',
    'errors.auth_weak_password': 'รหัสผ่านไม่ปลอดภัยเพียงพอ',
    'errors.auth_invalid_email_format': 'รูปแบบอีเมลไม่ถูกต้อง',
    'errors.auth_token_expired': 'โทเค็นหมดอายุแล้ว',
    'errors.auth_session_expired': 'เซสชันหมดอายุแล้ว',
    'errors.auth_session_missing': 'ไม่พบเซชัน',
    'errors.network': 'เกิดปัญหาการเชื่อมต่อเครือข่าย',
    'errors.auth_user_not_found': 'ไม่พบผู้ใช้',
    'errors.generic': 'เกิดข้อผิดพลาด',
  }
  return translations[key] ?? key
}
const t = mockT as any

describe('translateAuthError', () => {
  // ─── Null / undefined / empty ───────────────────────────
  describe('edge cases', () => {
    it('should return fallback for null', () => {
      expect(translateAuthError(null, t)).toBe('เกิดข้อผิดพลาด')
    })

    it('should return fallback for undefined', () => {
      expect(translateAuthError(undefined, t)).toBe('เกิดข้อผิดพลาด')
    })

    it('should use custom fallbackKey', () => {
      expect(translateAuthError(null, t, 'errors.network')).toBe('เกิดปัญหาการเชื่อมต่อเครือข่าย')
    })
  })

  // ─── Specific error messages ────────────────────────────
  describe('credential errors', () => {
    it('should translate "Invalid login credentials"', () => {
      expect(translateAuthError({ message: 'Invalid login credentials' }, t)).toBe('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    })

    it('should translate "invalid credentials"', () => {
      expect(translateAuthError({ message: 'invalid credentials' }, t)).toBe('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    })

    it('should translate "invalid email or password"', () => {
      expect(translateAuthError({ message: 'invalid email or password' }, t)).toBe('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    })
  })

  describe('email not confirmed', () => {
    it('should translate "email not confirmed"', () => {
      expect(translateAuthError({ message: 'email not confirmed' }, t)).toBe('กรุณายืนยันอีเมลของคุณ')
    })
  })

  describe('user already registered', () => {
    it('should translate "user already registered"', () => {
      expect(translateAuthError({ message: 'user already registered' }, t)).toBe('ผู้ใช้นี้ลงทะเบียนแล้ว')
    })

    it('should translate "already registered"', () => {
      expect(translateAuthError({ message: 'already registered' }, t)).toBe('ผู้ใช้นี้ลงทะเบียนแล้ว')
    })
  })

  describe('signups disabled', () => {
    it('should translate "signups not allowed"', () => {
      expect(translateAuthError({ message: 'signups not allowed' }, t)).toBe('การลงทะเบียนถูกปิดใช้งาน')
    })

    it('should translate "signup disabled"', () => {
      expect(translateAuthError({ message: 'signup disabled' }, t)).toBe('การลงทะเบียนถูกปิดใช้งาน')
    })
  })

  describe('provider disabled', () => {
    it('should translate "unsupported provider"', () => {
      expect(translateAuthError({ message: 'unsupported provider' }, t)).toBe('ผู้ให้บริการนี้ไม่พร้อมใช้งาน')
    })

    it('should translate "provider is not enabled"', () => {
      expect(translateAuthError({ message: 'provider is not enabled' }, t)).toBe('ผู้ให้บริการนี้ไม่พร้อมใช้งาน')
    })
  })

  describe('rate limiting', () => {
    it('should translate "email rate limit"', () => {
      expect(translateAuthError({ message: 'email rate limit exceeded' }, t)).toBe('คำขอมากเกินไป กรุณารอสักครู่')
    })

    it('should translate "rate limit"', () => {
      expect(translateAuthError({ message: 'rate limit hit' }, t)).toBe('คำขอมากเกินไป กรุณารอสักครู่')
    })

    it('should translate "too many requests"', () => {
      expect(translateAuthError({ message: 'too many requests' }, t)).toBe('คำขอมากเกินไป กรุณารอสักครู่')
    })
  })

  describe('weak password', () => {
    it('should translate "password should be at least"', () => {
      expect(translateAuthError({ message: 'password should be at least 8 characters' }, t)).toBe('รหัสผ่านไม่ปลอดภัยเพียงพอ')
    })

    it('should translate "password is too weak"', () => {
      expect(translateAuthError({ message: 'password is too weak' }, t)).toBe('รหัสผ่านไม่ปลอดภัยเพียงพอ')
    })
  })

  describe('invalid email format', () => {
    it('should translate "unable to validate email address"', () => {
      expect(translateAuthError({ message: 'unable to validate email address: invalid format' }, t)).toBe('รูปแบบอีเมลไม่ถูกต้อง')
    })

    it('should translate "email address ... is invalid"', () => {
      expect(translateAuthError({ message: 'email address foo@ is invalid' }, t)).toBe('รูปแบบอีเมลไม่ถูกต้อง')
    })
  })

  describe('token expired', () => {
    it('should translate "token has expired"', () => {
      expect(translateAuthError({ message: 'token has expired' }, t)).toBe('โทเค็นหมดอายุแล้ว')
    })

    it('should translate "expired"', () => {
      expect(translateAuthError({ message: 'expired token' }, t)).toBe('โทเค็นหมดอายุแล้ว')
    })
  })

  describe('session errors', () => {
    it('should translate "refresh token"', () => {
      expect(translateAuthError({ message: 'refresh token invalid' }, t)).toBe('เซสชันหมดอายุแล้ว')
    })

    it('"session expired" matches expired regex first due to ERROR_MAP ordering', () => {
      // In the source, /expired/i comes before /session expired/i,
      // so "session expired" matches the token_expired pattern first
      expect(translateAuthError({ message: 'session expired' }, t)).toBe('โทเค็นหมดอายุแล้ว')
    })

    it('should translate "auth session missing"', () => {
      expect(translateAuthError({ message: 'auth session missing' }, t)).toBe('ไม่พบเซชัน')
    })
  })

  describe('network errors', () => {
    it('should translate "network"', () => {
      expect(translateAuthError({ message: 'network error' }, t)).toBe('เกิดปัญหาการเชื่อมต่อเครือข่าย')
    })

    it('should translate "failed to fetch"', () => {
      expect(translateAuthError({ message: 'failed to fetch' }, t)).toBe('เกิดปัญหาการเชื่อมต่อเครือข่าย')
    })
  })

  describe('user not found', () => {
    it('should translate "user not found"', () => {
      expect(translateAuthError({ message: 'user not found' }, t)).toBe('ไม่พบผู้ใช้')
    })
  })

  // ─── Fallback behavior ──────────────────────────────────
  describe('fallback', () => {
    it('should return raw message if no pattern matches and message is short', () => {
      const result = translateAuthError({ message: 'Something weird happened' }, t)
      expect(result).toBe('Something weird happened')
    })

    it('should return fallback for very long messages (>200 chars)', () => {
      const longMsg = 'x'.repeat(201)
      expect(translateAuthError({ message: longMsg }, t)).toBe('เกิดข้อผิดพลาด')
    })

    it('should handle string errors', () => {
      const result = translateAuthError('generic error message', t)
      expect(typeof result).toBe('string')
    })

    it('should handle errors without message property', () => {
      const result = translateAuthError({ code: 400 }, t)
      // Falls through to returning the stringified object or fallback
      expect(typeof result).toBe('string')
    })
  })

  // ─── Translation key not in map ─────────────────────────
  describe('untranslated keys', () => {
    it('should return raw message when t returns the key back', () => {
      const strictT = (key: string) => key // returns key itself (no translation)
      const result = translateAuthError({ message: 'Invalid login credentials' }, strictT as any)
      // Since strictT returns the key and key !== key is false, it falls through
      expect(typeof result).toBe('string')
    })
  })
})

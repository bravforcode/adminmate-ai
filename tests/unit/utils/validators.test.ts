import { describe, it, expect } from 'vitest'
import { emailSchema, passwordSchema, phoneSchema, taxIdSchema } from '../../../src/utils/validators'

describe('validators', () => {
  it('emailSchema: accepts valid emails', () => {
    expect(emailSchema.safeParse('user@company.com').success).toBe(true)
    expect(emailSchema.safeParse('test+tag@domain.co.th').success).toBe(true)
  })

  it('emailSchema: rejects invalid emails', () => {
    expect(emailSchema.safeParse('').success).toBe(false)
    expect(emailSchema.safeParse('not-an-email').success).toBe(false)
  })

  it('passwordSchema: requires 8+ characters', () => {
    expect(passwordSchema.safeParse('12345678').success).toBe(true)
    expect(passwordSchema.safeParse('1234567').success).toBe(false)
  })

  it('phoneSchema: validates phone formats', () => {
    expect(phoneSchema.safeParse('+66812345678').success).toBe(true)
    expect(phoneSchema.safeParse('0812345678').success).toBe(true)
    expect(phoneSchema.safeParse('abc').success).toBe(false)
  })

  it('taxIdSchema: requires 5+ characters', () => {
    expect(taxIdSchema.safeParse('12345').success).toBe(true)
    expect(taxIdSchema.safeParse('1234').success).toBe(false)
  })
})

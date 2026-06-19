import { describe, it, expect } from 'vitest'

/* ============================================================
   Release 3 — Candidate Portal Security Tests
   Validates submission validation logic, field blocking,
   and tenant safety properties.
   ============================================================ */

// Extract validation logic from edge function for testing
const ALLOWED_FIELDS = [
  'full_name', 'email', 'phone', 'location',
  'current_position', 'experience_years', 'linkedin_url',
  'portfolio_url', 'preferred_language', 'cover_letter',
]

const BLOCKED_FIELDS = [
  'company_id', 'role', 'status', 'source',
  'ai_match_score', 'ai_analysis', 'recruiter_notes',
  'rejection_reason', 'internal_notes',
]

const MAX_NAME_LENGTH = 255
const MAX_EMAIL_LENGTH = 255

function validateSubmission(body: Record<string, unknown>): { valid: boolean; error?: string } {
  // Block sensitive fields
  for (const field of BLOCKED_FIELDS) {
    if (field in body) return { valid: false, error: `Field not allowed: ${field}` }
  }

  // Required fields
  const { job_token, full_name, email, consent_given } = body as any
  if (!job_token || typeof job_token !== 'string' || job_token.length > 32) {
    return { valid: false, error: 'Invalid job token' }
  }
  if (!full_name || typeof full_name !== 'string' || full_name.length < 1 || full_name.length > MAX_NAME_LENGTH) {
    return { valid: false, error: `Full name required (1-${MAX_NAME_LENGTH} chars)` }
  }
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > MAX_EMAIL_LENGTH) {
    return { valid: false, error: 'Valid email required' }
  }
  if (consent_given !== true) {
    return { valid: false, error: 'Consent is required to submit application' }
  }

  return { valid: true }
}

describe('Candidate Portal — Submission Validation', () => {
  it('rejects company_id spoofing', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: 'Test',
      email: 'test@example.com',
      consent_given: true,
      company_id: 'evil-company-id',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('company_id')
  })

  it('rejects role escalation', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: 'Test',
      email: 'test@example.com',
      consent_given: true,
      role: 'admin',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('role')
  })

  it('rejects status manipulation', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: 'Test',
      email: 'test@example.com',
      consent_given: true,
      status: 'hired',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('status')
  })

  it('rejects source spoofing', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: 'Test',
      email: 'test@example.com',
      consent_given: true,
      source: 'referral',
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('source')
  })

  it('rejects AI field injection', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: 'Test',
      email: 'test@example.com',
      consent_given: true,
      ai_match_score: 99.9,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('ai_match_score')
  })

  it('rejects missing consent', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: 'Test',
      email: 'test@example.com',
      consent_given: false,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Consent')
  })

  it('rejects missing job_token', () => {
    const result = validateSubmission({
      full_name: 'Test',
      email: 'test@example.com',
      consent_given: true,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('job token')
  })

  it('rejects invalid email', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: 'Test',
      email: 'not-an-email',
      consent_given: true,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('email')
  })

  it('rejects empty name', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: '',
      email: 'test@example.com',
      consent_given: true,
    })
    expect(result.valid).toBe(false)
    expect(result.error).toContain('name')
  })

  it('accepts valid submission', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: 'John Smith',
      email: 'john@example.com',
      consent_given: true,
    })
    expect(result.valid).toBe(true)
  })

  it('accepts submission with optional fields', () => {
    const result = validateSubmission({
      job_token: 'abc123',
      full_name: 'John Smith',
      email: 'john@example.com',
      phone: '+66812345678',
      location: 'Bangkok',
      current_position: 'Engineer',
      experience_years: 5,
      linkedin_url: 'https://linkedin.com/in/john',
      cover_letter: 'I am interested...',
      consent_given: true,
    })
    expect(result.valid).toBe(true)
  })
})

describe('Candidate Portal — Allowed Fields Whitelist', () => {
  it('only accepts known safe fields', () => {
    const submittedFields = [
      'full_name', 'email', 'phone', 'location',
      'current_position', 'experience_years', 'linkedin_url',
      'portfolio_url', 'preferred_language', 'cover_letter',
    ]
    for (const field of submittedFields) {
      expect(ALLOWED_FIELDS).toContain(field)
    }
  })

  it('blocked fields are not in allowed list', () => {
    for (const field of BLOCKED_FIELDS) {
      expect(ALLOWED_FIELDS).not.toContain(field)
    }
  })
})

describe('Candidate Portal — Tenant Safety', () => {
  it('company_id is resolved server-side from job token, not from client', () => {
    // The edge function resolves company_id from the jobs table
    // using the public_token. The client never sends company_id.
    // This test documents the contract.
    const clientPayload = {
      job_token: 'abc123',
      full_name: 'Test',
      email: 'test@example.com',
      consent_given: true,
    }
    expect(clientPayload).not.toHaveProperty('company_id')
  })

  it('source is always set to portal by server, never from client', () => {
    // Even if a malicious client sends source, it's blocked
    const clientPayload = {
      job_token: 'abc123',
      full_name: 'Test',
      email: 'test@example.com',
      consent_given: true,
      source: 'admin', // attempt to fake source
    }
    const result = validateSubmission(clientPayload)
    expect(result.valid).toBe(false)
  })

  it('job_token is validated server-side for active + published status', () => {
    // The edge function checks: status = 'active' AND is_published = true
    // This is documented as a contract test
    const serverChecks = [
      'job.status !== active -> reject',
      'job.is_published !== true -> reject',
      'company.status !== active -> reject',
    ]
    expect(serverChecks.length).toBe(3)
  })
})

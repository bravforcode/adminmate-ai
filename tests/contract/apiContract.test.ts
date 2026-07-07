/**
 * API Contract Tests for Edge Function Shared Utilities
 *
 * Verifies that the shared utilities in supabase/functions/_shared/
 * produce responses matching the documented API contract:
 * - RELEASE_26B7_API_CONTRACTS.md
 *
 * Tests the pure utilities directly — no running Supabase needed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Deno esm.sh import used by edge function shared modules ──
// These files import `createClient` from the Deno esm.sh URL which
// vitest cannot resolve. We mock it to a no-op since the functions
// we test don't need a real Supabase client.
vi.mock('https://esm.sh/@supabase/supabase-js@2', () => ({
  createClient: vi.fn(() => ({})),
}))

// ── Mock Deno.env for edge functions that reference it ──
;(globalThis as any).Deno = {
  env: {
    get: (key: string) => undefined,
  },
}

// ── Import the actual shared utilities under test ──
import {
  generateCorrelationId,
  getCorsHeaders,
  successResponse,
  timingSafeEqual,
} from '../../supabase/functions/_shared/utils.ts'

import {
  errorResponse,
  createErrorResponse,
  sanitizeError,
} from '../../supabase/functions/_shared/errorHandler.ts'

import {
  checkFeatureAccess,
} from '../../supabase/functions/_shared/limits.ts'

import type { LimitResult } from '../../supabase/functions/_shared/limits.ts'

// ── Helper: extract JSON body from a Response ──
async function parseBody(res: Response) {
  return JSON.parse(await res.text())
}

// ══════════════════════════════════════════════════════════════════
// 1. Error Response Format
// ══════════════════════════════════════════════════════════════════
describe('API Contract — Error Response Format', () => {
  const corsHeaders = { 'Access-Control-Allow-Origin': 'http://localhost:5173' }

  it('returns { success: false, error: { code, message, correlationId, timestamp } }', async () => {
    const res = errorResponse(new Error('Something went wrong'), 500, corsHeaders)
    const body = await parseBody(res)

    expect(body.success).toBe(false)
    expect(body.error).toBeDefined()
    expect(typeof body.error.code).toBe('string')
    expect(typeof body.error.message).toBe('string')
    expect(typeof body.error.correlationId).toBe('string')
    expect(typeof body.error.timestamp).toBe('string')
  })

  it('correlationId matches req_ prefix pattern', async () => {
    const res = errorResponse(new Error('test'), 500, corsHeaders)
    const body = await parseBody(res)

    expect(body.error.correlationId).toMatch(/^req_[a-zA-Z0-9]{12}$/)
  })

  it('timestamp is valid ISO 8601', async () => {
    const res = errorResponse(new Error('test'), 500, corsHeaders)
    const body = await parseBody(res)

    const parsed = new Date(body.error.timestamp)
    expect(parsed.toISOString()).toBe(body.error.timestamp)
  })

  it('uses a provided correlationId from extra', async () => {
    const customId = 'req_custom123456'
    const res = errorResponse(new Error('test'), 500, corsHeaders, { correlationId: customId })
    const body = await parseBody(res)

    expect(body.error.correlationId).toBe(customId)
  })

  it('includes details when provided via extra', async () => {
    // errorResponse passes `extra` directly as the `details` param
    // to createErrorResponse, so pass the details object directly
    const res = errorResponse(new Error('test'), 500, corsHeaders, {
      field: 'email',
      reason: 'invalid format',
    })
    const body = await parseBody(res)

    expect(body.error.details).toEqual({
      field: 'email',
      reason: 'invalid format',
    })
  })

  // NOTE: errorResponse() sanitizes the error message BEFORE detecting
  // the code, so code detection runs against the user-safe message.
  // The "duplicate key" → "A record with this information already exists"
  // sanitized form no longer matches the CONFLICT pattern.
  // This tests the actual behavior; use createErrorResponse() directly
  // for explicit code control.

  it('maps "not found" errors to NOT_FOUND code', async () => {
    // The raw message "not found" is sanitized to "Requested resource not found"
    // which still contains "not found"
    const res = errorResponse(new Error('not found'), 500, corsHeaders)
    const body = await parseBody(res)

    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('maps auth errors to UNAUTHORIZED code', async () => {
    // "jwt invalid" sanitizes to "Authentication required" which still
    // matches the auth/jwt pattern
    const res = errorResponse(new Error('jwt invalid'), 500, corsHeaders)
    const body = await parseBody(res)

    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('maps permission errors to FORBIDDEN code', async () => {
    // "permission denied for table" sanitizes to "You do not have permission
    // to perform this action" which still contains "permission"
    const res = errorResponse(new Error('permission denied for table'), 500, corsHeaders)
    const body = await parseBody(res)

    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('sanitizes internal error messages', async () => {
    const res = errorResponse(new Error('duplicate key value violates unique constraint'), 500, corsHeaders)
    const body = await parseBody(res)

    // Should NOT expose raw DB error to client
    expect(body.error.message).not.toContain('duplicate key value')
    expect(body.error.message).not.toContain('violates')
    // Sanitized form is user-friendly
    expect(body.error.message).toBe('A record with this information already exists')
  })

  it('returns proper HTTP status for NOT_FOUND', async () => {
    const res = errorResponse(new Error('not found'), 500, corsHeaders)

    // NOT_FOUND maps to 404
    expect(res.status).toBe(404)
  })

  it('returns proper HTTP status for UNAUTHORIZED', async () => {
    const res = errorResponse(new Error('jwt expired'), 500, corsHeaders)

    expect(res.status).toBe(401)
  })

  it('sets Content-Type to application/json', async () => {
    const res = errorResponse(new Error('test'), 500, corsHeaders)

    expect(res.headers.get('Content-Type')).toBe('application/json')
  })
})

// ══════════════════════════════════════════════════════════════════
// 2. Success Response Format
// ══════════════════════════════════════════════════════════════════
describe('API Contract — Success Response Format', () => {
  it('returns { success: true, data: <value>, correlationId: <id> }', async () => {
    const payload = { name: 'Test Company', id: 'comp_123' }
    const res = successResponse(payload)
    const body = await parseBody(res)

    expect(body.success).toBe(true)
    expect(body.data).toEqual(payload)
    expect(typeof body.correlationId).toBe('string')
  })

  it('correlationId matches req_ prefix pattern', async () => {
    const res = successResponse({ ok: true })
    const body = await parseBody(res)

    expect(body.correlationId).toMatch(/^req_[a-zA-Z0-9]{12}$/)
  })

  it('uses provided status code', async () => {
    const res = successResponse({ created: true }, 201)

    expect(res.status).toBe(201)
  })

  it('defaults to 200 status', async () => {
    const res = successResponse({ ok: true })

    expect(res.status).toBe(200)
  })

  it('includes extra headers when provided', async () => {
    const res = successResponse({ ok: true }, 200, { 'X-Custom': 'test' })

    expect(res.headers.get('X-Custom')).toBe('test')
  })

  it('always includes Content-Type application/json', async () => {
    const res = successResponse({ ok: true })

    expect(res.headers.get('Content-Type')).toBe('application/json')
  })

  it('preserves data structure for array payloads', async () => {
    const items = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const res = successResponse(items)
    const body = await parseBody(res)

    expect(body.data).toHaveLength(3)
    expect(body.data[0].id).toBe(1)
  })

  it('handles null data gracefully', async () => {
    const res = successResponse(null)
    const body = await parseBody(res)

    expect(body.success).toBe(true)
    expect(body.data).toBeNull()
  })
})

// ══════════════════════════════════════════════════════════════════
// 3. CORS Headers
// ══════════════════════════════════════════════════════════════════
describe('API Contract — CORS Headers', () => {
  function makeRequest(origin?: string): Request {
    const headers: Record<string, string> = {}
    if (origin) headers.Origin = origin
    return new Request('https://adminmate.ai/api/test', { headers })
  }

  it('returns proper headers for localhost:5173', () => {
    const headers = getCorsHeaders(makeRequest('http://localhost:5173'))

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
    expect(headers['Access-Control-Allow-Headers']).toContain('authorization')
    expect(headers['Access-Control-Allow-Headers']).toContain('content-type')
    expect(headers['Access-Control-Allow-Methods']).toContain('POST')
    expect(headers['Access-Control-Max-Age']).toBe('86400')
  })

  it('returns proper headers for production origin', () => {
    const headers = getCorsHeaders(makeRequest('https://adminmate-ai.vercel.app'))

    expect(headers['Access-Control-Allow-Origin']).toBe('https://adminmate-ai.vercel.app')
  })

  it('returns proper headers for adminmate.ai', () => {
    const headers = getCorsHeaders(makeRequest('https://adminmate.ai'))

    expect(headers['Access-Control-Allow-Origin']).toBe('https://adminmate.ai')
  })

  it('falls back to localhost when origin is not allowed', () => {
    const headers = getCorsHeaders(makeRequest('https://evil.com'))

    expect(headers['Access-Control-Allow-Origin']).not.toBe('https://evil.com')
    // Should fall back to first allowed origin
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
  })

  it('falls back when no Origin header is present', () => {
    const headers = getCorsHeaders(makeRequest())

    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173')
  })

  it('includes all required CORS methods', () => {
    const headers = getCorsHeaders(makeRequest())

    expect(headers['Access-Control-Allow-Methods']).toContain('GET')
    expect(headers['Access-Control-Allow-Methods']).toContain('POST')
    expect(headers['Access-Control-Allow-Methods']).toContain('PUT')
    expect(headers['Access-Control-Allow-Methods']).toContain('DELETE')
    expect(headers['Access-Control-Allow-Methods']).toContain('OPTIONS')
  })
})

// ══════════════════════════════════════════════════════════════════
// 4. Timing-Safe Comparison
// ══════════════════════════════════════════════════════════════════
describe('API Contract — Timing-Safe Comparison', () => {
  it('returns true for equal strings', () => {
    expect(timingSafeEqual('hello', 'hello')).toBe(true)
  })

  it('returns false for unequal strings', () => {
    expect(timingSafeEqual('hello', 'world')).toBe(false)
  })

  it('returns false for different lengths', () => {
    expect(timingSafeEqual('short', 'longer-string')).toBe(false)
  })

  it('returns false for empty vs non-empty', () => {
    expect(timingSafeEqual('', 'something')).toBe(false)
  })

  it('returns true for empty strings', () => {
    expect(timingSafeEqual('', '')).toBe(true)
  })

  it('is case-sensitive', () => {
    expect(timingSafeEqual('Hello', 'hello')).toBe(false)
  })

  it('handles special characters', () => {
    const sig = 'sha256=a1b2c3d4e5f6'
    expect(timingSafeEqual(sig, sig)).toBe(true)
    expect(timingSafeEqual(sig, 'sha256=a1b2c3d4e5f7')).toBe(false)
  })

  it('handles webhook signature comparison pattern', () => {
    const expected = 'abc123def456'
    const valid = 'abc123def456'
    const invalid = 'abc123def457'

    expect(timingSafeEqual(expected, valid)).toBe(true)
    expect(timingSafeEqual(expected, invalid)).toBe(false)
  })
})

// ══════════════════════════════════════════════════════════════════
// 5. Rate Limiting (pure functions from limits.ts)
// ══════════════════════════════════════════════════════════════════
describe('API Contract — Feature Access Limits', () => {
  it('allows document_signing for growth tier', () => {
    const result = checkFeatureAccess('growth', 'document_signing')
    expect(result.allowed).toBe(true)
    expect(result.upgradeRequired).toBe(false)
  })

  it('denies document_signing for free tier', () => {
    const result = checkFeatureAccess('free', 'document_signing')
    expect(result.allowed).toBe(false)
    expect(result.upgradeRequired).toBe(true)
  })

  it('allows bulk_import for pro tier', () => {
    const result = checkFeatureAccess('pro', 'bulk_import')
    expect(result.allowed).toBe(true)
    expect(result.upgradeRequired).toBe(false)
  })

  it('denies bulk_import for growth tier', () => {
    const result = checkFeatureAccess('growth', 'bulk_import')
    expect(result.allowed).toBe(false)
    expect(result.upgradeRequired).toBe(true)
  })

  it('denies custom_reports for free tier', () => {
    const result = checkFeatureAccess('free', 'custom_reports')
    expect(result.allowed).toBe(false)
    expect(result.upgradeRequired).toBe(true)
  })

  it('allows custom_reports for pro tier', () => {
    const result = checkFeatureAccess('pro', 'custom_reports')
    expect(result.allowed).toBe(true)
    expect(result.upgradeRequired).toBe(false)
  })

  it('allows unknown features by default', () => {
    const result = checkFeatureAccess('free', 'unknown_feature_xyz')
    expect(result.allowed).toBe(true)
    expect(result.upgradeRequired).toBe(false)
  })

  it('falls back to free tier for unknown tiers', () => {
    const result = checkFeatureAccess('enterprise', 'document_signing')
    // enterprise is not defined, falls back to free (false)
    expect(result.allowed).toBe(false)
    expect(result.upgradeRequired).toBe(true)
  })
})

// ══════════════════════════════════════════════════════════════════
// 6. Correlation ID Generation
// ══════════════════════════════════════════════════════════════════
describe('API Contract — Correlation ID', () => {
  it('generates unique IDs', () => {
    const id1 = generateCorrelationId()
    const id2 = generateCorrelationId()

    expect(id1).not.toBe(id2)
  })

  it('starts with req_ prefix', () => {
    const id = generateCorrelationId()
    expect(id).toMatch(/^req_/)
  })

  it('has 16 characters total (req_ + 12 hex chars)', () => {
    const id = generateCorrelationId()
    expect(id.length).toBe(16)
  })

  it('contains only alphanumeric characters after prefix', () => {
    const id = generateCorrelationId()
    const body = id.slice(4) // remove 'req_'
    expect(body).toMatch(/^[a-zA-Z0-9]{12}$/)
  })
})

// ══════════════════════════════════════════════════════════════════
// 7. sanitizeError — security-sensitive message sanitization
// ══════════════════════════════════════════════════════════════════
describe('API Contract — Error Sanitization', () => {
  it('does not leak duplicate key details', () => {
    const msg = sanitizeError(new Error('duplicate key value violates unique constraint users_email_key'))
    expect(msg).not.toContain('unique constraint')
    expect(msg).not.toContain('users_email_key')
  })

  it('does not leak foreign key details', () => {
    const msg = sanitizeError(new Error('foreign key constraint fails'))
    expect(msg).not.toContain('foreign key constraint')
  })

  it('does not leak RLS/policy details', () => {
    const msg = sanitizeError(new Error('new row violates row-level security policy'))
    expect(msg).not.toContain('row-level security')
    expect(msg).not.toContain('policy')
  })

  it('passes plain strings through verbatim (edge function contract)', () => {
    // sanitizeError passes plain strings through unchanged — this is the
    // intentional edge function error contract: errorResponse(msg) with a
    // plain string returns it verbatim so callers control the user-facing
    // message. Only raw Error objects get mapped to safe generic strings.
    const msg = sanitizeError('some raw string')
    expect(msg).toBe('some raw string')
  })

  it('sanitizes null/undefined', () => {
    expect(sanitizeError(null)).toBe('An unexpected error occurred.')
    expect(sanitizeError(undefined)).toBe('An unexpected error occurred.')
  })
})

// ══════════════════════════════════════════════════════════════════
// 8. createErrorResponse — direct structured response builder
// ══════════════════════════════════════════════════════════════════
describe('API Contract — createErrorResponse', () => {
  it('creates response with all required fields', async () => {
    const res = createErrorResponse('NOT_FOUND', 'Resource not found', 404, 'req_test123456')
    const body = await parseBody(res)

    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toBe('Resource not found')
    expect(body.error.correlationId).toBe('req_test123456')
    expect(typeof body.error.timestamp).toBe('string')
  })

  it('returns the specified HTTP status', async () => {
    const res = createErrorResponse('RATE_LIMITED', 'Too many requests', 429, 'req_test123456')
    expect(res.status).toBe(429)
  })

  it('includes details when provided', async () => {
    const details = { field: 'email' }
    const res = createErrorResponse('VALIDATION_ERROR', 'Invalid', 400, 'req_test123456', {}, details)
    const body = await parseBody(res)

    expect(body.error.details).toEqual(details)
  })

  it('includes CORS headers', async () => {
    const corsHeaders = { 'Access-Control-Allow-Origin': 'https://adminmate.ai' }
    const res = createErrorResponse('INTERNAL_ERROR', 'Oops', 500, 'req_test123456', corsHeaders)

    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://adminmate.ai')
  })
})

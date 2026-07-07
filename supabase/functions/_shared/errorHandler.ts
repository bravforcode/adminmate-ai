// ============================================================
// Unified API Error Response — matches documented contract:
// { success: false, error: { code, message, details?, correlationId, timestamp } }
// ============================================================

import { generateCorrelationId } from './utils.ts'

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    correlationId: string
    timestamp: string
  }
}

/** Map known error messages to stable error codes */
function getErrorCode(message: string): string {
  const msg = message.toLowerCase()
  if (msg.includes('duplicate key') || msg.includes('unique')) return 'CONFLICT'
  if (msg.includes('foreign key') || msg.includes('violates')) return 'INVALID_REFERENCE'
  if (msg.includes('not found') || msg.includes('no rows')) return 'NOT_FOUND'
  if (msg.includes('permission') || msg.includes('policy') || msg.includes('rls')) return 'FORBIDDEN'
  if (msg.includes('rate limit') || msg.includes('exceeded')) return 'RATE_LIMITED'
  if (msg.includes('jwt') || msg.includes('auth')) return 'UNAUTHORIZED'
  if (msg.includes('timeout') || msg.includes('aborted')) return 'TIMEOUT'
  if (msg.includes('network') || msg.includes('fetch failed')) return 'EXTERNAL_SERVICE_ERROR'
  return 'INTERNAL_ERROR'
}

/** Map known error messages to stable HTTP status codes */
function getHttpStatus(code: string): number {
  switch (code) {
    case 'CONFLICT': return 409
    case 'INVALID_REFERENCE': return 400
    case 'NOT_FOUND': return 404
    case 'FORBIDDEN': return 403
    case 'RATE_LIMITED': return 429
    case 'UNAUTHORIZED': return 401
    case 'TIMEOUT': return 504
    case 'EXTERNAL_SERVICE_ERROR': return 502
    default: return 500
  }
}

export function sanitizeError(error: unknown): string {
  // Plain strings are author-written, client-safe messages — pass through.
  // Only raw Error objects (DB/library errors) need sanitizing.
  if (typeof error === 'string') return error
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('duplicate key') || msg.includes('unique')) return 'A record with this information already exists'
    if (msg.includes('foreign key') || msg.includes('violates')) return 'Invalid reference: ensure related records exist'
    if (msg.includes('not found') || msg.includes('no rows')) return 'Requested resource not found'
    if (msg.includes('permission') || msg.includes('policy') || msg.includes('rls')) return 'You do not have permission to perform this action'
    if (msg.includes('rate limit') || msg.includes('exceeded')) return 'Rate limit exceeded. Please try again later.'
    if (msg.includes('jwt') || msg.includes('auth')) return 'Authentication required'
    if (msg.includes('timeout') || msg.includes('aborted')) return 'Request timed out. Please try again.'
    if (msg.includes('network') || msg.includes('fetch failed')) return 'External service unavailable. Please try again.'
    return 'An unexpected error occurred. Please try again.'
  }
  return 'An unexpected error occurred.'
}

/**
 * Create a structured error response matching the API contract.
 * Automatically resolves error code and status from the message when not supplied.
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number,
  correlationId: string,
  corsHeaders: Record<string, string> = {},
  details?: Record<string, unknown>,
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
      ...(details ? { details } : {}),
    },
  }
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/**
 * Legacy-compatible error response.
 * Accepts raw error, resolves code + message + status automatically.
 * Generates a correlationId if one is not provided.
 */
export function errorResponse(
  error: unknown,
  status: number = 500,
  corsHeaders: Record<string, string>,
  extra: Record<string, unknown> = {}
) {
  const message = sanitizeError(error)
  const code = getErrorCode(message)
  const resolvedStatus = status === 500 ? getHttpStatus(code) : status
  const correlationId = (extra.correlationId as string) || generateCorrelationId()

  return createErrorResponse(code, message, resolvedStatus, correlationId, corsHeaders, extra)
}

export function jsonResponse(
  body: unknown,
  status: number = 200,
  corsHeaders: Record<string, string>
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

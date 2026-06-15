export function sanitizeError(error: unknown): string {
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
    return `Error: ${error.message}`
  }
  return 'An unexpected error occurred.'
}

export function errorResponse(
  error: unknown,
  status: number = 500,
  corsHeaders: Record<string, string>,
  extra: Record<string, unknown> = {}
) {
  return new Response(
    JSON.stringify({ success: false, error: sanitizeError(error), ...extra }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
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

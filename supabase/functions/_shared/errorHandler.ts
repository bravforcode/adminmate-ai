export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('duplicate key') || msg.includes('unique')) return 'A record with this information already exists'
    if (msg.includes('foreign key') || msg.includes('violates')) return 'Invalid reference: ensure related records exist'
    if (msg.includes('not found') || msg.includes('no rows')) return 'Requested resource not found'
    if (msg.includes('permission') || msg.includes('policy')) return 'You do not have permission to perform this action'
    if (msg.includes('rate limit') || msg.includes('exceeded')) return 'Rate limit exceeded. Please try again later.'
    console.error('UNHANDLED ERROR:', error)
    return 'An unexpected error occurred. Please try again.'
  }
  return 'An unexpected error occurred.'
}

export function errorResponse(error: unknown, status: number = 500, corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({ success: false, error: sanitizeError(error) }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

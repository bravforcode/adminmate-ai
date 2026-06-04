import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-line-signature',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

export const JSON_HEADERS = { ...corsHeaders, 'Content-Type': 'application/json' }

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  return null
}

export async function verifyAuth(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token || token.length > 4096) return null
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

export function validateInput(data: unknown, requiredFields: string[]): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid request body' }
  for (const field of requiredFields) {
    if (!(field in (data as object))) return { valid: false, error: `Missing required field: ${field}` }
  }
  return { valid: true }
}

export function validateSchema(
  data: unknown,
  schema: Record<string, 'string' | 'number' | 'boolean' | 'object' | 'array'>
): { valid: true; value: Record<string, unknown> } | { valid: false; error: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid request body' }
  const obj = data as Record<string, unknown>
  for (const [field, type] of Object.entries(schema)) {
    if (obj[field] === undefined || obj[field] === null) return { valid: false, error: `Missing required field: ${field}` }
    const actual = Array.isArray(obj[field]) ? 'array' : typeof obj[field]
    if (actual !== type) return { valid: false, error: `Invalid type for ${field}: expected ${type}, got ${actual}` }
  }
  return { valid: true, value: obj }
}

export class RateLimitError extends Error {
  constructor(public action: string, public limit: number, public resetAt: string) {
    super(`Rate limit exceeded for action: ${action}`)
    this.name = 'RateLimitError'
  }
}

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  limit: number,
  windowSeconds: number = 60
): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('Rate limit check failed, failing open:', error)
    return true
  }
  const row = Array.isArray(data) ? data[0] : data
  if (row && row.allowed === false) {
    throw new RateLimitError(action, limit, row.reset_at)
  }
  return true
}

export async function enforceRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  action: string,
  limit: number,
  windowSeconds: number = 60
): Promise<Response | null> {
  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_user_id: userId,
    p_action: action,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('Rate limit check failed, failing open:', error)
    return null
  }
  const row = Array.isArray(data) ? data[0] : data
  if (row && row.allowed === false) {
    return new Response(
      JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.', reset_at: row.reset_at }),
      { status: 429, headers: { ...JSON_HEADERS, 'Retry-After': String(windowSeconds) } }
    )
  }
  return null
}

export async function checkAILimit(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  feature: string,
  maxPerHour: number
): Promise<boolean> {
  if (!companyId) return true
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('ai_usage_log')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('feature', feature)
    .gte('created_at', windowStart)
  return (count ?? 0) < maxPerHour
}

export function getGeminiKey(): string {
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) throw new Error('GEMINI_API_KEY not configured')
  return key
}

export function getOpenAIKey(): string | null {
  return Deno.env.get('OPENAI_API_KEY') || null
}

export function requireEnv(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`${name} not configured`)
  return v
}

export function getEnv(name: string, fallback: string = ''): string {
  return Deno.env.get(name) || fallback
}

export function successResponse(data: unknown, status: number = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { ...JSON_HEADERS, ...extraHeaders } }
  )
}

export function logRequest(ctx: {
  function: string
  userId?: string
  action?: string
  durationMs?: number
  status?: number
  error?: string
}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: ctx.error ? 'error' : 'info',
    function: ctx.function,
    user_id: ctx.userId,
    action: ctx.action,
    duration_ms: ctx.durationMs,
    status: ctx.status,
    error: ctx.error,
  }))
}

export async function withRequestLogging<T>(
  fnName: string,
  userId: string | undefined,
  handler: () => Promise<Response>
): Promise<Response> {
  const start = Date.now()
  try {
    const response = await handler()
    logRequest({ function: fnName, userId, durationMs: Date.now() - start, status: response.status })
    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logRequest({ function: fnName, userId, durationMs: Date.now() - start, status: 500, error: message })
    throw error
  }
}

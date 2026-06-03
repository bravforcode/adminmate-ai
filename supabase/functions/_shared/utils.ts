import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

export async function verifyAuth(req: Request, supabase: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null
  return user
}

export function validateInput<T>(data: unknown, requiredFields: string[]): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid input' }
  for (const field of requiredFields) {
    if (!(field in data)) return { valid: false, error: `Missing required field: ${field}` }
  }
  return { valid: true }
}

export async function checkAILimit(supabase: any, companyId: string, feature: string, maxPerHour: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase.from('ai_usage_log').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('feature', feature).gte('created_at', windowStart)
  return (count ?? 0) < maxPerHour
}

export async function checkRateLimit(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  feature: string,
  maxPerHour: number
): Promise<boolean> {
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('ai_usage_log')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('feature', feature)
    .gte('created_at', windowStart)
  return (count ?? 0) < maxPerHour
}

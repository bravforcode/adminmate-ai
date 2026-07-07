import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

let cachedClient: ReturnType<typeof createClient> | null = null

/**
 * Returns a cached Supabase client using the service role key.
 * Safe for Edge Functions that need elevated DB access.
 */
export function getServiceClient() {
  if (!cachedClient) {
    cachedClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
  }
  return cachedClient
}

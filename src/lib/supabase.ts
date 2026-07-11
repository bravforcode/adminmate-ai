import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Check your .env.local and ensure the variables are set.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Proactive refresh is handled by our own scheduler (see
    // src/hooks/useSessionRestore.ts), which hits the app's httpOnly-cookie
    // /refresh proxy endpoint instead of the SDK's built-in refresh flow
    // (the SDK never has access to the real, httpOnly refresh_token).
    autoRefreshToken: false,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'adminmate-auth-token',
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export function getSiteUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

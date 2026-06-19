import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Check your .env.local and ensure the variables are set.'
  )
}

export const SUPABASE_AUTH_OPTIONS = {
  autoRefreshToken: false,
  persistSession: true,
  detectSessionInUrl: true,
  flowType: 'implicit' as const,
  storageKey: 'adminmate-auth-token',
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: SUPABASE_AUTH_OPTIONS,
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

export function getSiteUrl(): string {
  if (typeof window === 'undefined') return ''
  return window.location.origin
}

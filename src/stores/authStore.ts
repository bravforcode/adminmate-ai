import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { fetchSessionStatus } from '../lib/sessionApi'

interface UserProfile {
  id: string
  email: string
  full_name: string
  full_name_th?: string
  avatar_url?: string
  role: string
  company_id?: string
  language_preference: string
  is_active: boolean
}

interface Company {
  id: string
  name: string
  name_th?: string
  tax_id?: string
  phone?: string
  email?: string
  city?: string
  website_url?: string
  industry?: string
  country: string
  currency: string
  locale: string
  subscription_tier?: string
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  company: Company | null
  isLoading: boolean
  error: string | null
  _langPref: string
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setCompany: (company: Company | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  initSession: () => Promise<void>
  subscribeAuth: () => () => void
  initDemo: () => void
  reset: () => void
  isAuthenticated: () => boolean
  isAdminOrHR: () => boolean
  hasCompany: () => boolean
  userLanguage: () => string
}

let authSubscription: { unsubscribe: () => void } | null = null
let _sessionInitPromise: Promise<void> | null = null

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      company: null,
      isLoading: false,
      error: null,
      _langPref: 'en',

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setCompany: (company) => set({ company }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      initSession: async () => {
        if (_sessionInitPromise) return _sessionInitPromise
        _sessionInitPromise = (async () => {
          set({ isLoading: true, error: null })
          try {
            let user: User | null = null

            // Try Edge Function session restore (httpOnly cookie)
            const status = await fetchSessionStatus()
            if (status.valid && status.access_token) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: status.access_token,
                refresh_token: '',
                user: status.user,
                token_type: 'bearer',
                expires_in: 3600,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
              } as never)
              if (!sessionError && status.user) {
                user = { ...status.user, id: status.user.id } as User
              }
            }

            // Fall back to standard getSession()
            if (!user) {
              const { data: { session } } = await supabase.auth.getSession()
              user = session?.user ?? null
            }

            if (!user) {
              set({ user: null, profile: null, company: null, isLoading: false })
              return
            }
            set({ user })
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
              .eq('id', user.id)
              .maybeSingle()
            if (profile) {
              set({ profile, _langPref: profile.language_preference ?? 'en' })
            } else {
              set({ profile: null })
            }
            if (profile?.company_id) {
              const { data: company } = await supabase
                .from('companies')
                .select('id, name, name_th, tax_id, phone, email, city, website_url, industry, country, currency, locale, subscription_tier')
                .eq('id', profile.company_id)
                .maybeSingle()
              if (company) set({ company })
            }
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'init_failed'
            set({ user: null, profile: null, company: null, error: message })
          } finally {
            set({ isLoading: false })
          }
        })()
        return _sessionInitPromise
      },
      subscribeAuth: () => {
        if (authSubscription) return authSubscription.unsubscribe
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'TOKEN_REFRESHED') {
            if (session?.user) set({ user: session.user })
            return
          }
          if (event === 'SIGNED_OUT' || !session?.user) {
            set({ user: null, profile: null, company: null })
            return
          }
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            set({ user: session.user })
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
              .eq('id', session.user.id)
              .maybeSingle()
            if (profile) {
              set({ profile, _langPref: profile.language_preference ?? 'en' })
              if (profile.company_id) {
                const { data: company } = await supabase
                  .from('companies')
                  .select('id, name, name_th, tax_id, phone, email, city, website_url, industry, country, currency, locale, subscription_tier')
                  .eq('id', profile.company_id)
                  .maybeSingle()
                if (company) set({ company })
              }
            }
          }
        })
        authSubscription = data.subscription
        return () => {
          authSubscription?.unsubscribe()
          authSubscription = null
        }
      },
      initDemo: () => set({ _langPref: 'th' }),
      reset: () => {
        _sessionInitPromise = null
        set({ user: null, profile: null, company: null, _langPref: 'en', isLoading: false, error: null })
      },

      isAuthenticated: () => !!get().user,
      isAdminOrHR: () => ['admin', 'hr'].includes(get().profile?.role ?? ''),
      hasCompany: () => !!get().company,
      userLanguage: () => get()._langPref || get().profile?.language_preference || get().company?.locale?.split('-')[0] || 'en',
    }),
    {
      name: 'adminmate-auth',
      partialize: (s) => ({ _langPref: s._langPref ?? 'en' }),
    }
  )
)

export function useAuthLoading(): boolean {
  return useAuthStore((s) => s.isLoading)
}

export function useAuthError(): string | null {
  return useAuthStore((s) => s.error)
}

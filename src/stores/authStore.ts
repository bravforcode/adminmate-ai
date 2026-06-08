import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

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
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setCompany: (company: Company | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  initDemo: () => void
  initSession: () => Promise<void>
  subscribeAuth: () => () => void
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

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setCompany: (company) => set({ company }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      initDemo: () => set({
        user: { id: 'demo-user-1', email: 'admin@adminmate.ai', created_at: new Date().toISOString() } as User,
        profile: { id: 'demo-user-1', email: 'admin@adminmate.ai', full_name: 'Sarah Chen', full_name_th: 'ซาร่า เฉิน', role: 'admin', company_id: 'demo-company-1', language_preference: 'th', is_active: true },
        company: { id: 'demo-company-1', name: 'TechNova Solutions Co., Ltd.', country: 'TH', currency: 'THB', locale: 'th-TH' },
        isLoading: false,
        error: null,
      }),
      initSession: async () => {
        // Prevent concurrent or duplicate calls
        if (_sessionInitPromise) return _sessionInitPromise
        _sessionInitPromise = (async () => {
          set({ isLoading: true, error: null })
          try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user) {
              set({ user: null, profile: null, company: null, isLoading: false })
              return
            }
            set({ user: session.user })
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle()
            if (profile) {
              set({ profile })
            } else {
              set({ profile: null })
            }
            if (profile?.company_id) {
              const { data: company } = await supabase
                .from('companies')
                .select('*')
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
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle()
            if (profile) {
              set({ profile })
              if (profile.company_id) {
                const { data: company } = await supabase
                  .from('companies')
                  .select('*')
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
      reset: () => {
        _sessionInitPromise = null
        set({ user: null, profile: null, company: null, isLoading: false, error: null })
      },

      isAuthenticated: () => !!get().user,
      isAdminOrHR: () => ['admin', 'hr'].includes(get().profile?.role ?? ''),
      hasCompany: () => !!get().company,
      userLanguage: () => get().profile?.language_preference ?? get().company?.locale?.split('-')[0] ?? 'en',
    }),
    {
      name: 'adminmate-auth',
      partialize: (s) => ({ user: s.user, profile: s.profile, company: s.company }),
    }
  )
)

export function useAuthLoading(): boolean {
  return useAuthStore((s) => s.isLoading)
}

export function useAuthError(): string | null {
  return useAuthStore((s) => s.error)
}

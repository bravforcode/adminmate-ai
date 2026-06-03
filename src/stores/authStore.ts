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
  setUser: (user: User | null) => void
  setProfile: (profile: UserProfile | null) => void
  setCompany: (company: Company | null) => void
  setLoading: (isLoading: boolean) => void
  initDemo: () => void
  initSession: () => Promise<void>
  reset: () => void
  isAuthenticated: () => boolean
  isAdminOrHR: () => boolean
  hasCompany: () => boolean
  userLanguage: () => string
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      profile: null,
      company: null,
      isLoading: true,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      setCompany: (company) => set({ company }),
      setLoading: (isLoading) => set({ isLoading }),
      initDemo: () => set({
        user: { id: 'demo-user-1', email: 'admin@adminmate.ai', created_at: new Date().toISOString() } as any,
        profile: { id: 'demo-user-1', email: 'admin@adminmate.ai', full_name: 'Sarah Chen', full_name_th: 'ซาร่า เฉิน', role: 'admin', company_id: 'demo-company-1', language_preference: 'th', is_active: true },
        company: { id: 'demo-company-1', name: 'TechNova Solutions Co., Ltd.', country: 'TH', currency: 'THB', locale: 'th-TH' },
        isLoading: false,
      }),
      initSession: async () => {
        set({ isLoading: true })
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (!session?.user) {
            set({ user: null, profile: null, company: null, isLoading: false })
            localStorage.removeItem('adminmate-auth')
            return
          }
          set({ user: session.user })
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (profile) {
            set({ profile })
          } else {
            set({ user: null, profile: null, company: null, isLoading: false })
            localStorage.removeItem('adminmate-auth')
            return
          }
          if (profile?.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('*')
              .eq('id', profile.company_id)
              .single()
            if (company) set({ company })
          }
        } catch {
          set({ user: null, profile: null, company: null })
          localStorage.removeItem('adminmate-auth')
        } finally {
          set({ isLoading: false })
        }
      },
      reset: () => set({ user: null, profile: null, company: null, isLoading: false }),

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

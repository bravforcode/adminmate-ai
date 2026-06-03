import { useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import { supabase } from '../lib/supabase'
import type { SignUpWithPasswordCredentials } from '@supabase/supabase-js'

export function useAuth() {
  const store = useAuthStore()

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await authService.signIn(email, password)
    store.setUser(data.user ?? null)
    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles').select('*').eq('id', data.user.id).single()
      if (profile) {
        store.setProfile(profile)
        if (profile.company_id) {
          const { data: co } = await supabase
            .from('companies').select('*').eq('id', profile.company_id).single()
          if (co) store.setCompany(co)
        }
      }
    }
  }, [])

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    await authService.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    } as unknown as SignUpWithPasswordCredentials)
  }, [])

  const logout = useCallback(async () => {
    await authService.signOut()
    store.reset()
  }, [])

  const loginWithGoogle = useCallback(async () => {
    await authService.signInWithGoogle()
  }, [])

  return {
    user: store.user,
    profile: store.profile,
    company: store.company,
    isLoading: store.isLoading,
    isAuthenticated: store.isAuthenticated(),
    isAdminOrHR: store.isAdminOrHR(),
    hasCompany: store.hasCompany(),
    userLanguage: store.userLanguage(),
    login, register, logout, loginWithGoogle,
    setProfile: store.setProfile,
    setCompany: store.setCompany,
  }
}

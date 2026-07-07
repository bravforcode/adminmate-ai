import { useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { authService } from '../services/authService'
import { supabase } from '../lib/supabase'
import { companyService } from '../services/companyService'
import type { SignUpWithPasswordCredentials } from '@supabase/supabase-js'

export { getDefaultRoute } from '../lib/navigation'


interface RegisterPayload {
  email: string
  password: string
  fullName: string
  companyName: string
  country?: 'TH' | 'VN' | 'ID'
  industry?: string
}

export interface SignUpResult {
  needsEmailVerification: boolean
  hasCompany: boolean
}

async function loadProfile(userId: string) {
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
    .eq('id', userId)
    .maybeSingle()
  if (profile) {
    useAuthStore.getState().setProfile(profile)
    if (profile.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name, name_th, tax_id, phone, email, city, website_url, industry, country, currency, locale, subscription_tier')
        .eq('id', profile.company_id)
        .maybeSingle()
      if (company) useAuthStore.getState().setCompany(company)
    }
  }
  return profile
}

export function useAuth() {
  const store = useAuthStore()

  const login = useCallback(async (email: string, password: string) => {
    store.setError(null)
    const { data } = await authService.signIn(email, password)
    store.setUser(data.user ?? null)
    if (data.user) {
      await loadProfile(data.user.id)
    }
  }, [])

  const register = useCallback(async (payload: RegisterPayload): Promise<SignUpResult> => {
    store.setError(null)
    const { data } = await authService.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          full_name: payload.fullName,
          company_name: payload.companyName,
          role: 'admin',
        },
      },
    } as unknown as SignUpWithPasswordCredentials)

    if (data.user) {
      store.setUser(data.user)
    }

    const needsEmailVerification = !data.session
    if (needsEmailVerification) {
      return { needsEmailVerification: true, hasCompany: false }
    }

    let hasCompany = false
    try {
      const country = payload.country ?? 'TH'
      const industry = payload.industry ?? 'Other'
      const company = await companyService.create({
        name: payload.companyName,
        industry,
        country,
      })
      await supabase
        .from('user_profiles')
        .update({ company_id: company.id, role: 'admin' })
        .eq('id', data.user!.id)
      store.setCompany(company)
      hasCompany = true
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[useAuth] Company link failed (may already exist):', err)
    }

    if (data.user) {
      await loadProfile(data.user.id)
    }

    return { needsEmailVerification: false, hasCompany }
  }, [])

  const logout = useCallback(async () => {
    await authService.signOut()
    store.reset()
  }, [])

  const loginWithGoogle = useCallback(async () => {
    try {
      await authService.signInWithGoogle()
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      if (/unsupported provider/i.test(errorMsg) || /provider is not enabled/i.test(errorMsg)) {
        throw new Error('Google Sign-In is not enabled. Please use email/password login.')
      }
      throw error
    }
  }, [])

  return {
    user: store.user,
    profile: store.profile,
    company: store.company,
    isLoading: store.isLoading,
    error: store.error,
    isAuthenticated: store.isAuthenticated(),
    isAdminOrHR: store.isAdminOrHR(),
    hasCompany: store.hasCompany(),
    userLanguage: store.userLanguage(),
    login, register, logout, loginWithGoogle,
    setProfile: store.setProfile,
    setCompany: store.setCompany,
    setError: store.setError,
    subscribeAuth: store.subscribeAuth,
  }
}

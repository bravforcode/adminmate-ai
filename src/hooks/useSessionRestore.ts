import { useCallback } from 'react'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { fetchSessionStatus } from '../lib/sessionApi'

export function useSessionRestore() {
  const store = useAuthStore()

  const restoreSession = useCallback(async (): Promise<void> => {
    store.setLoading(true)
    store.setError(null)
    try {
      const status = await fetchSessionStatus()
      if (!status.valid || !status.access_token) {
        store.setUser(null)
        store.setProfile(null)
        store.setCompany(null)
        return
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: status.access_token,
        refresh_token: '',
        user: status.user,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      } as never)

      if (sessionError) {
        store.setUser(null)
        store.setProfile(null)
        store.setCompany(null)
        return
      }

      if (status.user?.id) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, email, full_name, full_name_th, avatar_url, role, company_id, language_preference, is_active, phone')
          .eq('id', status.user.id)
          .maybeSingle()

        if (profile) {
          store.setProfile(profile)
          store.setUser({ ...status.user, ...profile } as never)
          if (profile.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('id, name, name_th, tax_id, phone, email, city, website_url, industry, country, currency, locale, subscription_tier')
              .eq('id', profile.company_id)
              .maybeSingle()
            if (company) store.setCompany(company)
          }
        }
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : 'session_restore_failed'
      store.setError(message)
      store.setUser(null)
      store.setProfile(null)
      store.setCompany(null)
    } finally {
      store.setLoading(false)
    }
  }, [store])

  return { restoreSession }
}

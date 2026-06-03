import { supabase } from '../lib/supabase'
import type { AuthResponse, SignUpWithPasswordCredentials } from '@supabase/supabase-js'

export const authService = {
  signIn: async (email: string, password: string): Promise<AuthResponse> => {
    const result = await supabase.auth.signInWithPassword({ email, password })
    if (result.error) throw result.error
    return result
  },

  signUp: async (credentials: SignUpWithPasswordCredentials): Promise<AuthResponse> => {
    const creds = credentials as { email: string; password: string; options?: any }
    const result = await supabase.auth.signUp({
      email: creds.email,
      password: creds.password,
      options: {
        data: creds.options?.data,
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    if (result.error) throw result.error
    return result
  },

  signOut: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  signInWithGoogle: async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) throw error
  },

  resetPassword: async (email: string): Promise<void> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },

  updatePassword: async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session
  },
}

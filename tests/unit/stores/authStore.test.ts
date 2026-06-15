import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../../../src/stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null, profile: null, company: null, isLoading: false,
      _langPref: 'en', error: null,
    })
  })

  it('starts with null user', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isLoading).toBe(false)
    expect(state._langPref).toBe('en')
  })

  it('isAuthenticated returns false when no user', () => {
    expect(useAuthStore.getState().isAuthenticated()).toBe(false)
  })

  it('setUser + setProfile makes authenticated', () => {
    const store = useAuthStore.getState()
    store.setUser({ id: '1', email: 'test@test.com' } as any)
    store.setProfile({ id: '1', email: 'test@test.com', full_name: 'Test', role: 'hr', is_active: true, language_preference: 'th' })
    expect(useAuthStore.getState().isAuthenticated()).toBe(true)
  })

  it('isAdminOrHR returns true for admin role', () => {
    const store = useAuthStore.getState()
    store.setUser({ id: '1' } as any)
    store.setProfile({ id: '1', email: 'a@a.com', full_name: 'Admin', role: 'admin', is_active: true, language_preference: 'th' })
    expect(useAuthStore.getState().isAdminOrHR()).toBe(true)
  })

  it('hasCompany returns false without company', () => {
    expect(useAuthStore.getState().hasCompany()).toBe(false)
    useAuthStore.getState().setCompany({ id: 'c1', name: 'Test Corp', country: 'TH', currency: 'THB', locale: 'th-TH' })
    expect(useAuthStore.getState().hasCompany()).toBe(true)
  })

  it('reset clears everything', () => {
    const store = useAuthStore.getState()
    store.setUser({ id: '1' } as any)
    store.setProfile({ id: '1' } as any)
    store.setCompany({ id: 'c1' } as any)
    store.reset()
    const s = useAuthStore.getState()
    expect(s.user).toBeNull()
    expect(s.profile).toBeNull()
    expect(s.company).toBeNull()
    expect(s._langPref).toBe('en')
  })

  it('userLanguage falls back through _langPref -> profile -> locale -> en', () => {
    expect(useAuthStore.getState().userLanguage()).toBe('en')
    useAuthStore.setState({ _langPref: 'th' })
    expect(useAuthStore.getState().userLanguage()).toBe('th')
  })

  it('initDemo sets _langPref to th', () => {
    useAuthStore.getState().initDemo()
    expect(useAuthStore.getState()._langPref).toBe('th')
  })

  it('partialize does NOT include user, profile, or company', () => {
    const persisted = useAuthStore.persist.getOptions()
    expect(persisted.partialize).toBeDefined()
    const state = useAuthStore.getState()
    const partial = (persisted.partialize as (s: typeof state) => object)(state)
    expect(partial).not.toHaveProperty('user')
    expect(partial).not.toHaveProperty('profile')
    expect(partial).not.toHaveProperty('company')
    expect(partial).toHaveProperty('_langPref')
  })
})

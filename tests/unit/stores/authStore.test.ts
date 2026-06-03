import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../../src/stores/authStore'

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, profile: null, company: null, isLoading: false })
  })

  it('starts with null user', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isLoading).toBe(false)
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
  })
})

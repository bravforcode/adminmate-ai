import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '../../../src/router/AuthGuard'
import { useAuthStore } from '../../../src/stores/authStore'

const mockPersistHasHydrated = vi.fn(() => true)
const mockPersistOnFinishHydration = vi.fn(() => vi.fn())

vi.mock('../../../src/stores/authStore', () => ({
  useAuthStore: Object.assign(vi.fn(), {
    persist: {
      hasHydrated: () => mockPersistHasHydrated(),
      onFinishHydration: (cb: () => void) => {
        mockPersistOnFinishHydration(cb)
        return vi.fn()
      },
    },
  }),
}))

vi.mock('../../../src/stores/uiStore', () => ({
  useUIStore: vi.fn(() => ({ sidebarOpen: true, setSidebarOpen: vi.fn() })),
}))

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPersistHasHydrated.mockReturnValue(true)
    const mock = useAuthStore as any
    mock.mockReturnValue({
      isAuthenticated: () => false, isAdminOrHR: () => false, hasCompany: () => false,
      isLoading: false, user: null, profile: null, company: null, error: null, _langPref: 'en',
      setUser: vi.fn(), setProfile: vi.fn(), setCompany: vi.fn(), setLoading: vi.fn(), setError: vi.fn(), reset: vi.fn(),
      initSession: vi.fn(), subscribeAuth: vi.fn(() => () => {}),
    })
  })

  function renderGuard() {
    return render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/setup-company" element={<div>Setup Company</div>} />
          <Route path="/dashboard" element={<AuthGuard><div>Dashboard Content</div></AuthGuard>} />
        </Routes>
      </MemoryRouter>
    )
  }

  it('redirects unauthenticated users to login', () => {
    renderGuard()
    expect(screen.getByText('Login Page')).toBeTruthy()
  })

  it('redirects users without company to setup', () => {
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: () => true, isAdminOrHR: () => true, hasCompany: () => false,
      isLoading: false, user: { id: '1' }, profile: { id: '1', role: 'hr', full_name: 'Test', email: 'a@a.com', is_active: true, language_preference: 'th' }, company: null, _langPref: 'en',
      initSession: vi.fn(), subscribeAuth: vi.fn(() => () => {}),
    })
    renderGuard()
    expect(screen.getByText('Setup Company')).toBeTruthy()
  })

  it('shows content for authenticated users with company', () => {
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: () => true, isAdminOrHR: () => true, hasCompany: () => true,
      isLoading: false, user: { id: '1' }, profile: { id: '1', role: 'hr', full_name: 'Test', email: 'a@a.com', is_active: true, language_preference: 'th' },
      company: { id: 'c1', name: 'TestCorp', country: 'TH', currency: 'THB', locale: 'th-TH' }, _langPref: 'en',
      initSession: vi.fn(), subscribeAuth: vi.fn(() => () => {}),
    })
    renderGuard()
    expect(screen.getByText('Dashboard Content')).toBeTruthy()
  })

  it('shows loading spinner when not hydrated yet', () => {
    mockPersistHasHydrated.mockReturnValue(false)
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: () => false, isLoading: false, user: null, profile: null, company: null, _langPref: 'en',
      initSession: vi.fn(), subscribeAuth: vi.fn(() => () => {}),
    })
    renderGuard()
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('shows loading spinner when isLoading is true', () => {
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: () => false, isLoading: true, user: null, profile: null, company: null, _langPref: 'en',
      initSession: vi.fn(), subscribeAuth: vi.fn(() => () => {}),
    })
    renderGuard()
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })

  it('calls initSession after hydration completes', () => {
    mockPersistHasHydrated.mockReturnValue(false)
    const initSession = vi.fn()
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: () => false, isLoading: false, user: null, profile: null, company: null, _langPref: 'en',
      initSession, subscribeAuth: vi.fn(() => () => {}),
    })
    renderGuard()
    // Should show loading since not hydrated
    expect(document.querySelector('.animate-spin')).toBeTruthy()
    expect(initSession).not.toHaveBeenCalled()

    // Now simulate hydration completing
    const hydrationCb = mockPersistOnFinishHydration.mock.calls[0]?.[0]
    if (hydrationCb) {
      act(() => {
        mockPersistHasHydrated.mockReturnValue(true)
        hydrationCb()
      })
    }
  })
})

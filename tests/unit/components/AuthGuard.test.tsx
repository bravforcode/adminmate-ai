import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from '../../../src/router/AuthGuard'
import { useAuthStore } from '../../../src/stores/authStore'

vi.mock('../../../src/stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../../src/stores/uiStore', () => ({
  useUIStore: vi.fn(() => ({ sidebarOpen: true, setSidebarOpen: vi.fn() })),
}))

describe('AuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: () => false, isAdminOrHR: () => false, hasCompany: () => false,
      isLoading: false, user: null, profile: null, company: null, error: null,
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
      isLoading: false, user: { id: '1' }, profile: { id: '1', role: 'hr', full_name: 'Test', email: 'a@a.com', is_active: true, language_preference: 'th' }, company: null,
      initSession: vi.fn(), subscribeAuth: vi.fn(() => () => {}),
    })
    renderGuard()
    expect(screen.getByText('Setup Company')).toBeTruthy()
  })

  it('shows content for authenticated users with company', () => {
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: () => true, isAdminOrHR: () => true, hasCompany: () => true,
      isLoading: false, user: { id: '1' }, profile: { id: '1', role: 'hr', full_name: 'Test', email: 'a@a.com', is_active: true, language_preference: 'th' },
      company: { id: 'c1', name: 'TestCorp', country: 'TH', currency: 'THB', locale: 'th-TH' },
      initSession: vi.fn(), subscribeAuth: vi.fn(() => () => {}),
    })
    renderGuard()
    expect(screen.getByText('Dashboard Content')).toBeTruthy()
  })

  it('shows loading spinner when isLoading is true', () => {
    ;(useAuthStore as any).mockReturnValue({
      isAuthenticated: () => false, isLoading: true, user: null, profile: null, company: null,
      initSession: vi.fn(), subscribeAuth: vi.fn(() => () => {}),
    })
    renderGuard()
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })
})

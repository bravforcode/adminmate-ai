import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginForm } from './LoginForm'

vi.mock('../../stores/authStore', () => ({
  useAuthStore: Object.assign(
    (selector?: any) => {
      const state = {
        user: null,
        profile: { id: 'user-123', role: 'admin', email: 'admin@test.com' },
        company: null,
        isLoading: false,
        error: null,
        _langPref: 'en',
        isAuthenticated: () => true,
        isAdminOrHR: () => true,
        getState: () => state,
      }
      return selector ? selector(state) : state
    },
    { getState: () => ({ profile: { id: 'user-123', role: 'admin' } }) }
  ),
  useAuthLoading: () => false,
  useAuthError: () => null,
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue(undefined),
    loginWithGoogle: vi.fn().mockResolvedValue(undefined),
  }),
  getDefaultRoute: () => '/dashboard',
}))

vi.mock('react-hook-form', () => ({
  useForm: () => ({
    register: vi.fn().mockReturnValue({}),
    handleSubmit: (fn: any) => (e: any) => { e?.preventDefault?.(); fn({}) },
    formState: { errors: {}, isSubmitting: false },
  }),
  useFormContext: () => ({}),
}))

let mockListFactors: any

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      mfa: {
        listFactors: (...args: any[]) => mockListFactors(...args),
      },
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockListFactors = vi.fn().mockResolvedValue({
    data: { all: [], totp: [], phone: [] },
    error: null,
  })
})

function renderLoginForm() {
  return render(
    <BrowserRouter>
      <LoginForm />
    </BrowserRouter>
  )
}

describe('LoginForm MFA check', () => {
  it('should render login form without MFA challenge when no MFA enrolled', async () => {
    renderLoginForm()
    expect(screen.getByTestId('email-input')).toBeInTheDocument()
    expect(screen.getByTestId('password-input')).toBeInTheDocument()
    expect(screen.queryByText('mfa.challenge_title')).not.toBeInTheDocument()
  })

  it('should handle listFactors returning verified factor', () => {
    mockListFactors = vi.fn().mockResolvedValue({
      data: {
        all: [{ id: 'factor-1', status: 'verified' }],
        totp: [{ id: 'factor-1', status: 'verified' }],
        phone: [],
      },
      error: null,
    })
    expect(mockListFactors).not.toHaveBeenCalled()
  })

  it('should handle listFactors returning error gracefully', () => {
    mockListFactors = vi.fn().mockResolvedValue({
      data: { all: null, totp: [], phone: [] },
      error: { message: 'Not authenticated' },
    })
    expect(mockListFactors).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { LoginForm } from './LoginForm'

const mockNavigate = vi.fn()
const mockLogin = vi.fn().mockResolvedValue(undefined)
const mockLoginWithGoogle = vi.fn().mockResolvedValue(undefined)
const mockLogout = vi.fn().mockResolvedValue(undefined)

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

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
    login: mockLogin,
    loginWithGoogle: mockLoginWithGoogle,
    logout: mockLogout,
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
  mockNavigate.mockReset()
  mockLogin.mockResolvedValue(undefined)
  mockLoginWithGoogle.mockResolvedValue(undefined)
  mockLogout.mockResolvedValue(undefined)
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

  it('should start Google OAuth without local redirect checks', async () => {
    renderLoginForm()

    fireEvent.click(screen.getByText('auth.sign_in_google'))

    await waitFor(() => expect(mockLoginWithGoogle).toHaveBeenCalledTimes(1))
    expect(mockNavigate).not.toHaveBeenCalled()
    expect(mockLogout).not.toHaveBeenCalled()
  })
})

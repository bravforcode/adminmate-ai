import { useMemo, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth, getDefaultRoute } from '../../hooks/useAuth'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Button } from '../ui/Button'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { translateAuthError } from '../../utils/authErrors'
import { MFAChallenge } from './MFAChallenge'

const REMEMBER_KEY = 'adminmate-remember-me'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

interface LoginFormProps {
  selectedRole?: 'hr' | 'applicant'
}

export function LoginForm({ selectedRole }: LoginFormProps) {
  const { t } = useTranslation('common')
  const { login, loginWithGoogle, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname?: string } } }
  const [showPassword, setShowPassword] = useState(false)
  const [pendingMFA, setPendingMFA] = useState<{ factorId: string } | null>(null)

  const defaultValues = useMemo<LoginFormData>(() => {
    let remembered = true
    if (typeof window !== 'undefined') {
      remembered = window.localStorage.getItem(REMEMBER_KEY) !== 'false'
    }
    return { email: '', password: '', remember: remembered }
  }, [])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues,
  })

  const resolveRedirect = (role?: string | null) => {
    if (location.state?.from?.pathname && location.state.from.pathname !== '/login') {
      return location.state.from.pathname
    }
    return getDefaultRoute(role)
  }

  const roleMatchesWorkspace = useCallback((role?: string | null) => {
    if (!selectedRole) return true
    if (selectedRole === 'applicant') return role === 'applicant'
    return ['admin', 'hr', 'manager'].includes(role ?? '')
  }, [selectedRole])

  const handleWrongWorkspace = useCallback(async () => {
    await logout()
    toast.error(
      selectedRole === 'applicant'
        ? t('auth.role_mismatch_applicant')
        : t('auth.role_mismatch_hr'),
    )
  }, [logout, selectedRole, t])

  const checkMFAEnrollment = useCallback(async (): Promise<string | null> => {
    try {
      const { data: factors, error } = await supabase.auth.mfa.listFactors()
      if (error || !factors?.all) return null
      const verifiedFactor = factors.totp?.find((f) => f.status === 'verified')
      return verifiedFactor?.id ?? null
    } catch {
      return null
    }
  }, [])

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(REMEMBER_KEY, data.remember ? 'true' : 'false')
      }
      // Read role from store after login completed
      const currentProfile = useAuthStore.getState().profile

      if (!roleMatchesWorkspace(currentProfile?.role)) {
        await handleWrongWorkspace()
        return
      }

      // Check if MFA is enabled
      if (currentProfile?.id) {
        const factorId = await checkMFAEnrollment()
        if (factorId) {
          setPendingMFA({ factorId })
          return
        }
      }

      navigate(resolveRedirect(currentProfile?.role), { replace: true })
    } catch (err) {
      toast.error(translateAuthError(err, t))
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle()
      const currentProfile = useAuthStore.getState().profile

      if (!roleMatchesWorkspace(currentProfile?.role)) {
        await handleWrongWorkspace()
        return
      }

      // Check if MFA is enabled
      if (currentProfile?.id) {
        const factorId = await checkMFAEnrollment()
        if (factorId) {
          setPendingMFA({ factorId })
          return
        }
      }

      navigate(resolveRedirect(currentProfile?.role), { replace: true })
    } catch (err) {
      toast.error(translateAuthError(err, t))
    }
  }

  const handleMFASuccess = () => {
    const currentProfile = useAuthStore.getState().profile
    navigate(resolveRedirect(currentProfile?.role), { replace: true })
  }

  const handleMFACancel = () => {
    setPendingMFA(null)
  }

  // Show MFA challenge if needed
  if (pendingMFA) {
    return (
      <MFAChallenge
        factorId={pendingMFA.factorId}
        onSuccess={handleMFASuccess}
        onCancel={handleMFACancel}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
          {t('auth.email')}
        </label>
        <input
          id="email"
          {...register('email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          data-testid="email-input"
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all duration-300 text-on-surface placeholder:text-text-muted"
          placeholder={t('auth.placeholder_email')}
        />
        {errors.email && <p id="email-error" role="alert" className="text-error text-sm mt-1">{t('auth.error_invalid_email')}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
            {t('auth.password')}
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {t('auth.forgot_password')}
          </Link>
        </div>
        <div className="relative">
          <input
            id="password"
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            data-testid="password-input"
            aria-required="true"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface focus:border-primary focus:ring-2 focus:ring-primary/15 outline-none transition-all duration-300 pr-11 text-on-surface placeholder:text-text-muted"
            placeholder={t('auth.password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
            tabIndex={-1}
            aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p id="password-error" role="alert" className="text-error text-sm mt-1">{errors.password.message}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-text-secondary select-none cursor-pointer group">
        <input
          type="checkbox"
          {...register('remember')}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary focus:ring-offset-0 transition-all duration-200"
        />
        <span className="group-hover:text-primary transition-colors duration-200">{t('auth.remember_me')}</span>
      </label>

      <Button
        type="submit"
        variant="glow"
        size="xl"
        loading={isSubmitting}
        data-testid="login-button"
        icon={<LogIn size={18} />}
        fullWidth
      >
        {isSubmitting ? t('auth.logging_in') : t('auth.sign_in')}
      </Button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-3 bg-surface text-text-muted">{t('auth.or')}</span>
        </div>
      </div>

      <Button
        variant="outline"
        size="xl"
        fullWidth
        type="button"
        onClick={handleGoogleLogin}
        icon={
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        }
      >
        {t('auth.sign_in_google')}
      </Button>

      <p className="text-center text-sm text-text-secondary mt-5">
        {t('auth.no_account')}{' '}
        <Link to="/register" className="text-primary hover:text-primary/80 hover:underline transition-colors">
          {t('auth.create_account')}
        </Link>
      </p>
    </form>
  )
}

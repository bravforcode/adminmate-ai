import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { translateAuthError } from '../../utils/authErrors'

const REMEMBER_KEY = 'adminmate-remember-me'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().optional(),
})

type LoginFormData = z.infer<typeof loginSchema>

function formatSeconds(ms: number): string {
  return Math.max(1, Math.ceil(ms / 1000)).toString()
}

export function LoginForm() {
  const { t } = useTranslation('common')
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: { pathname?: string } } }
  const [showPassword, setShowPassword] = useState(false)

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

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(REMEMBER_KEY, data.remember ? 'true' : 'false')
      }
      const redirectTo = location.state?.from?.pathname && location.state.from.pathname !== '/login'
        ? location.state.from.pathname
        : '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      toast.error(translateAuthError(err, t))
    }
  }

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle()
      const redirectTo = location.state?.from?.pathname && location.state.from.pathname !== '/login'
        ? location.state.from.pathname
        : '/dashboard'
      navigate(redirectTo, { replace: true })
    } catch (err) {
      toast.error(translateAuthError(err, t))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className="block text-label-md text-on-surface-variant mb-1">
          {t('auth.email')}
        </label>
        <input
          id="email"
          {...register('email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          data-testid="email-input"
          className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          placeholder="you@company.com"
        />
        {errors.email && <p className="text-error text-sm mt-1">{t('auth.error_invalid_email')}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="password" className="block text-label-md text-on-surface-variant">
            {t('auth.password')}
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-primary hover:underline"
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
            className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
            tabIndex={-1}
            aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <p className="text-error text-sm mt-1">{errors.password.message}</p>}
      </div>

      <label className="flex items-center gap-2 text-sm text-on-surface-variant select-none cursor-pointer">
        <input
          type="checkbox"
          {...register('remember')}
          className="h-4 w-4 rounded border-outline-variant text-primary focus:ring-primary"
        />
        <span>{t('auth.remember_me')}</span>
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        data-testid="login-button"
        className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <LogIn size={18} /> {isSubmitting ? t('auth.logging_in') : t('auth.sign_in')}
      </button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-outline-variant" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-surface text-on-surface-variant">{t('auth.or')}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full border border-outline-variant py-2.5 rounded-lg font-label-md text-on-surface hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        {t('auth.sign_in_google')}
      </button>

      <p className="text-center text-sm text-on-surface-variant mt-4">
        {t('auth.no_account')}{' '}
        <Link to="/register" className="text-primary hover:underline">
          {t('auth.create_account')}
        </Link>
      </p>
    </form>
  )
}

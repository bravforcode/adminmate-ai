import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { authService } from '../../services/authService'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { translateAuthError } from '../../utils/authErrors'
import { evaluatePassword } from '../../utils/passwordStrength'

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Add an uppercase letter')
      .regex(/[0-9]/, 'Add a number'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetFormData = z.infer<typeof resetSchema>

export function ResetPasswordPage() {
  const { t } = useTranslation('common')
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const [showPassword, setShowPassword] = useState(false)
  const [invalidLink, setInvalidLink] = useState(false)
  const [success, setSuccess] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [passwordValue, setPasswordValue] = useState('')
  const strength = evaluatePassword(passwordValue)

  useEffect(() => {
    const hash = window.location.hash
    const search = window.location.search
    const hasRecovery =
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      search.includes('type=recovery') ||
      search.includes('access_token')
    if (!user && !hasRecovery && !isLoading) {
      setInvalidLink(true)
    }
  }, [user, isLoading])

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async (data: ResetFormData) => {
    setSubmitError(null)
    try {
      await authService.updatePassword(data.password)
      setSuccess(true)
      toast.success(t('auth.password_updated'))
      window.setTimeout(() => navigate('/dashboard', { replace: true }), 1500)
    } catch (err) {
      const message = translateAuthError(err, t)
      setSubmitError(message)
      toast.error(message)
    }
  }

  if (invalidLink) {
    return (
      <AuthLayout title={t('auth.reset_password')} subtitle={t('auth.invalid_reset_link')}>
        <div className="text-center space-y-4">
          <p className="text-body-md text-ink-variant">{t('auth.invalid_reset_link_desc')}</p>
          <Link
            to="/forgot-password"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            {t('auth.request_new_link')}
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.reset_password')} subtitle={t('auth.reset_password_subtitle')}>
      {success ? (
        <div className="text-center space-y-4">
          <CheckCircle2 size={48} className="mx-auto text-primary" />
          <p className="text-body-md text-ink">{t('auth.password_updated')}</p>
          <p className="text-sm text-ink-variant">{t('auth.redirecting')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label htmlFor="password" className="block text-label-md text-ink-variant mb-1">
              <span className="inline-flex items-center gap-1">
                <KeyRound size={14} /> {t('auth.new_password')}
              </span>
            </label>
            <div className="relative">
              <input
                id="password"
                {...register('password', {
                  onChange: (e) => setPasswordValue(e.target.value),
                })}
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                data-testid="reset-password-input"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-variant hover:text-primary"
                tabIndex={-1}
                aria-label={showPassword ? t('auth.hide_password') : t('auth.show_password')}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {passwordValue && (
              <div className="mt-2" data-testid="reset-password-strength">
                <div className="h-1.5 w-full rounded-full bg-outline-variant overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all`}
                    style={{ width: `${strength.percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-ink-variant">
                    {t(`auth.password_${strength.label}`)}
                  </span>
                  {strength.hints.length > 0 && (
                    <span className="text-xs text-ink-variant">{strength.hints[0]}</span>
                  )}
                </div>
              </div>
            )}
            {errors.password && (
              <p className="text-destructive text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-label-md text-ink-variant mb-1"
            >
              {t('auth.confirm_password')}
            </label>
            <input
              id="confirmPassword"
              {...register('confirmPassword')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              data-testid="reset-confirm-input"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="text-destructive text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {submitError && (
            <div
              role="alert"
              className="rounded-lg border border-error/40 bg-destructive-subtle/40 text-destructive px-3 py-2 text-sm"
            >
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="reset-submit"
            className="w-full bg-primary text-white py-2.5 rounded-lg font-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? t('auth.saving') : t('auth.update_password')}
          </button>
          <div className="text-center">
            <Link
              to="/login"
              className="text-primary hover:underline text-sm inline-flex items-center gap-1"
            >
              <ArrowLeft size={14} /> {t('auth.back_to_login')}
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}

export default ResetPasswordPage

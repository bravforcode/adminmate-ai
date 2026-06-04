import { useEffect, useState } from 'react'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { authService } from '../../services/authService'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, ShieldAlert, ArrowLeft } from 'lucide-react'
import { translateAuthError } from '../../utils/authErrors'
import {
  getLockoutRemainingMs,
  isLockedOut,
  recordFailure,
  recordSuccess,
  RATE_LIMIT_MAX_ATTEMPTS,
  RATE_LIMIT_LOCKOUT_MS,
} from '../../utils/rateLimit'

const RATE_LIMIT_KEY = 'forgot-password'

const forgotSchema = z.object({
  email: z.string().email('Invalid email'),
})

type ForgotFormData = z.infer<typeof forgotSchema>

function formatSeconds(ms: number): string {
  return Math.max(1, Math.ceil(ms / 1000)).toString()
}

export function ForgotPasswordPage() {
  const { t } = useTranslation('common')
  const [sent, setSent] = useState(false)
  const [lockedMs, setLockedMs] = useState<number>(() => getLockoutRemainingMs(RATE_LIMIT_KEY))
  const [attempts, setAttempts] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  })

  useEffect(() => {
    if (lockedMs <= 0) return
    const interval = window.setInterval(() => {
      const remaining = getLockoutRemainingMs(RATE_LIMIT_KEY)
      setLockedMs(remaining)
      if (remaining <= 0) {
        window.clearInterval(interval)
      }
    }, 1000)
    return () => window.clearInterval(interval)
  }, [lockedMs])

  const onSubmit = async (data: ForgotFormData) => {
    if (lockedMs > 0) return
    setSubmitError(null)
    try {
      await authService.resetPassword(data.email)
      recordSuccess(RATE_LIMIT_KEY)
      setAttempts(0)
      setSent(true)
      toast.success(t('auth.reset_email_sent'))
    } catch (err) {
      const next = recordFailure(RATE_LIMIT_KEY)
      setAttempts(next.attempts)
      setLockedMs(getLockoutRemainingMs(RATE_LIMIT_KEY))
      const message = translateAuthError(err, t)
      setSubmitError(message)
      toast.error(message)
    }
  }

  const isLocked = lockedMs > 0
  const attemptsRemaining = Math.max(0, RATE_LIMIT_MAX_ATTEMPTS - attempts)

  return (
    <AuthLayout
      title={t('auth.forgot_password')}
      subtitle={t('auth.forgot_password_subtitle')}
    >
      {sent ? (
        <div className="text-center space-y-4">
          <Mail size={48} className="mx-auto text-primary" />
          <p className="text-body-md text-on-surface">{t('auth.check_email_reset')}</p>
          <Link
            to="/login"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> {t('auth.back_to_login')}
          </Link>
        </div>
      ) : (
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
              data-testid="forgot-email-input"
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              placeholder="you@company.com"
            />
            {errors.email && (
              <p className="text-error text-sm mt-1">{t('auth.error_invalid_email')}</p>
            )}
          </div>

          {isLocked && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-error/40 bg-error-container/40 text-error px-3 py-2 text-sm"
            >
              <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                {t('auth.too_many_attempts', {
                  seconds: formatSeconds(lockedMs),
                })}
              </span>
            </div>
          )}

          {!isLocked && attempts > 0 && attemptsRemaining <= 2 && (
            <p className="text-sm text-tertiary">
              {t('auth.attempts_remaining', { count: attemptsRemaining })}
            </p>
          )}

          {submitError && !isLocked && (
            <div
              role="alert"
              className="rounded-lg border border-error/40 bg-error-container/40 text-error px-3 py-2 text-sm"
            >
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isLocked}
            data-testid="forgot-submit"
            className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSubmitting ? t('auth.sending') : t('auth.send_reset_link')}
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

export default ForgotPasswordPage
export { isLockedOut as _isForgotLockedOut, RATE_LIMIT_KEY as _RATE_LIMIT_KEY_FORGOT, RATE_LIMIT_MAX_ATTEMPTS as _RATE_LIMIT_MAX, RATE_LIMIT_LOCKOUT_MS as _RATE_LIMIT_LOCK_MS }

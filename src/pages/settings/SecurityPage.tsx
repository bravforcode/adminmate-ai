import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import toast from 'react-hot-toast'
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Copy,
  Check,
  AlertTriangle,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { LoadingState } from '../../components/shared/LoadingState'
import QRCode from 'qrcode'
import { evaluatePassword } from '../../utils/passwordStrength'
import { translateAuthError } from '../../utils/authErrors'

interface MFAStatus {
  enrolled: boolean
  active: boolean
  factorId?: string
  enrolledAt?: string
  verifiedAt?: string
}

interface SetupState {
  factorId: string
  totpUri: string
}

const passwordChangeSchema = z
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

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>

function ChangePasswordCard({ t }: { t: ReturnType<typeof useTranslation>['t'] }) {
  const [showPassword, setShowPassword] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const strength = evaluatePassword(passwordValue)

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const onSubmit = async (data: PasswordChangeFormData) => {
    setSubmitError(null)
    setSuccess(false)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      setSuccess(true)
      setPasswordValue('')
      reset()
      toast.success(t('auth.password_updated'))
    } catch (err) {
      const message = translateAuthError(err, t)
      setSubmitError(message)
      toast.error(message)
    }
  }

  return (
    <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
      <div className="flex items-center gap-2 mb-6 border-b border-surface-container pb-3">
        <KeyRound size={20} className="text-primary" />
        <h3 className="text-title-lg font-semibold text-ink">
          {t('auth.change_password') || 'Change Password'}
        </h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div>
          <label htmlFor="new-password" className="block text-label-md text-ink-variant mb-1">
            {t('auth.new_password')}
          </label>
          <div className="relative">
            <input
              id="new-password"
              {...register('password', {
                onChange: (e) => setPasswordValue(e.target.value),
              })}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              data-testid="change-password-input"
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
            <div className="mt-2">
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
          <label htmlFor="confirm-password" className="block text-label-md text-ink-variant mb-1">
            {t('auth.confirm_password')}
          </label>
          <input
            id="confirm-password"
            {...register('confirmPassword')}
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            data-testid="change-confirm-input"
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

        {success && (
          <div
            role="status"
            className="rounded-lg border border-green-200 bg-green-50 text-green-700 px-3 py-2 text-sm"
          >
            {t('auth.password_updated')}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          data-testid="change-password-button"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {isSubmitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <KeyRound size={16} />
          )}
          {isSubmitting ? t('auth.saving') : t('auth.update_password')}
        </button>
      </form>
    </div>
  )
}

export function SecurityPage() {
  const { t } = useTranslation('common')
  const profile = useAuthStore((s) => s.profile)
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupState, setSetupState] = useState<SetupState | null>(null)
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [copied, setCopied] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  const fetchMFAStatus = useCallback(async () => {
    if (!profile?.id) return
    try {
      const { data, error } = await supabase
        .from('mfa_enrollments')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        logger.error('Failed to fetch MFA status:', { error: error.message })
      }

      setMfaStatus({
        enrolled: !!data,
        active: data?.is_active ?? false,
        factorId: data?.factor_id,
        enrolledAt: data?.enrolled_at,
        verifiedAt: data?.verified_at,
      })
    } finally {
      setLoading(false)
    }
  }, [profile?.id])

  useEffect(() => {
    fetchMFAStatus()
  }, [fetchMFAStatus])

  const handleEnableMFA = async () => {
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/setup-mfa`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      setSetupState({
        factorId: result.data.factor_id,
        totpUri: result.data.totp_uri,
      })

      // Generate QR code locally to avoid leaking TOTP URI to third-party services
      const dataUrl = await QRCode.toDataURL(result.data.totp_uri, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
      setQrDataUrl(dataUrl)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('mfa.setup_error'))
    }
  }

  const handleVerifyCode = async () => {
    if (!setupState || verifyCode.length < 6) return
    setVerifying(true)
    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-mfa`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factor_id: setupState.factorId,
          code: verifyCode,
        }),
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error)

      setBackupCodes(result.data.backup_codes)
      setSetupState(null)
      setVerifyCode('')
      await fetchMFAStatus()
      toast.success(t('mfa.enabled_success'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('mfa.verify_error'))
    } finally {
      setVerifying(false)
    }
  }

  const handleDisableMFA = async () => {
    if (!mfaStatus?.factorId || !disableCode) return
    setDisabling(true)
    try {
      // Delete the factor via Edge Function (admin operation)
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) throw new Error('Not authenticated')

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-mfa`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          factor_id: mfaStatus.factorId,
          code: disableCode,
        }),
      })

      const result = await res.json()
      if (!result.success) throw new Error(result.error || 'Failed to disable MFA')

      // Update enrollment record
      const { error: updateError } = await supabase
        .from('mfa_enrollments')
        .update({ is_active: false })
        .eq('user_id', profile!.id)
        .eq('factor_id', mfaStatus.factorId)

      if (updateError) logger.error('Update enrollment error:', { error: updateError.message })

      // Audit log
      try {
        await supabase.from('audit_logs').insert({
          user_id: profile!.id,
          action: 'mfa_disabled',
          resource_type: 'mfa_enrollment',
          resource_id: mfaStatus.factorId,
        })
      } catch {
        // Non-critical
      }

      setMfaStatus(null)
      setShowDisableConfirm(false)
      setDisableCode('')
      toast.success(t('mfa.disabled_success'))
      await fetchMFAStatus()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('mfa.disable_error'))
    } finally {
      setDisabling(false)
    }
  }

  const copyBackupCodes = () => {
    if (!backupCodes) return
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-surface-sunken rounded-lg animate-shimmer" />
          <div className="h-4 w-64 bg-surface-sunken rounded-lg animate-shimmer" />
        </div>
        <LoadingState variant="cards" rows={2} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-ink">
          {t('mfa.title') || 'Security'}
        </h1>
        <p className="text-body-md text-ink-variant mt-1">
          {t('mfa.subtitle') || 'Manage two-factor authentication and account security'}
        </p>
      </div>

      {/* Change Password Card */}
      <ChangePasswordCard t={t} />

      {/* MFA Status Card */}
      <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-surface-container pb-3">
          {mfaStatus?.active ? (
            <ShieldCheck size={20} className="text-green-600" />
          ) : (
            <Shield size={20} className="text-primary" />
          )}
          <h3 className="text-title-lg font-semibold text-ink">
            {t('mfa.two_factor_auth') || 'Two-Factor Authentication'}
          </h3>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-3 mb-6">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              mfaStatus?.active ? 'bg-green-500' : 'bg-on-surface-variant/30'
            )}
          />
          <span className="text-sm font-medium text-ink">
            {mfaStatus?.active
              ? t('mfa.status_enabled')
              : t('mfa.status_disabled')}
          </span>
          {mfaStatus?.verifiedAt && (
            <span className="text-xs text-ink-variant">
              {t('mfa.enabled_on', {
                date: new Date(mfaStatus.verifiedAt).toLocaleDateString(),
              })}
            </span>
          )}
        </div>

        {/* Enable MFA Flow */}
        {!mfaStatus?.active && !setupState && (
          <div>
            <p className="text-sm text-ink-variant mb-4">
              {t('mfa.enable_description')}
            </p>
            <button
              onClick={handleEnableMFA}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <KeyRound size={16} />
              {t('mfa.enable_button')}
            </button>
          </div>
        )}

        {/* Setup: Show QR Code */}
        {setupState && (
          <div className="space-y-4">
            <div className="bg-surface-sunken-lowest border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold text-ink mb-3">
                {t('mfa.scan_qr')}
              </h4>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="MFA QR Code"
                      className="w-48 h-48"
                    />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-ink-variant text-sm">
                      <Loader2 size={24} className="animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-ink-variant">
                    {t('mfa.scan_instructions')}
                  </p>
                  <ol className="text-sm text-ink-variant space-y-1 list-decimal list-inside">
                    <li>{t('mfa.step_1')}</li>
                    <li>{t('mfa.step_2')}</li>
                    <li>{t('mfa.step_3')}</li>
                  </ol>
                  <div>
                    <label className="block text-sm font-medium text-ink mb-2">
                      {t('mfa.enter_code')}
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) =>
                          setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                        }
                        placeholder="000000"
                        maxLength={6}
                        className="w-32 px-3 py-2 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center text-lg tracking-widest font-mono"
                      />
                      <button
                        onClick={handleVerifyCode}
                        disabled={verifying || verifyCode.length < 6}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                      >
                        {verifying ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        {t('mfa.verify_button')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setSetupState(null)
                setVerifyCode('')
                setQrDataUrl(null)
              }}
              className="text-sm text-ink-variant hover:text-ink"
            >
              {t('common.cancel')}
            </button>
          </div>
        )}

        {/* Backup Codes Display */}
        {backupCodes && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                  {t('mfa.backup_codes_title')}
                </h4>
                <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                  {t('mfa.backup_codes_warning')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {backupCodes.map((code, i) => (
                    <code
                      key={i}
                      className="bg-white dark:bg-green-900/40 px-3 py-1.5 rounded text-sm font-mono text-center border border-green-200 dark:border-green-700"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  onClick={copyBackupCodes}
                  className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-300 hover:underline"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? t('mfa.copied') : t('mfa.copy_codes')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Disable MFA */}
        {mfaStatus?.active && !showDisableConfirm && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowDisableConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-error text-destructive rounded-lg font-medium hover:bg-error/5 transition-colors"
            >
              <ShieldOff size={16} />
              {t('mfa.disable_button')}
            </button>
          </div>
        )}

        {/* Disable Confirmation */}
        {showDisableConfirm && (
          <div className="mt-4 pt-4 border-t border-border space-y-3">
            <p className="text-sm text-ink-variant">
              {t('mfa.disable_confirm_message')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDisableMFA}
                disabled={disabling || !disableCode}
                className="flex items-center gap-2 px-4 py-2 bg-error text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {disabling ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldOff size={16} />
                )}
                {t('mfa.confirm_disable')}
              </button>
              <button
                onClick={() => {
                  setShowDisableConfirm(false)
                  setDisableCode('')
                }}
                className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-surface-sunken transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SecurityPage

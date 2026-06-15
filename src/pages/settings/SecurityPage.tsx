import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../stores/authStore'
import { supabase } from '../../lib/supabase'
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
} from 'lucide-react'
import { cn } from '../../utils/cn'
import { LoadingState } from '../../components/shared/LoadingState'

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
        console.error('Failed to fetch MFA status:', error)
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

      if (updateError) console.error('Update enrollment error:', updateError)

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
          <div className="h-8 w-48 bg-surface-container-high rounded-lg animate-shimmer" />
          <div className="h-4 w-64 bg-surface-container-high rounded-lg animate-shimmer" />
        </div>
        <LoadingState variant="cards" rows={2} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">
          {t('mfa.title') || 'Security'}
        </h1>
        <p className="text-body-md text-on-surface-variant mt-1">
          {t('mfa.subtitle') || 'Manage two-factor authentication and account security'}
        </p>
      </div>

      {/* MFA Status Card */}
      <div className="bg-surface rounded-xl border border-outline-variant shadow-sm p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-surface-container pb-3">
          {mfaStatus?.active ? (
            <ShieldCheck size={20} className="text-green-600" />
          ) : (
            <Shield size={20} className="text-primary" />
          )}
          <h3 className="text-title-lg font-semibold text-on-surface">
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
          <span className="text-sm font-medium text-on-surface">
            {mfaStatus?.active
              ? t('mfa.status_enabled')
              : t('mfa.status_disabled')}
          </span>
          {mfaStatus?.verifiedAt && (
            <span className="text-xs text-on-surface-variant">
              {t('mfa.enabled_on', {
                date: new Date(mfaStatus.verifiedAt).toLocaleDateString(),
              })}
            </span>
          )}
        </div>

        {/* Enable MFA Flow */}
        {!mfaStatus?.active && !setupState && (
          <div>
            <p className="text-sm text-on-surface-variant mb-4">
              {t('mfa.enable_description')}
            </p>
            <button
              onClick={handleEnableMFA}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              <KeyRound size={16} />
              {t('mfa.enable_button')}
            </button>
          </div>
        )}

        {/* Setup: Show QR Code */}
        {setupState && (
          <div className="space-y-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
              <h4 className="text-sm font-semibold text-on-surface mb-3">
                {t('mfa.scan_qr')}
              </h4>
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="bg-white p-4 rounded-lg flex items-center justify-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupState.totpUri)}`}
                    alt="MFA QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-on-surface-variant">
                    {t('mfa.scan_instructions')}
                  </p>
                  <ol className="text-sm text-on-surface-variant space-y-1 list-decimal list-inside">
                    <li>{t('mfa.step_1')}</li>
                    <li>{t('mfa.step_2')}</li>
                    <li>{t('mfa.step_3')}</li>
                  </ol>
                  <div>
                    <label className="block text-sm font-medium text-on-surface mb-2">
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
                        className="w-32 px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center text-lg tracking-widest font-mono"
                      />
                      <button
                        onClick={handleVerifyCode}
                        disabled={verifying || verifyCode.length < 6}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
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
              }}
              className="text-sm text-on-surface-variant hover:text-on-surface"
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
          <div className="mt-4 pt-4 border-t border-outline-variant">
            <button
              onClick={() => setShowDisableConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 border border-error text-error rounded-lg font-medium hover:bg-error/5 transition-colors"
            >
              <ShieldOff size={16} />
              {t('mfa.disable_button')}
            </button>
          </div>
        )}

        {/* Disable Confirmation */}
        {showDisableConfirm && (
          <div className="mt-4 pt-4 border-t border-outline-variant space-y-3">
            <p className="text-sm text-on-surface-variant">
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
                className="px-4 py-2 border border-outline-variant rounded-lg font-medium hover:bg-surface-container-low transition-colors"
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

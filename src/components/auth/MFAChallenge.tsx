import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { ShieldCheck, Loader2, KeyRound } from 'lucide-react'

interface MFAChallengeProps {
  factorId: string
  onSuccess: () => void
  onCancel: () => void
}

export function MFAChallenge({ factorId, onSuccess, onCancel }: MFAChallengeProps) {
  const { t } = useTranslation('common')
  const [code, setCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const [backupCode, setBackupCode] = useState('')

  const handleVerify = async () => {
    const codeToVerify = useBackupCode ? backupCode : code
    if (!codeToVerify || codeToVerify.length < 6) return

    setVerifying(true)
    try {
      if (useBackupCode) {
        const { data: { session } } = await supabase.auth.getSession()
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
        const res = await fetch(`${supabaseUrl}/functions/v1/verify-mfa`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ factor_id: factorId, code: backupCode }),
        })
        const result = await res.json()
        if (!result.success) throw new Error(result.error || t('mfa.invalid_code'))
      } else {
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
        if (challengeError) throw challengeError

        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId,
          challengeId: challengeData.id,
          code,
        })
        if (verifyError) throw verifyError
      }

      onSuccess()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('mfa.invalid_code'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-xl border border-border shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-title-lg font-semibold text-ink">
                {t('mfa.challenge_title')}
              </h2>
              <p className="text-sm text-ink-variant">
                {t('mfa.challenge_subtitle')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {!useBackupCode ? (
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  {t('mfa.enter_code')}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && code.length >= 6) {
                      handleVerify()
                    }
                  }}
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-ink mb-2">
                  {t('mfa.backup_code_label')}
                </label>
                <input
                  type="text"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                  placeholder="XXXX-XXXX"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg border border-border bg-surface-sunken-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-center text-lg tracking-wider font-mono"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && backupCode.length >= 8) {
                      handleVerify()
                    }
                  }}
                />
              </div>
            )}

            <button
              onClick={handleVerify}
              disabled={verifying || (!useBackupCode ? code.length < 6 : backupCode.length < 8)}
              data-testid="verify-button"
              className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {verifying ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <KeyRound size={18} />
              )}
              {verifying ? t('mfa.verifying') : t('mfa.verify_button')}
            </button>

            <div className="text-center">
              <button
                onClick={() => {
                  setUseBackupCode(!useBackupCode)
                  setCode('')
                  setBackupCode('')
                }}
                className="text-sm text-primary hover:underline"
              >
                {useBackupCode
                  ? t('mfa.use_authenticator')
                  : t('mfa.use_backup_code')}
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={onCancel}
                className="text-sm text-ink-variant hover:text-ink"
              >
                {t('common.back')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

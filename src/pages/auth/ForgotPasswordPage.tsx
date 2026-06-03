import { useState } from 'react'
import { AuthLayout } from '../../components/auth/AuthLayout'
import { authService } from '../../services/authService'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Mail } from 'lucide-react'

export function ForgotPasswordPage() {
  const { t } = useTranslation('common')
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await authService.resetPassword(email)
      setSent(true)
      toast.success(t('auth.reset_email_sent'))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <AuthLayout title={t('auth.forgot_password')} subtitle={t('auth.forgot_password_subtitle')}>
      {sent ? (
        <div className="text-center space-y-4">
          <Mail size={48} className="mx-auto text-primary" />
          <p className="text-body-md text-on-surface">{t('auth.check_email_reset')}</p>
          <Link to="/login" className="text-primary hover:underline block">{t('auth.back_to_login')}</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-label-md text-on-surface-variant mb-1">{t('auth.email')}</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required
              className="w-full px-3 py-2 rounded-lg border border-outline-variant bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          </div>
          <button type="submit" className="w-full bg-primary text-on-primary py-2.5 rounded-lg font-label-md hover:opacity-90 transition-opacity">
            {t('auth.send_reset_link')}
          </button>
          <div className="text-center">
            <Link to="/login" className="text-primary hover:underline text-sm">{t('auth.back_to_login')}</Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}

export default ForgotPasswordPage

import { AuthLayout } from '../../components/auth/AuthLayout'
import { LoginForm } from '../../components/auth/LoginForm'
import { useTranslation } from 'react-i18next'

export function LoginPage() {
  const { t } = useTranslation('common')
  return (
    <AuthLayout title={t('auth.sign_in')} subtitle={t('auth.sign_in_subtitle')}>
      <LoginForm />
    </AuthLayout>
  )
}

export default LoginPage

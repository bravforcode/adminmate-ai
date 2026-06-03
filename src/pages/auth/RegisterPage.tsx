import { AuthLayout } from '../../components/auth/AuthLayout'
import { RegisterForm } from '../../components/auth/RegisterForm'
import { useTranslation } from 'react-i18next'

export function RegisterPage() {
  const { t } = useTranslation('common')
  return (
    <AuthLayout title={t('auth.create_account')} subtitle={t('auth.create_account_subtitle')}>
      <RegisterForm />
    </AuthLayout>
  )
}

export default RegisterPage

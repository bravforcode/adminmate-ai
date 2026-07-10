import { useTranslation } from 'react-i18next'
import { ShieldOff } from 'lucide-react'

export function PermissionDenied() {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <ShieldOff className="w-16 h-16 text-destructive opacity-60" />
      <h1 className="text-2xl font-semibold text-ink text-ink">
        {t('permission_denied_title', 'Access Denied')}
      </h1>
      <p className="text-ink-muted text-ink-muted max-w-md">
        {t('permission_denied_message', 'You do not have permission to access this page. Contact your administrator if you believe this is an error.')}
      </p>
    </div>
  )
}

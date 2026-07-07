import { useTranslation } from 'react-i18next'
import { Settings } from 'lucide-react'

interface NeedsConfigurationProps {
  feature?: string
}

export function NeedsConfiguration({ feature }: NeedsConfigurationProps) {
  const { t } = useTranslation('common')
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <Settings className="w-12 h-12 text-text-muted opacity-60" />
      <h2 className="text-lg font-semibold text-on-surface dark:text-on-surface">
        {t('needs_config_title', 'Configuration Required')}
      </h2>
      <p className="text-on-surface-variant dark:text-on-surface-variant max-w-md text-sm">
        {feature
          ? t('needs_config_feature', 'The {{feature}} module is not configured for this organization. Contact your administrator to enable it.', { feature })
          : t('needs_config_message', 'This feature requires additional configuration. Contact your administrator to set it up.')}
      </p>
    </div>
  )
}

import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/Card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/Button'

interface ComingSoonProps {
  feature?: string
  description?: string
  isUnderDevelopment?: boolean
}

export function ComingSoon({ feature, description, isUnderDevelopment }: ComingSoonProps) {
  const { t } = useTranslation('common')

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="items-center text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-surface-sunken mb-2">
            <Clock className="w-8 h-8 text-ink-muted opacity-60" />
          </div>
          <Badge variant={isUnderDevelopment ? 'secondary' : 'default'}>
            {isUnderDevelopment
              ? t('under_development', 'Under Development')
              : t('coming_soon', 'Coming Soon')}
          </Badge>
          <CardTitle className="mt-2">
            {feature
              ? t('coming_soon_feature', '{{feature}} is coming soon', { feature })
              : t('coming_soon_title', 'This feature is on its way')}
          </CardTitle>
          <CardDescription>
            {description
              ?? t('coming_soon_description', 'We\'re working hard to bring this to you. Stay tuned for updates.')}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <div className="w-full h-24 rounded-lg bg-surface-sunken border border-border flex items-center justify-center">
            <span className="text-xs text-ink-muted opacity-50">
              {t('preview_placeholder', 'Preview')}
            </span>
          </div>
        </CardContent>
        <CardFooter className="justify-center">
          <Button disabled variant="secondary">
            {t('coming_soon_cta', 'Coming Soon')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

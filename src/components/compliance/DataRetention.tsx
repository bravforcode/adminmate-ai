import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useTranslation } from 'react-i18next'
import { Clock, Archive, Trash2, Shield } from 'lucide-react'

interface RetentionPolicy {
  id: string
  entity_type: string
  retention_days: number
  action: 'anonymize' | 'delete' | 'archive'
  is_active: boolean
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  anonymize: <Shield size={16} className="text-yellow-600" />,
  delete: <Trash2 size={16} className="text-red-600" />,
  archive: <Archive size={16} className="text-blue-600" />,
}

export function DataRetention() {
  const { t } = useTranslation('common')
  const company = useAuthStore(s => s.company)

  const { data: policies, isLoading } = useQuery<RetentionPolicy[]>({
    queryKey: ['data-retention', company?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('data_retention_policies')
        .select('*')
        .eq('company_id', company?.id)
        .order('entity_type')
      return (data || []) as RetentionPolicy[]
    },
    enabled: !!company?.id,
  })

  if (isLoading) {
    return <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-surface-container-high rounded-lg animate-shimmer" />)}</div>
  }

  return (
    <div className="space-y-3">
      {policies?.map(policy => (
        <div key={policy.id} className="flex items-center justify-between py-3 px-3 rounded-lg bg-surface-container-low border border-outline-variant">
          <div className="flex items-center gap-3">
            {ACTION_ICONS[policy.action] || <Clock size={16} className="text-on-surface-variant" />}
            <div>
              <p className="text-sm font-medium text-on-surface">{policy.entity_type}</p>
              <p className="text-xs text-on-surface-variant capitalize">{t('compliance.retention_action') || 'Action'}: {policy.action}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-primary">{policy.retention_days} {t('compliance.days') || 'days'}</p>
            <p className={`text-[10px] ${policy.is_active ? 'text-green-600' : 'text-on-surface-variant'}`}>
              {policy.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      ))}
      {policies?.length === 0 && (
        <p className="text-sm text-on-surface-variant text-center py-4">{t('compliance.no_retention_policies') || 'No retention policies configured.'}</p>
      )}
    </div>
  )
}

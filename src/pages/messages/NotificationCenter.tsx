import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { cn } from '../../lib/utils'
import { LoadingState } from '../../components/shared/LoadingState'
import { EmptyState } from '../../components/shared/EmptyState'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs'
import {
  Bell, CheckCheck, Search, Eye, EyeOff,
  MessageSquare, FileText, Calendar, Users, AlertCircle, Settings,
} from 'lucide-react'
import {
  notificationCenterService,
  type NotificationV2,
  type NotificationFilters,
} from '../../services/notification/notificationCenterService'
import {
  notificationPreferencesService,
  type NotificationPreference,
  type PreferenceType,
} from '../../services/notificationPreferencesService'

/* ============================================================
   AdminMate AI — Notification Center
   Route: /notifications
   ============================================================ */

const TYPE_ICONS: Record<string, typeof Bell> = {
  new_applicant: Users,
  status_change: FileText,
  doc_expiry: AlertCircle,
  interview: Calendar,
  system: Settings,
  application_received: FileText,
  interview_scheduled: Calendar,
  offer_sent: MessageSquare,
  document_reminder: FileText,
  onboarding_update: Users,
  chatbot_message: MessageSquare,
  system_alert: AlertCircle,
}

const TYPE_COLORS: Record<string, string> = {
  new_applicant: 'bg-blue-100 text-blue-700',
  status_change: 'bg-purple-100 text-purple-700',
  doc_expiry: 'bg-orange-100 text-orange-700',
  interview: 'bg-green-100 text-green-700',
  system: 'bg-gray-100 text-gray-700',
  application_received: 'bg-blue-100 text-blue-700',
  interview_scheduled: 'bg-green-100 text-green-700',
  offer_sent: 'bg-purple-100 text-purple-700',
  document_reminder: 'bg-orange-100 text-orange-700',
  onboarding_update: 'bg-teal-100 text-teal-700',
  chatbot_message: 'bg-indigo-100 text-indigo-700',
  system_alert: 'bg-red-100 text-red-700',
}

export default function NotificationCenter() {
  const { t } = useTranslation(['common', 'reports'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [showRead, setShowRead] = useState<boolean | undefined>(undefined)

  const companyId = company?.id ?? ''
  const userId = profile?.id ?? ''

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications', companyId, userId, showRead, typeFilter],
    queryFn: () => {
      const filters: NotificationFilters = {
        is_read: showRead,
        notification_type: typeFilter === 'all' ? undefined : typeFilter,
        limit: 50,
      }
      return notificationCenterService.getNotifications(userId, companyId, filters)
    },
    enabled: !!companyId && !!userId,
  })

  const { data: preferences = [] } = useQuery({
    queryKey: ['notificationPreferences', userId],
    queryFn: () => notificationPreferencesService.getPreferences(userId),
    enabled: !!userId,
  })

  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) => notificationCenterService.markAsRead(notificationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationCenterService.markAllAsRead(userId, companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const updatePreferenceMutation = useMutation({
    mutationFn: ({ type, settings }: { type: PreferenceType; settings: Partial<Pick<NotificationPreference, 'email_enabled' | 'in_app_enabled' | 'push_enabled'>> }) =>
      notificationPreferencesService.updatePreference(userId, type, settings, companyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] }),
  })

  const filteredNotifications = notifications.filter(n => {
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !n.body.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length

  const handleNotificationClick = useCallback(async (notification: NotificationV2) => {
    if (!notification.is_read) {
      await markAsReadMutation.mutateAsync(notification.id)
    }
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }, [markAsReadMutation])

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-background flex items-center gap-3">
            <Bell size={28} />
            {t('notification_center.title', 'Notification Center')}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-sm">
                {unreadCount} {t('notification_center.unread', 'unread')}
              </Badge>
            )}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {t('notification_center.subtitle', 'Stay updated with important events and messages')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || unreadCount === 0}
          >
            <CheckCheck size={16} className="mr-1" />
            {t('notification_center.mark_all_read', 'Mark All Read')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
          >
            {t('common:refresh', 'Refresh')}
          </Button>
        </div>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <Input
            placeholder={t('common:search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('notification_center.type', 'Type')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('notification_center.all_types', 'All Types')}</SelectItem>
            <SelectItem value="application_received">{t('notification_center.applications', 'Applications')}</SelectItem>
            <SelectItem value="interview_scheduled">{t('notification_center.interviews', 'Interviews')}</SelectItem>
            <SelectItem value="offer_sent">{t('notification_center.offers', 'Offers')}</SelectItem>
            <SelectItem value="document_reminder">{t('notification_center.documents', 'Documents')}</SelectItem>
            <SelectItem value="system_alert">{t('notification_center.system', 'System')}</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showRead === false ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowRead(showRead === false ? undefined : false)}
        >
          <EyeOff size={16} className="mr-1" />
          {t('notification_center.unread_only', 'Unread Only')}
        </Button>
      </div>

      {/* Notifications List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell size={16} /> {t('notification_center.all', 'All')}
            {notifications.length > 0 && <Badge variant="secondary" className="ml-1">{notifications.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings size={16} /> {t('notification_center.preferences', 'Preferences')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-3">
          {isLoading ? (
            <LoadingState variant="list" rows={5} message={t('common:loading')} />
          ) : filteredNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title={t('notification_center.empty', 'No notifications')}
              description={t('notification_center.empty_desc', 'You\'re all caught up!')}
            />
          ) : (
            filteredNotifications.map((notification) => {
              const TypeIcon = TYPE_ICONS[notification.notification_type] ?? Bell
              const typeColor = TYPE_COLORS[notification.notification_type] ?? 'bg-gray-100 text-gray-700'

              return (
                <Card
                  key={notification.id}
                  className={cn(
                    'p-4 cursor-pointer hover:border-primary transition-colors',
                    !notification.is_read && 'border-l-4 border-l-primary bg-primary/5',
                  )}
                  onClick={() => void handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0', typeColor)}>
                      <TypeIcon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={cn(
                          'text-sm font-medium text-on-surface',
                          !notification.is_read && 'font-semibold',
                        )}>
                          {notification.title || t('notification_center.default_title', 'Notification')}
                        </span>
                        <span className="text-xs text-on-surface-variant whitespace-nowrap">
                          {new Date(notification.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant line-clamp-2">{notification.body}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {notification.notification_type.replace(/_/g, ' ')}
                        </Badge>
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs">
                            {t('notification_center.new', 'New')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          markAsReadMutation.mutate(notification.id)
                        }}
                      >
                        <Eye size={16} />
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              {t('notification_center.manage_preferences', 'Manage Notification Preferences')}
            </h3>
            <p className="text-sm text-on-surface-variant mb-6">
              {t('notification_center.preferences_desc', 'Choose how you want to be notified for different types of events')}
            </p>
            <div className="space-y-4">
              {preferences.map((pref) => (
                <div key={pref.id} className="flex items-center justify-between p-3 rounded-lg border border-outline-variant">
                  <div>
                    <p className="text-sm font-medium text-on-surface">
                      {pref.preference_type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={pref.email_enabled}
                        onChange={(e) => updatePreferenceMutation.mutate({
                          type: pref.preference_type,
                          settings: { email_enabled: e.target.checked },
                        })}
                        className="rounded"
                      />
                      {t('notification_center.email', 'Email')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={pref.in_app_enabled}
                        onChange={(e) => updatePreferenceMutation.mutate({
                          type: pref.preference_type,
                          settings: { in_app_enabled: e.target.checked },
                        })}
                        className="rounded"
                      />
                      {t('notification_center.in_app', 'In-App')}
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={pref.push_enabled}
                        onChange={(e) => updatePreferenceMutation.mutate({
                          type: pref.preference_type,
                          settings: { push_enabled: e.target.checked },
                        })}
                        className="rounded"
                      />
                      {t('notification_center.push', 'Push')}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

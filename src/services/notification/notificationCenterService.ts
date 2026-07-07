import { supabase } from '../../lib/supabase'
import { hasPermission } from '../permissionService'

export interface NotificationV2 {
  id: string
  company_id: string
  user_id: string
  title: string
  body: string
  notification_type: string
  reference_type: string | null
  reference_id: string | null
  is_read: boolean
  action_url: string | null
  created_at: string
}

export interface NotificationFilters {
  is_read?: boolean
  notification_type?: string
  limit?: number
  offset?: number
}

export interface NotificationPreferenceV2 {
  id: string
  company_id: string
  user_id: string
  channel: 'email' | 'in_app' | 'push'
  notification_type: string
  is_enabled: boolean
  created_at: string
  updated_at: string
}

const SENSITIVE_FIELDS = ['salary', 'ssn', 'national_id', 'bank_account', 'health_info']

function stripSensitive(text: string): string {
  let cleaned = text
  for (const field of SENSITIVE_FIELDS) {
    const re = new RegExp(`${field}\\s*[:=]\\s*\\S+`, 'gi')
    cleaned = cleaned.replace(re, `${field}: [REDACTED]`)
  }
  return cleaned
}

function mapNotification(row: Record<string, unknown>): NotificationV2 {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    user_id: row.user_id as string,
    title: (row.title as string) ?? '',
    body: stripSensitive((row.body as string) ?? ''),
    notification_type: (row.notification_type as string) ?? 'system',
    reference_type: (row.reference_type as string) ?? null,
    reference_id: (row.reference_id as string) ?? null,
    is_read: (row.is_read as boolean) ?? false,
    action_url: (row.action_url as string) ?? null,
    created_at: row.created_at as string,
  }
}

export const notificationCenterService = {
  getNotifications: async (
    userId: string,
    companyId: string,
    filters: NotificationFilters = {}
  ): Promise<NotificationV2[]> => {
    const permitted = await hasPermission('notification', 'read')
    if (!permitted) throw new Error('Insufficient permissions: notification:read required')

    const { is_read, notification_type, limit = 50, offset = 0 } = filters

    let query = supabase
      .from('notifications_v2')
      .select('id, company_id, user_id, title, body, notification_type, reference_type, reference_id, is_read, action_url, created_at')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (is_read !== undefined) {
      query = query.eq('is_read', is_read)
    }
    if (notification_type) {
      query = query.eq('notification_type', notification_type)
    }

    const { data, error } = await query.range(offset, offset + limit - 1)
    if (error) throw error
    return (data ?? []).map(mapNotification)
  },

  markAsRead: async (notificationId: string): Promise<void> => {
    const permitted = await hasPermission('notification', 'write')
    if (!permitted) throw new Error('Insufficient permissions: notification:write required')

    const { error } = await supabase
      .from('notifications_v2')
      .update({ is_read: true })
      .eq('id', notificationId)
    if (error) throw error
  },

  markAllAsRead: async (userId: string, companyId: string): Promise<void> => {
    const permitted = await hasPermission('notification', 'write')
    if (!permitted) throw new Error('Insufficient permissions: notification:write required')

    const { error } = await supabase
      .from('notifications_v2')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('is_read', false)
    if (error) throw error
  },

  getPreferences: async (userId: string): Promise<NotificationPreferenceV2[]> => {
    const { data, error } = await supabase
      .from('notification_preferences_v2')
      .select('id, company_id, user_id, channel, notification_type, is_enabled, created_at, updated_at')
      .eq('user_id', userId)
      .order('notification_type')
    if (error) throw error
    return (data ?? []) as NotificationPreferenceV2[]
  },

  updatePreference: async (
    userId: string,
    channel: string,
    notificationType: string,
    enabled: boolean
  ): Promise<NotificationPreferenceV2> => {
    const { data, error } = await supabase
      .from('notification_preferences_v2')
      .upsert(
        {
          user_id: userId,
          channel,
          notification_type: notificationType,
          is_enabled: enabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,channel,notification_type' }
      )
      .select()
      .single()
    if (error) throw error
    return data as NotificationPreferenceV2
  },

  isNotificationEnabled: async (
    userId: string,
    channel: string,
    notificationType: string
  ): Promise<boolean> => {
    const { data, error } = await supabase
      .from('notification_preferences_v2')
      .select('is_enabled')
      .eq('user_id', userId)
      .eq('channel', channel)
      .eq('notification_type', notificationType)
      .maybeSingle()
    if (error) throw error
    return data?.is_enabled ?? true
  },
}

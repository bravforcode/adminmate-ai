import { supabase } from '../lib/supabase'

export type PreferenceType =
  | 'application_received'
  | 'interview_scheduled'
  | 'offer_sent'
  | 'document_reminder'
  | 'onboarding_update'
  | 'chatbot_message'
  | 'system_alert'

export interface NotificationPreference {
  id: string
  user_id: string
  company_id: string
  preference_type: PreferenceType
  email_enabled: boolean
  in_app_enabled: boolean
  push_enabled: boolean
  created_at: string
  updated_at: string
}

export const NOTIFICATION_TYPES: { type: PreferenceType; labelKey: string; descKey: string }[] = [
  { type: 'application_received', labelKey: 'notifications_prefs.types.application_received', descKey: 'notifications_prefs.types.application_received_desc' },
  { type: 'interview_scheduled', labelKey: 'notifications_prefs.types.interview_scheduled', descKey: 'notifications_prefs.types.interview_scheduled_desc' },
  { type: 'offer_sent', labelKey: 'notifications_prefs.types.offer_sent', descKey: 'notifications_prefs.types.offer_sent_desc' },
  { type: 'document_reminder', labelKey: 'notifications_prefs.types.document_reminder', descKey: 'notifications_prefs.types.document_reminder_desc' },
  { type: 'onboarding_update', labelKey: 'notifications_prefs.types.onboarding_update', descKey: 'notifications_prefs.types.onboarding_update_desc' },
  { type: 'chatbot_message', labelKey: 'notifications_prefs.types.chatbot_message', descKey: 'notifications_prefs.types.chatbot_message_desc' },
  { type: 'system_alert', labelKey: 'notifications_prefs.types.system_alert', descKey: 'notifications_prefs.types.system_alert_desc' },
]

export const notificationPreferencesService = {
  getPreferences: async (userId: string): Promise<NotificationPreference[]> => {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('preference_type')
    if (error) throw error
    return (data ?? []) as NotificationPreference[]
  },

  updatePreference: async (
    userId: string,
    type: PreferenceType,
    settings: Partial<Pick<NotificationPreference, 'email_enabled' | 'in_app_enabled' | 'push_enabled'>>,
    companyId: string,
  ): Promise<NotificationPreference> => {
    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          company_id: companyId,
          preference_type: type,
          ...settings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,preference_type' },
      )
      .select()
      .single()
    if (error) throw error
    return data as NotificationPreference
  },

  initializeDefaultPreferences: async (userId: string, companyId: string): Promise<void> => {
    const types: PreferenceType[] = [
      'application_received', 'interview_scheduled', 'offer_sent',
      'document_reminder', 'onboarding_update', 'chatbot_message', 'system_alert',
    ]
    const rows = types.map((preference_type) => ({
      user_id: userId,
      company_id: companyId,
      preference_type,
      email_enabled: true,
      in_app_enabled: true,
      push_enabled: false,
    }))
    const { error } = await supabase
      .from('notification_preferences')
      .upsert(rows, { onConflict: 'user_id,preference_type', ignoreDuplicates: true })
    if (error) throw error
  },
}

import { supabase } from '../lib/supabase'

export interface Notification {
  id: string
  user_id: string
  company_id: string
  type: 'new_applicant' | 'status_change' | 'doc_expiry' | 'interview' | 'system'
  title: string
  message: string
  read: boolean
  link?: string
  created_at: string
}

const TYPE_MAP: Record<string, Notification['type']> = {
  new_applicant: 'new_applicant',
  status_change: 'status_change',
  doc_expiry: 'doc_expiry',
  interview: 'interview',
  system: 'system',
}

function mapRow(row: any): Notification {
  return {
    id: row.id,
    user_id: row.user_id,
    company_id: row.company_id ?? '',
    type: TYPE_MAP[row.notification_type] ?? TYPE_MAP[row.type] ?? 'system',
    title: row.title ?? '',
    message: row.message ?? '',
    read: row.is_read ?? row.read ?? false,
    link: row.action_url ?? row.link,
    created_at: row.created_at,
  }
}

export const notificationService = {
  getNotifications: async (userId: string, limit = 20) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []).map(mapRow) as Notification[]
  },

  getUnreadCount: async (userId: string) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .or('is_read.eq.false,read.eq.false')
    if (error) throw error
    return count ?? 0
  },

  markAsRead: async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read: true })
      .eq('id', notificationId)
    if (error) throw error
  },

  markAllAsRead: async (userId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read: true })
      .eq('user_id', userId)
      .or('is_read.eq.false,read.eq.false')
    if (error) throw error
  },

  subscribeToNotifications: (userId: string, callback: (notification: Notification) => void) => {
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        callback(mapRow(payload.new))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}

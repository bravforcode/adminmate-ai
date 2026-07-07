import { supabase } from '@/lib/supabase'

export interface DLQMessage {
  id: string
  queue_name: string
  message_id: string
  payload: Record<string, unknown>
  error_message: string
  retry_count: number
  status: 'pending' | 'retrying' | 'resolved' | 'abandoned'
  created_at: string
}

export const dlqService = {
  async getPendingMessages(queueName?: string): Promise<DLQMessage[]> {
    let query = supabase
      .from('dead_letter_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (queueName) {
      query = query.eq('queue_name', queueName)
    }

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as DLQMessage[]
  },

  async getStats(): Promise<{
    total: number
    byQueue: Record<string, number>
    byStatus: Record<string, number>
  }> {
    const { data, error } = await supabase
      .from('dead_letter_queue')
      .select('queue_name, status')

    if (error) throw error

    const rows = (data ?? []) as { queue_name: string; status: string }[]
    const byQueue: Record<string, number> = {}
    const byStatus: Record<string, number> = {}

    for (const row of rows) {
      byQueue[row.queue_name] = (byQueue[row.queue_name] ?? 0) + 1
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
    }

    return { total: rows.length, byQueue, byStatus }
  },

  async retryMessage(
    messageId: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error: fetchError } = await supabase
      .from('dead_letter_queue')
      .select('*')
      .eq('id', messageId)
      .single()

    if (fetchError) return { success: false, error: fetchError.message }
    if (!data) return { success: false, error: 'Message not found' }

    const msg = data as DLQMessage

    const { error: updateError } = await supabase
      .from('dead_letter_queue')
      .update({ status: 'retrying', retry_count: msg.retry_count + 1 })
      .eq('id', messageId)

    if (updateError) return { success: false, error: updateError.message }

    const { error: insertError } = await supabase
      .from(msg.queue_name)
      .insert(msg.payload)

    if (insertError) {
      await supabase
        .from('dead_letter_queue')
        .update({ status: 'pending' })
        .eq('id', messageId)
      return { success: false, error: insertError.message }
    }

    await supabase
      .from('dead_letter_queue')
      .update({ status: 'resolved' })
      .eq('id', messageId)

    return { success: true }
  },

  async abandonMessage(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('dead_letter_queue')
      .update({ status: 'abandoned' })
      .eq('id', messageId)

    if (error) throw error
  },

  async bulkAbandon(olderThanDays: number): Promise<number> {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - olderThanDays)
    const cutoffIso = cutoff.toISOString()

    const { data, error } = await supabase
      .from('dead_letter_queue')
      .update({ status: 'abandoned' })
      .lt('created_at', cutoffIso)
      .eq('status', 'pending')
      .select('id')

    if (error) throw error
    return (data ?? []).length
  },
}

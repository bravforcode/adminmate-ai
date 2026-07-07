import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface UseRealtimeOptions {
  table: string
  filter?: string
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  schema?: string
  onInsert?: (payload: unknown) => void
  onUpdate?: (payload: unknown) => void
  onDelete?: (payload: unknown) => void
  onChange?: (payload: unknown) => void
}

export function useRealtimeSubscription({
  table,
  filter,
  event = '*',
  schema = 'public',
  onInsert,
  onUpdate,
  onDelete,
  onChange,
}: UseRealtimeOptions) {
  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        'postgres_changes',
        { event, schema, table, filter },
        (payload) => {
          onChange?.(payload)
          if (payload.eventType === 'INSERT') onInsert?.(payload)
          if (payload.eventType === 'UPDATE') onUpdate?.(payload)
          if (payload.eventType === 'DELETE') onDelete?.(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, event, schema])
}

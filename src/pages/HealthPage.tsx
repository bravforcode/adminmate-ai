import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export default function HealthPage() {
  const { data: dbHealth, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await supabase.rpc('health_check')
      return data
    },
    refetchInterval: 30_000,
  })

  const { data: geminiUsage } = useQuery({
    queryKey: ['gemini-usage'],
    queryFn: async () => {
      const { data: profile } = await supabase.from('user_profiles').select('company_id').eq('id', (await supabase.auth.getUser()).data.user?.id).single()
      if (!profile) return null
      const { data } = await supabase.rpc('get_gemini_usage_today', { p_company_id: profile.company_id })
      return data || []
    },
  })

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-headline-md font-bold">System Health</h1>
      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <h3 className="font-semibold mb-4">Database</h3>
        {isLoading ? <p>Loading...</p> : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Status</span><span className="text-green-600 font-medium">Connected</span></div>
            <div className="flex justify-between"><span>DB Size</span><span>{dbHealth?.db_size_mb} MB</span></div>
            <div className="flex justify-between"><span>Active Connections</span><span>{dbHealth?.active_connections}</span></div>
          </div>
        )}
      </div>
      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <h3 className="font-semibold mb-4">Gemini AI Usage Today</h3>
        {geminiUsage?.length ? (
          <div className="space-y-2">{geminiUsage.map((u: any) => (
            <div key={u.feature} className="flex justify-between text-sm"><span>{u.feature}</span><span className="font-medium">{u.count} calls</span></div>
          ))}</div>
        ) : <p className="text-sm text-on-surface-variant">No AI usage today</p>}
      </div>
    </div>
  )
}

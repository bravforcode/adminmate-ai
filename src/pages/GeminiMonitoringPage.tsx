import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { AlertTriangle, Zap, Calendar } from 'lucide-react'

const DAILY_LIMIT = 1500
const LIMIT_COLORS: Record<string, string> = { jd_generation: '#3b82f6', resume_parse: '#8b5cf6', screening: '#f97316', chat: '#14b8a6', offer_letter: '#eab308' }

export default function GeminiMonitoringPage() {
  const company = useAuthStore(s => s.company)

  const { data: usage } = useQuery({
    queryKey: ['gemini-monitoring', company?.id],
    queryFn: async () => {
      const { data: daily } = await supabase.rpc('get_gemini_usage_today', { p_company_id: company?.id })
      const { data: weekly } = await supabase.from('ai_usage_log').select('feature, created_at').eq('company_id', company?.id).gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()).order('created_at')
      const { count: totalToday } = await supabase.from('ai_usage_log').select('*', { count: 'exact', head: true }).eq('company_id', company?.id).gte('created_at', new Date().toISOString().split('T')[0])
      return { daily: daily || [], weekly: weekly || [], totalToday: totalToday || 0 }
    },
    enabled: !!company?.id,
    refetchInterval: 30_000,
  })

  const todayTotal = usage?.totalToday || 0
  const usagePct = Math.round((todayTotal / DAILY_LIMIT) * 100)
  const alertLevel = usagePct > 90 ? 'danger' : usagePct > 70 ? 'warning' : 'ok'
  const alertStyles = { ok: 'text-green-600 bg-green-50', warning: 'text-yellow-600 bg-yellow-50', danger: 'text-red-600 bg-red-50' }

  const weeklyByDay: Record<string, any> = {}
  usage?.weekly?.forEach((u: any) => {
    const day = new Date(u.created_at).toISOString().split('T')[0]
    if (!weeklyByDay[day]) weeklyByDay[day] = { date: day }
    weeklyByDay[day][u.feature] = (weeklyByDay[day][u.feature] || 0) + 1
  })
  const weeklyData = Object.values(weeklyByDay).slice(-7)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-headline-md font-bold text-on-surface">Gemini AI Usage</h1>
        <p className="text-body-md text-on-surface-variant mt-1">Monitor AI API consumption across all features</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <div className="flex items-center gap-2 mb-3"><Zap size={20} className="text-primary" /><span className="text-sm font-semibold">Today</span></div>
          <p className="text-3xl font-bold text-on-surface">{todayTotal}</p>
          <p className="text-xs text-on-surface-variant mt-1">of {DAILY_LIMIT} daily limit</p>
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <span className="block text-sm font-semibold text-on-surface-variant mb-1">Usage</span>
          <div className="w-full bg-surface-container-high rounded-full h-3 mt-2">
            <div className={`h-3 rounded-full transition-all ${usagePct > 90 ? 'bg-error' : usagePct > 70 ? 'bg-yellow-500' : 'bg-primary'}`} style={{ width: `${Math.min(usagePct, 100)}%` }} />
          </div>
          <p className="text-right text-xs text-on-surface-variant mt-1">{usagePct}%</p>
        </div>
        <div className={`bg-surface rounded-xl border p-5 ${usagePct > 70 ? 'border-yellow-300' : 'border-outline-variant'}`}>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${alertStyles[alertLevel]}`}>
            <AlertTriangle size={12} />
            {alertLevel === 'ok' ? 'Normal' : alertLevel === 'warning' ? 'Monitor' : 'Critical'}
          </span>
          <p className="text-xs text-on-surface-variant mt-3">{alertLevel === 'danger' ? 'Approaching daily limit! Reduce AI calls.' : alertLevel === 'warning' ? 'Usage is elevated. Monitor closely.' : 'Usage within normal range.'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface rounded-xl border border-outline-variant p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Calendar size={16} /> Today by Feature</h3>
          {usage?.daily?.length ? (
            <div className="space-y-3">
              {usage.daily.map((u: any) => (
                <div key={u.feature}>
                  <div className="flex justify-between text-sm mb-1"><span>{u.feature.replace(/_/g, ' ')}</span><span className="font-medium">{u.count}</span></div>
                  <div className="w-full bg-surface-container-high rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: `${Math.min((u.count / DAILY_LIMIT) * 100 * 5, 100)}%`, backgroundColor: LIMIT_COLORS[u.feature] || '#94a3b8' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-on-surface-variant">No AI usage today</p>}
        </div>
        <div className="bg-surface rounded-xl border border-outline-variant p-6">
          <h3 className="font-semibold mb-4">Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="jd_generation" stackId="a" fill="#3b82f6" />
              <Bar dataKey="resume_parse" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="screening" stackId="a" fill="#f97316" />
              <Bar dataKey="chat" stackId="a" fill="#14b8a6" />
              <Bar dataKey="offer_letter" stackId="a" fill="#eab308" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

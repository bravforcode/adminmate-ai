import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { trackEdgeFunction, trackQuery } from '../lib/performance'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { LoadingState } from '../components/shared/LoadingState'

interface HealthSnapshot {
  status: 'ok' | 'error'
  timestamp: string
  db_size_mb?: number
  active_connections?: number
}

interface MetricsResponse {
  total_users?: number
  total_companies?: number
  total_jobs?: number
  total_candidates?: number
  recent_signups?: number
}

type CheckState = 'pending' | 'ok' | 'error' | 'unknown'

function formatTime(iso?: string) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString()
  } catch {
    // Invalid date string — fall back to raw value
    return iso
  }
}

function StatusDot({ state }: { state: CheckState }) {
  const colors: Record<CheckState, string> = {
    ok: 'bg-green-500',
    error: 'bg-red-500',
    pending: 'bg-amber-400 animate-pulse',
    unknown: 'bg-slate-300',
  }
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${colors[state]}`} />
}

function StatusRow({
  label,
  state,
  detail,
}: {
  label: string
  state: CheckState
  detail?: string
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-outline-variant last:border-b-0">
      <div className="flex items-center gap-3">
        <StatusDot state={state} />
        <span className="text-sm font-medium text-on-surface">{label}</span>
      </div>
      <span
        className={`text-sm ${
          state === 'ok'
            ? 'text-green-600 font-medium'
            : state === 'error'
              ? 'text-red-600 font-medium'
              : 'text-on-surface-variant'
        }`}
      >
        {detail}
      </span>
    </div>
  )
}

async function checkDatabase(): Promise<HealthSnapshot | null> {
  return trackQuery('health_check', ['health'], async () => {
    const { data, error } = await supabase.rpc('health_check')
    if (error) throw error
    return data as HealthSnapshot | null
  })
}

async function checkAuth(): Promise<CheckState> {
  try {
    const { error } = await supabase.auth.getSession()
    if (error) return 'error'
    return 'ok'
  } catch {
    // Auth check failure treated as error state — no logging needed for health probe
    return 'error'
  }
}

async function checkEdgeFunctions(): Promise<{ state: CheckState; detail?: string }> {
  try {
    const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/metrics`
    const session = await supabase.auth.getSession()
    const token = session.data.session?.access_token
    if (!token) return { state: 'unknown', detail: 'Not signed in' }

    return await trackEdgeFunction('metrics', async () => {
      const res = await fetch(fnUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
      })
      if (res.status === 401 || res.status === 403)
        return { state: 'error', detail: `HTTP ${res.status}` }
      if (!res.ok) return { state: 'error', detail: `HTTP ${res.status}` }
      return { state: 'ok', detail: 'Responding' }
    })
  } catch (err) {
    return {
      state: 'error',
      detail: err instanceof Error ? err.message : 'Unreachable',
    }
  }
}

async function checkStorage(): Promise<{ state: CheckState; detail?: string }> {
  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) return { state: 'error', detail: error.message }
    const count = (data ?? []).length
    return { state: 'ok', detail: `${count} bucket${count === 1 ? '' : 's'}` }
  } catch (err) {
    return {
      state: 'error',
      detail: err instanceof Error ? err.message : 'Unreachable',
    }
  }
}

export default function HealthPage() {
  const { t } = useTranslation(['health', 'common'])
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const dbQuery = useQuery({
    queryKey: ['health', 'db'],
    queryFn: checkDatabase,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  })

  const authQuery = useQuery({
    queryKey: ['health', 'auth'],
    queryFn: checkAuth,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  })

  const functionsQuery = useQuery({
    queryKey: ['health', 'functions'],
    queryFn: checkEdgeFunctions,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  })

  const storageQuery = useQuery({
    queryKey: ['health', 'storage'],
    queryFn: checkStorage,
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  })

  const metricsQuery = useQuery<MetricsResponse | null>({
    queryKey: ['health', 'metrics'],
    queryFn: async () => {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) return null
      return trackEdgeFunction('metrics', async () => {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/metrics`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
          },
        )
        if (!res.ok) return null
        return (await res.json()) as MetricsResponse
      })
    },
    refetchInterval: 30_000,
    refetchOnWindowFocus: false,
  })

  useEffect(() => {
    if (
      dbQuery.dataUpdatedAt ||
      authQuery.dataUpdatedAt ||
      functionsQuery.dataUpdatedAt ||
      storageQuery.dataUpdatedAt
    ) {
      setLastChecked(new Date())
    }
  }, [
    dbQuery.dataUpdatedAt,
    authQuery.dataUpdatedAt,
    functionsQuery.dataUpdatedAt,
    storageQuery.dataUpdatedAt,
  ])

  const dbState: CheckState = dbQuery.isLoading
    ? 'pending'
    : dbQuery.isError
      ? 'error'
      : dbQuery.data
        ? 'ok'
        : 'error'

  const authState: CheckState = authQuery.isLoading
    ? 'pending'
    : authQuery.data === 'ok'
      ? 'ok'
      : authQuery.data === 'error'
        ? 'error'
        : 'unknown'

  const functionsState: CheckState = functionsQuery.isLoading
    ? 'pending'
    : functionsQuery.data?.state ?? 'unknown'

  const storageState: CheckState = storageQuery.isLoading
    ? 'pending'
    : storageQuery.data?.state ?? 'unknown'

  const isAnyLoading =
    dbQuery.isLoading ||
    authQuery.isLoading ||
    functionsQuery.isLoading ||
    storageQuery.isLoading

  const handleRetryAll = () => {
    dbQuery.refetch()
    authQuery.refetch()
    functionsQuery.refetch()
    storageQuery.refetch()
  }

  const hasCriticalError = dbState === 'error' && dbQuery.isError

  if (hasCriticalError && !isAnyLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <header className="flex items-center justify-between">
          <h1 className="text-headline-md font-bold">{t('title')}</h1>
        </header>
        <div className="bg-surface rounded-xl border border-outline-variant p-8 text-center">
          <AlertCircle size={40} className="mx-auto text-error mb-3" />
          <h3 className="font-semibold text-on-surface mb-1">{t('error_title')}</h3>
          <p className="text-sm text-on-surface-variant mb-4">
            {(dbQuery.error as Error)?.message || t('error_description')}
          </p>
          <button
            onClick={handleRetryAll}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90"
          >
            <RefreshCw size={14} /> {t('common:errors.retry')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <header className="flex items-center justify-between">
        <h1 className="text-headline-md font-bold">{t('title')}</h1>
        <div className="text-xs text-on-surface-variant">
          {t('last_checked')}: <span className="font-medium">{formatTime(lastChecked?.toISOString())}</span>
        </div>
      </header>

      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{t('service_status')}</h3>
          {isAnyLoading ? (
            <span className="text-xs text-on-surface-variant">{t('refreshing')}</span>
          ) : null}
        </div>
        <StatusRow
          label={t('labels.database')}
          state={dbState}
          detail={
            dbState === 'pending' ? t('refreshing') :
            dbState === 'ok' ? t('labels.connected') :
            dbState === 'error' ? t('labels.error') :
            t('labels.unknown')
          }
        />
        <StatusRow
          label={t('labels.auth')}
          state={authState}
          detail={
            authState === 'pending' ? t('refreshing') :
            authState === 'ok' ? t('labels.operational') :
            authState === 'error' ? t('labels.degraded') :
            t('labels.unknown')
          }
        />
        <StatusRow
          label={t('labels.edge_functions')}
          state={functionsState}
          detail={functionsQuery.data?.detail}
        />
        <StatusRow
          label={t('labels.storage')}
          state={storageState}
          detail={storageQuery.data?.detail}
        />
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <h3 className="font-semibold mb-4">{t('labels.database')}</h3>
        {dbQuery.isLoading ? (
          <LoadingState variant="list" rows={3} message={t('common:loading')} />
        ) : dbQuery.isError ? (
          <div className="text-center py-4">
            <p className="text-sm text-red-600 mb-3">
              {(dbQuery.error as Error)?.message || t('error_title')}
            </p>
            <button
              onClick={() => dbQuery.refetch()}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-medium hover:opacity-90"
            >
              <RefreshCw size={12} /> {t('common:errors.retry')}
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>{t('labels.status')}</span>
              <span
                className={
                  dbQuery.data
                    ? 'text-green-600 font-medium'
                    : 'text-red-600 font-medium'
                }
              >
                {dbQuery.data ? t('labels.connected') : t('labels.error')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t('labels.db_size')}</span>
              <span>
                {dbQuery.data?.db_size_mb != null
                  ? `${dbQuery.data.db_size_mb} MB`
                  : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t('labels.active_connections')}</span>
              <span>{dbQuery.data?.active_connections ?? '—'}</span>
            </div>
          </div>
        )}
      </div>

      {metricsQuery.data ? (
        <div className="bg-surface rounded-xl border border-outline-variant p-6">
          <h3 className="font-semibold mb-4">{t('system_metrics')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between col-span-2 sm:col-span-1">
              <span>{t('metrics.total_users')}</span>
              <span className="font-medium">
                {metricsQuery.data.total_users ?? '—'}
              </span>
            </div>
            <div className="flex justify-between col-span-2 sm:col-span-1">
              <span>{t('metrics.total_companies')}</span>
              <span className="font-medium">
                {metricsQuery.data.total_companies ?? '—'}
              </span>
            </div>
            <div className="flex justify-between col-span-2 sm:col-span-1">
              <span>{t('metrics.total_jobs')}</span>
              <span className="font-medium">
                {metricsQuery.data.total_jobs ?? '—'}
              </span>
            </div>
            <div className="flex justify-between col-span-2 sm:col-span-1">
              <span>{t('metrics.total_candidates')}</span>
              <span className="font-medium">
                {metricsQuery.data.total_candidates ?? '—'}
              </span>
            </div>
            <div className="flex justify-between col-span-2">
              <span>{t('metrics.recent_signups')}</span>
              <span className="font-medium">
                {metricsQuery.data.recent_signups ?? '—'}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-on-surface-variant">
        {t('auto_refresh_note')}
      </p>
    </div>
  )
}

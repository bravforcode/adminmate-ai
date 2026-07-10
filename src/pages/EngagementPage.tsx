import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Heart, ThumbsUp, Star, MessageSquare, TrendingUp, Award } from 'lucide-react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/Button'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'

interface PulseSurvey {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  response_count: number
  avg_score: number
}

interface Recognition {
  id: string
  from_name: string
  to_name: string
  message: string
  category: string
  created_at: string
}

interface EnpsData {
  score: number
  respondents: number
  promoters: number
  passives: number
  detractors: number
  trend: number[]
}

const CATEGORY_ICONS: Record<string, typeof Star> = {
  teamwork: ThumbsUp,
  innovation: Star,
  leadership: Award,
  customer_focus: Heart,
}

export function EngagementPage() {
  const { t } = useTranslation(['engagement', 'common'])
  const company = useAuthStore(s => s.company)
  const [activeTab, setActiveTab] = useState<'surveys' | 'enps' | 'recognition' | 'culture'>('surveys')

  const { data: surveys = [], isLoading: surveysLoading, isError: surveysError, refetch: refetchSurveys } = useQuery({
    queryKey: ['pulse-surveys', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('pulse_surveys')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as PulseSurvey[]
    },
    enabled: !!company?.id,
  })

  const { data: recognitions = [], isLoading: recognitionsLoading, refetch: refetchRecognitions } = useQuery({
    queryKey: ['recognitions', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('recognitions')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return (data ?? []) as Recognition[]
    },
    enabled: !!company?.id,
  })

  const { data: enps, isLoading: enpsLoading, refetch: refetchEnps } = useQuery({
    queryKey: ['enps', company?.id],
    queryFn: async () => {
      if (!company?.id) return null
      const { data, error } = await supabase
        .from('enps_responses')
        .select('score')
        .eq('company_id', company.id)
      if (error) throw error
      const scores = (data ?? []) as { score: number }[]
      if (scores.length === 0) return null
      const promoters = scores.filter(s => s.score >= 9).length
      const detractors = scores.filter(s => s.score <= 6).length
      const total = scores.length
      const score = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0
      const trend = scores.slice(-7).map(s => s.score)
      return { score, respondents: total, promoters, passives: total - promoters - detractors, detractors, trend } as EnpsData
    },
    enabled: !!company?.id,
  })

  const isLoading = surveysLoading || recognitionsLoading || enpsLoading
  const isError = surveysError
  const refetch = () => { refetchSurveys(); refetchRecognitions(); refetchEnps() }

  if (isError) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('title', 'Employee Engagement')}</h1>
        </header>
        <ErrorState title={t('common:errors.load_failed')} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('title', 'Employee Engagement')}</h1>
          <p className="text-body-md text-ink-muted mt-1">{t('subtitle', 'Pulse surveys, eNPS, recognition, and culture metrics')}</p>
        </div>
      </header>

      <div className="flex gap-1 bg-surface rounded-full p-1 border border-border w-fit" role="tablist" aria-label={t('engagement.tabs_label', 'Engagement sections')}>
        {(['surveys', 'enps', 'recognition', 'culture'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-engagement-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-surface-sunken text-primary'
                : 'text-ink-muted hover:bg-surface-sunken'
            }`}
          >
            {t(`tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1).replace('_', ' '))}
          </button>
        ))}
      </div>

      {activeTab === 'surveys' && (
        <div id="tabpanel-engagement-surveys" role="tabpanel" aria-label={t('tabs.surveys', 'Surveys')} className="space-y-4">
          {surveysLoading ? (
            <LoadingState variant="cards" rows={3} />
          ) : surveys.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title={t('empty.surveys', 'No Pulse Surveys')}
              description={t('empty.surveys_desc', 'No pulse surveys have been created yet.')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {surveys.map(survey => (
                <Card key={survey.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant={survey.status === 'active' ? 'default' : 'secondary'}>
                        {t(`survey_status.${survey.status}`, survey.status)}
                      </Badge>
                      <span className="text-xs text-ink-muted">
                        {new Date(survey.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="text-base">{survey.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{survey.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-surface-sunken rounded-lg p-3">
                        <p className="text-ink-muted text-xs">{t('responses', 'Responses')}</p>
                        <p className="font-semibold text-ink">{survey.response_count}</p>
                      </div>
                      <div className="bg-surface-sunken rounded-lg p-3">
                        <p className="text-ink-muted text-xs">{t('avg_score', 'Avg Score')}</p>
                        <p className="font-semibold text-ink">{survey.avg_score.toFixed(1)}/10</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" fullWidth>{t('view_results', 'View Results')}</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'enps' && (
        <div id="tabpanel-engagement-enps" role="tabpanel" aria-label={t('tabs.enps', 'eNPS')} className="space-y-4">
          {enpsLoading ? (
            <LoadingState variant="cards" rows={1} />
          ) : !enps ? (
            <EmptyState
              icon={TrendingUp}
              title={t('empty.enps', 'No eNPS Data')}
              description={t('empty.enps_desc', 'eNPS data will appear once employees respond to surveys.')}
            />
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t('enps.title', 'Employee Net Promoter Score')}</CardTitle>
                  <CardDescription>{t('enps.description', 'How likely are employees to recommend this company?')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <p className={`text-6xl font-bold ${enps.score >= 0 ? 'text-success' : 'text-destructive'}`}>{enps.score}</p>
                    <p className="text-sm text-ink-muted mt-1">{t('enps.current_score', 'Current eNPS Score')}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-success-subtle/20 rounded-xl p-4">
                      <p className="text-2xl font-bold text-success">{enps.promoters}</p>
                      <p className="text-xs text-ink-muted">{t('enps.promoters', 'Promoters (9-10)')}</p>
                    </div>
                    <div className="bg-warning-subtle/20 rounded-xl p-4">
                      <p className="text-2xl font-bold text-warning">{enps.passives}</p>
                      <p className="text-xs text-ink-muted">{t('enps.passives', 'Passives (7-8)')}</p>
                    </div>
                    <div className="bg-destructive-subtle/20 rounded-xl p-4">
                      <p className="text-2xl font-bold text-destructive">{enps.detractors}</p>
                      <p className="text-xs text-ink-muted">{t('enps.detractors', 'Detractors (0-6)')}</p>
                    </div>
                  </div>
                  <div className="text-sm text-ink-muted text-center">
                    {t('enps.respondents', '{{count}} respondents', { count: enps.respondents })}
                  </div>
                </CardContent>
              </Card>
              {enps.trend.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">{t('enps.trend', 'Recent Trend')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-end gap-2 h-24">
                      {enps.trend.map((val, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] text-ink-muted">{val}</span>
                          <div
                            className={`w-full rounded-t ${val >= 9 ? 'bg-success' : val >= 7 ? 'bg-warning' : 'bg-error'}`}
                            style={{ height: `${(val / 10) * 80}px` }}
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'recognition' && (
        <div id="tabpanel-engagement-recognition" role="tabpanel" aria-label={t('tabs.recognition', 'Recognition')} className="space-y-4">
          {recognitionsLoading ? (
            <LoadingState variant="list" rows={4} />
          ) : recognitions.length === 0 ? (
            <EmptyState
              icon={Award}
              title={t('empty.recognition', 'No Recognitions Yet')}
              description={t('empty.recognition_desc', 'Start recognizing your colleagues for great work!')}
            />
          ) : (
            <div className="space-y-3">
              {recognitions.map(rec => {
                const Icon = CATEGORY_ICONS[rec.category] || Star
                return (
                  <Card key={rec.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                          <Icon size={18} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ink">
                            <span className="font-semibold">{rec.from_name}</span>
                            {' '}{t('recognized', 'recognized')}{' '}
                            <span className="font-semibold">{rec.to_name}</span>
                          </p>
                          <p className="text-sm text-ink-muted mt-1">{rec.message}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">{rec.category.replace('_', ' ')}</Badge>
                            <span className="text-xs text-ink-muted">{new Date(rec.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'culture' && (
        <div id="tabpanel-engagement-culture" role="tabpanel" aria-label={t('tabs.culture', 'Culture')} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('culture.title', 'Culture Metrics')}</CardTitle>
              <CardDescription>{t('culture.description', 'Key indicators of organizational health')}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <LoadingState variant="list" rows={4} />
              ) : (
                <div className="space-y-4">
                  {[
                    { label: t('culture.engagement_score', 'Engagement Score'), value: 'N/A', desc: t('culture.engagement_desc', 'Based on survey responses'), color: 'text-success' },
                    { label: t('culture.participation_rate', 'Survey Participation'), value: `${surveys.length > 0 ? Math.round(surveys.reduce((s, sv) => s + sv.response_count, 0) / Math.max(surveys.length, 1)) : 0}%`, desc: t('culture.participation_desc', 'Average response rate'), color: 'text-primary' },
                    { label: t('culture.recognition_rate', 'Recognition Rate'), value: `${recognitions.length}`, desc: t('culture.recognition_desc', 'Total recognitions this period'), color: 'text-ink-faint' },
                    { label: t('culture.nps_score', 'eNPS Score'), value: enps ? String(enps.score) : '-', desc: t('culture.nps_desc', 'Employee Net Promoter Score'), color: enps && enps.score >= 0 ? 'text-success' : 'text-destructive' },
                  ].map((metric, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-surface-sunken rounded-xl">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink">{metric.label}</p>
                        <p className="text-xs text-ink-muted mt-0.5">{metric.desc}</p>
                      </div>
                      <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default EngagementPage

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { Shield, Heart, Eye, Smile, Users, Calculator, CalendarDays } from 'lucide-react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/badge'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'

interface BenefitPlan {
  id: string
  name: string
  type: string
  provider: string
  monthly_premium: number
  employer_contribution: number
  description: string
  coverage_options: string[]
  created_at: string
}

interface Enrollment {
  id: string
  employee_id: string
  benefit_plan_id: string
  status: string
  coverage_level: string
  start_date: string
  end_date: string | null
  employee_contribution: number
  employer_contribution: number
}

const PLAN_ICONS: Record<string, typeof Heart> = {
  health: Shield,
  dental: Smile,
  vision: Eye,
  life: Heart,
}

export function BenefitsPage() {
  const { t } = useTranslation(['benefits', 'common'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const [activeTab, setActiveTab] = useState<'catalog' | 'enrollment' | 'calculator'>('catalog')
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)

  const { data: plans = [], isLoading: plansLoading, isError: plansError, refetch: refetchPlans } = useQuery({
    queryKey: ['benefit-plans', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('benefit_plans')
        .select('*')
        .eq('company_id', company.id)
        .order('name')
      if (error) throw error
      return (data ?? []) as BenefitPlan[]
    },
    enabled: !!company?.id,
  })

  const { data: enrollments = [], isLoading: enrollLoading } = useQuery({
    queryKey: ['benefit-enrollments', company?.id, profile?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('benefit_enrollments')
        .select('*')
        .eq('company_id', company.id)
        .eq('employee_id', profile?.id ?? '')
      if (error) throw error
      return (data ?? []) as Enrollment[]
    },
    enabled: !!company?.id && !!profile?.id,
  })

  const enrollmentsByPlan = useMemo(() => {
    const map: Record<string, Enrollment> = {}
    enrollments.forEach(e => { map[e.benefit_plan_id] = e })
    return map
  }, [enrollments])

  const isOpenEnrollment = useMemo(() => {
    const now = new Date()
    return plans.some(p => {
      const created = new Date(p.created_at)
      const deadline = new Date(created)
      deadline.setDate(deadline.getDate() + 30)
      return now >= created && now <= deadline
    })
  }, [plans])

  const totalEmployerCost = useMemo(
    () => enrollments.reduce((sum, e) => sum + e.employer_contribution, 0),
    [enrollments],
  )

  const totalEmployeeCost = useMemo(
    () => enrollments.reduce((sum, e) => sum + e.employee_contribution, 0),
    [enrollments],
  )

  if (plansError) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('title', 'Benefits')}</h1>
        </header>
        <ErrorState title={t('common:errors.load_failed')} onRetry={refetchPlans} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('title', 'Benefits')}</h1>
          <p className="text-body-md text-on-surface-variant mt-1">{t('subtitle', 'Manage your benefits plans and enrollments')}</p>
        </div>
        {isOpenEnrollment && (
          <Badge variant="default">{t('open_enrollment', 'Open Enrollment Active')}</Badge>
        )}
      </header>

      <div className="flex gap-1 bg-surface rounded-full p-1 border border-outline-variant w-fit">
        {(['catalog', 'enrollment', 'calculator'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-surface-container-low text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {t(`tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div className="space-y-4">
          {plansLoading ? (
            <LoadingState variant="cards" rows={3} />
          ) : plans.length === 0 ? (
            <EmptyState
              icon={Shield}
              title={t('empty.title', 'No Benefits Plans')}
              description={t('empty.description', 'No benefits plans have been configured yet.')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map(plan => {
                const Icon = PLAN_ICONS[plan.type] || Shield
                const enrollment = enrollmentsByPlan[plan.id]
                return (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all ${
                      selectedPlan === plan.id ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedPlan(selectedPlan === plan.id ? null : plan.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
                          <Icon size={20} className="text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                          <CardDescription>{plan.provider}</CardDescription>
                        </div>
                        {enrollment && (
                          <Badge variant="secondary" className="ml-auto">{t('enrolled', 'Enrolled')}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-on-surface-variant">{plan.description}</p>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-surface-container-low rounded-lg p-3">
                          <p className="text-on-surface-variant text-xs">{t('monthly_premium', 'Monthly Premium')}</p>
                          <p className="font-semibold text-on-surface">${plan.monthly_premium.toLocaleString()}</p>
                        </div>
                        <div className="bg-surface-container-low rounded-lg p-3">
                          <p className="text-on-surface-variant text-xs">{t('employer_contribution', 'Employer Pays')}</p>
                          <p className="font-semibold text-success">${plan.employer_contribution.toLocaleString()}</p>
                        </div>
                      </div>
                      {selectedPlan === plan.id && (
                        <div className="pt-3 border-t border-outline-variant">
                          <p className="text-xs font-medium text-on-surface-variant mb-2">{t('coverage_options', 'Coverage Options')}</p>
                          <div className="flex flex-wrap gap-2">
                            {plan.coverage_options.map(opt => (
                              <Badge key={opt} variant="outline">{opt}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'enrollment' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users size={20} className="text-primary" />
                <CardTitle>{t('enrollment.title', 'My Enrollments')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {enrollLoading ? (
                <LoadingState variant="list" rows={2} />
              ) : enrollments.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title={t('enrollment.empty', 'No Active Enrollments')}
                  description={t('enrollment.empty_desc', 'You are not currently enrolled in any benefits plans.')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
                    <thead>
                      <tr className="border-b border-outline-variant">
                        <th className="py-2 px-3 text-xs font-semibold uppercase text-on-surface-variant">{t('enrollment.plan', 'Plan')}</th>
                        <th className="py-2 px-3 text-xs font-semibold uppercase text-on-surface-variant">{t('enrollment.status', 'Status')}</th>
                        <th className="py-2 px-3 text-xs font-semibold uppercase text-on-surface-variant">{t('enrollment.coverage', 'Coverage')}</th>
                        <th className="py-2 px-3 text-xs font-semibold uppercase text-on-surface-variant text-right">{t('enrollment.your_cost', 'Your Cost')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {enrollments.map(enr => {
                        const plan = plans.find(p => p.id === enr.benefit_plan_id)
                        return (
                          <tr key={enr.id} className="border-b border-outline-variant/50 hover:bg-surface-container-high/50">
                            <td className="py-3 px-3 font-medium">{plan?.name || enr.benefit_plan_id}</td>
                            <td className="py-3 px-3">
                              <Badge variant={enr.status === 'active' ? 'default' : 'secondary'}>
                                {t(`status.${enr.status}`, enr.status)}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-on-surface-variant">{enr.coverage_level}</td>
                            <td className="py-3 px-3 text-right font-medium">${enr.employee_contribution.toLocaleString()}/mo</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'calculator' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Calculator size={20} className="text-primary" />
                <CardTitle>{t('calculator.title', 'Benefits Cost Summary')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-surface-container-low rounded-xl p-5 text-center">
                  <p className="text-xs text-on-surface-variant mb-1">{t('calculator.total_plans', 'Total Plans')}</p>
                  <p className="text-3xl font-bold text-on-surface">{plans.length}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-5 text-center">
                  <p className="text-xs text-on-surface-variant mb-1">{t('calculator.your_monthly', 'Your Monthly Cost')}</p>
                  <p className="text-3xl font-bold text-primary">${totalEmployeeCost.toLocaleString()}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-5 text-center">
                  <p className="text-xs text-on-surface-variant mb-1">{t('calculator.employer_monthly', 'Employer Monthly Cost')}</p>
                  <p className="text-3xl font-bold text-success">${totalEmployerCost.toLocaleString()}</p>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-on-surface-variant">{t('calculator.total_value', 'Total Benefits Value')}</span>
                  <span className="text-lg font-bold text-on-surface">${(totalEmployeeCost + totalEmployerCost).toLocaleString()}/mo</span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${totalEmployeeCost + totalEmployerCost > 0 ? Math.round((totalEmployerCost / (totalEmployeeCost + totalEmployerCost)) * 100) : 0}%` }}
                  />
                </div>
                <p className="text-xs text-on-surface-variant mt-1">{t('calculator.employer_pct', 'Employer covers')} {totalEmployeeCost + totalEmployerCost > 0 ? Math.round((totalEmployerCost / (totalEmployeeCost + totalEmployerCost)) * 100) : 0}%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

export default BenefitsPage

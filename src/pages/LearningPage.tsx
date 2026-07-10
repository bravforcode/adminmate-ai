import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'
import { BookOpen, GraduationCap, Award, Clock, CheckCircle } from 'lucide-react'
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '../components/ui/Card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/Button'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'

interface Course {
  id: string
  title: string
  description: string
  category: string
  duration_hours: number
  is_required: boolean
  instructor: string
  thumbnail_url: string | null
}

interface Enrollment {
  id: string
  course_id: string
  status: string
  progress: number
  enrolled_at: string
  completed_at: string | null
  certificate_url: string | null
}

const CATEGORY_COLORS: Record<string, string> = {
  'technical': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'leadership': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  'compliance': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  'soft-skills': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'safety': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
}

function ProgressRing({ progress, size = 36 }: { progress: number; size?: number }) {
  const radius = (size - 4) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="shrink-0" role="img" aria-label={`${progress}% complete`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" className="text-outline-variant/30" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#16a34a" strokeWidth={3} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="text-[9px] font-bold fill-on-surface">{progress}%</text>
    </svg>
  )
}

export function LearningPage() {
  const { t } = useTranslation(['learning', 'common'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const [activeTab, setActiveTab] = useState<'catalog' | 'enrolled' | 'certificates'>('catalog')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [requiredFilter, setRequiredFilter] = useState<'all' | 'required' | 'optional'>('all')

  const { data: courses = [], isLoading: coursesLoading, isError: coursesError, refetch: refetchCourses } = useQuery({
    queryKey: ['courses', company?.id],
    queryFn: async () => {
      if (!company?.id) return []
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('company_id', company.id)
        .order('title')
      if (error) throw error
      return (data ?? []) as Course[]
    },
    enabled: !!company?.id,
  })

  const { data: enrollments = [], isLoading: enrollLoading } = useQuery({
    queryKey: ['course-enrollments', company?.id, profile?.id],
    queryFn: async () => {
      if (!company?.id || !profile?.id) return []
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('*')
        .eq('company_id', company.id)
        .eq('employee_id', profile.id)
      if (error) throw error
      return (data ?? []) as Enrollment[]
    },
    enabled: !!company?.id && !!profile?.id,
  })

  const enrollmentsByCourse = useMemo(() => {
    const map: Record<string, Enrollment> = {}
    enrollments.forEach(e => { map[e.course_id] = e })
    return map
  }, [enrollments])

  const categories = useMemo(
    () => [...new Set(courses.map(c => c.category))].sort(),
    [courses],
  )

  const filteredCourses = useMemo(() => {
    let result = courses
    if (categoryFilter) result = result.filter(c => c.category === categoryFilter)
    if (requiredFilter === 'required') result = result.filter(c => c.is_required)
    if (requiredFilter === 'optional') result = result.filter(c => !c.is_required)
    return result
  }, [courses, categoryFilter, requiredFilter])

  const completedCount = enrollments.filter(e => e.status === 'completed').length
  const avgProgress = useMemo(() => {
    if (enrollments.length === 0) return 0
    return Math.round(enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length)
  }, [enrollments])

  if (coursesError) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('title', 'Learning & Development')}</h1>
        </header>
        <ErrorState title={t('common:errors.load_failed')} onRetry={refetchCourses} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background">{t('title', 'Learning & Development')}</h1>
          <p className="text-body-md text-ink-muted mt-1">{t('subtitle', 'Track courses, enrollments, and certifications')}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('stats.total_courses', 'Total Courses'), value: courses.length, icon: BookOpen, bg: 'bg-primary-container' },
          { label: t('stats.enrolled', 'Enrolled'), value: enrollments.length, icon: GraduationCap, bg: 'bg-surface-sunken' },
          { label: t('stats.completed', 'Completed'), value: completedCount, icon: CheckCircle, bg: 'bg-success-subtle' },
          { label: t('stats.avg_progress', 'Avg Progress'), value: `${avgProgress}%`, icon: Clock, bg: 'bg-warning-subtle' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-9 h-9 rounded-full ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={18} className="text-ink" />
              </div>
            </div>
            <p className="text-2xl font-bold text-ink">{stat.value}</p>
            <p className="text-xs text-ink-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-surface rounded-full p-1 border border-border w-fit" role="tablist" aria-label={t('learning.tabs_label', 'Learning sections')}>
        {(['catalog', 'enrolled', 'certificates'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`tabpanel-learning-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-surface-sunken text-primary'
                : 'text-ink-muted hover:bg-surface-sunken'
            }`}
          >
            {t(`tabs.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
          </button>
        ))}
      </div>

      {activeTab === 'catalog' && (
        <div id="tabpanel-learning-catalog" role="tabpanel" aria-label={t('tabs.catalog', 'Catalog')} className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              aria-label={t('filter.all_categories', 'All Categories')}
              className="px-3 py-2 rounded-xl border border-border bg-surface text-sm text-ink focus:border-primary"
            >
              <option value="">{t('filter.all_categories', 'All Categories')}</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <div className="flex gap-1 bg-surface rounded-full p-1 border border-border">
              {(['all', 'required', 'optional'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setRequiredFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    requiredFilter === f ? 'bg-surface-sunken text-primary' : 'text-ink-muted hover:bg-surface-sunken'
                  }`}
                >
                  {t(`filter.${f}`, f.charAt(0).toUpperCase() + f.slice(1))}
                </button>
              ))}
            </div>
          </div>

          {coursesLoading ? (
            <LoadingState variant="cards" rows={4} />
          ) : filteredCourses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={t('empty.courses', 'No Courses Found')}
              description={t('empty.courses_desc', 'No courses match your current filters.')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.map(course => {
                const enrollment = enrollmentsByCourse[course.id]
                const catColor = CATEGORY_COLORS[course.category] || 'bg-gray-100 text-gray-800'
                return (
                  <Card key={course.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <Badge className={catColor}>{course.category}</Badge>
                        {course.is_required && <Badge variant="destructive">{t('required', 'Required')}</Badge>}
                      </div>
                      <CardTitle className="text-base mt-2">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto space-y-3">
                      <div className="flex items-center justify-between text-xs text-ink-muted">
                        <span className="flex items-center gap-1"><Clock size={12} /> {course.duration_hours}h</span>
                        <span>{course.instructor}</span>
                      </div>
                      {enrollment ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <ProgressRing progress={enrollment.progress} />
                            <div className="flex-1">
                              <div className="w-full bg-surface-sunken rounded-full h-1.5">
                                <div className="bg-success h-1.5 rounded-full transition-all" style={{ width: `${enrollment.progress}%` }} />
                              </div>
                            </div>
                          </div>
                          <Badge variant={enrollment.status === 'completed' ? 'default' : 'secondary'}>
                            {t(`enrollment.${enrollment.status}`, enrollment.status)}
                          </Badge>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" fullWidth>{t('enroll', 'Enroll')}</Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'enrolled' && (
        <div id="tabpanel-learning-enrolled" role="tabpanel" aria-label={t('tabs.enrolled', 'Enrolled')} className="space-y-4">
          {enrollLoading ? (
            <LoadingState variant="list" rows={3} />
          ) : enrollments.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title={t('empty.enrolled', 'No Enrolled Courses')}
              description={t('empty.enrolled_desc', 'You are not currently enrolled in any courses.')}
            />
          ) : (
            <div className="space-y-3">
              {enrollments.map(enr => {
                const course = courses.find(c => c.id === enr.course_id)
                return (
                  <Card key={enr.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <ProgressRing progress={enr.progress} size={48} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink truncate">{course?.title || enr.course_id}</p>
                          <p className="text-xs text-ink-muted mt-0.5">
                            {t('enrolled_on', 'Enrolled')} {new Date(enr.enrolled_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant={enr.status === 'completed' ? 'default' : 'secondary'}>
                            {t(`status.${enr.status}`, enr.status)}
                          </Badge>
                          {enr.completed_at && (
                            <p className="text-xs text-ink-muted mt-1">{new Date(enr.completed_at).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                      {enr.status !== 'completed' && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-ink-muted mb-1">
                            <span>{t('progress', 'Progress')}</span>
                            <span>{enr.progress}%</span>
                          </div>
                          <div className="w-full bg-surface-sunken rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${enr.progress}%` }} />
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

      {activeTab === 'certificates' && (
        <div id="tabpanel-learning-certificates" role="tabpanel" aria-label={t('tabs.certificates', 'Certificates')} className="space-y-4">
          {enrollLoading ? (
            <LoadingState variant="list" rows={2} />
          ) : (
            (() => {
              const completed = enrollments.filter(e => e.status === 'completed')
              if (completed.length === 0) {
                return (
                  <EmptyState
                    icon={Award}
                    title={t('empty.certificates', 'No Certificates Yet')}
                    description={t('empty.certificates_desc', 'Complete courses to earn certificates.')}
                  />
                )
              }
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completed.map(enr => {
                    const course = courses.find(c => c.id === enr.course_id)
                    return (
                      <Card key={enr.id}>
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-warning-subtle flex items-center justify-center">
                              <Award size={24} className="text-ink" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-ink truncate">{course?.title || enr.course_id}</p>
                              <p className="text-xs text-ink-muted mt-0.5">
                                {t('completed_on', 'Completed')} {enr.completed_at ? new Date(enr.completed_at).toLocaleDateString() : '-'}
                              </p>
                            </div>
                            {enr.certificate_url && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={enr.certificate_url} target="_blank" rel="noopener noreferrer">
                                  {t('view_certificate', 'View')}
                                </a>
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )
            })()
          )}
        </div>
      )}
    </div>
  )
}

export default LearningPage

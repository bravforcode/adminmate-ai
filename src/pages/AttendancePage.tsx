import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { attendanceService, type AttendanceRecord, type AttendanceStatus } from '../services/attendance/attendanceService'
import { Clock, Calendar, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Timer } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card'
import { LoadingState } from '../components/shared/LoadingState'
import { EmptyState } from '../components/shared/EmptyState'
import { ErrorState } from '../components/shared/ErrorState'
import { cn } from '../lib/utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  half_day: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  holiday: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  leave: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

export function AttendancePage() {
  const { t } = useTranslation(['attendance', 'common'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const queryClient = useQueryClient()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | ''>('')

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay()

  const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

  const { data: recordsResult, isLoading, isError, refetch } = useQuery({
    queryKey: ['attendance', company?.id, dateFrom, dateTo, employeeFilter, statusFilter],
    queryFn: async () => {
      if (!company?.id) return { data: [], count: 0 }
      return attendanceService.getAttendanceRecords(company.id, {
        employee_id: employeeFilter || undefined,
        status: (statusFilter as AttendanceStatus) || undefined,
        date_from: dateFrom,
        date_to: dateTo,
        limit: 100,
      })
    },
    enabled: !!company?.id,
  })

  const records = recordsResult?.data ?? []

  const recordsByDate = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {}
    for (const r of records) {
      if (!map[r.work_date]) map[r.work_date] = []
      map[r.work_date].push(r)
    }
    return map
  }, [records])

  const stats = useMemo(() => {
    let totalHours = 0
    let overtime = 0
    let lateArrivals = 0
    let presentDays = 0
    for (const r of records) {
      if (r.hours_worked) totalHours += r.hours_worked
      overtime += r.overtime_hours
      if (r.status === 'late') lateArrivals++
      if (r.status === 'present' || r.status === 'late') presentDays++
    }
    return { totalHours: Math.round(totalHours * 10) / 10, overtime: Math.round(overtime * 10) / 10, lateArrivals, presentDays }
  }, [records])

  const checkInMutation = useMutation({
    mutationFn: () => {
      if (!company?.id || !profile?.id) throw new Error('Missing auth')
      return attendanceService.checkIn(company.id, profile.id, { employee_id: profile.id })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  })

  const checkOutMutation = useMutation({
    mutationFn: (recordId: string) => attendanceService.checkOut(recordId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['attendance'] }),
  })

  const todayRecord = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return records.find(r => r.work_date === today)
  }, [records])

  const daysInMonth = lastDay.getDate()
  const calendarDays: Array<{ day: number; date: string; isCurrentMonth: true }> = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarDays.push({ day: d, date: dateStr, isCurrentMonth: true })
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  if (isError) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background dark:text-on-surface">{t('title')}</h1>
        </header>
        <ErrorState title={t('common:errors.load_failed')} onRetry={refetch} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-headline-md md:text-headline-lg font-bold text-on-background dark:text-on-surface">{t('title')}</h1>
          <p className="text-body-md text-on-surface-variant dark:text-on-surface-variant mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {!todayRecord && (
            <Button
              variant="default"
              size="sm"
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              icon={<Clock size={16} />}
            >
              {checkInMutation.isPending ? t('clocking_in') : t('clock_in')}
            </Button>
          )}
          {todayRecord && !todayRecord.check_out && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkOutMutation.mutate(todayRecord.id)}
              disabled={checkOutMutation.isPending}
              icon={<Timer size={16} />}
            >
              {checkOutMutation.isPending ? t('clocking_out') : t('clock_out')}
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface dark:bg-surface rounded-xl p-5 border border-outline-variant dark:border-outline shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary-fixed dark:bg-primary-container flex items-center justify-center">
              <Clock size={18} className="text-primary dark:text-accent-dim" />
            </div>
            <span className="text-sm font-medium text-on-surface-variant dark:text-on-surface-variant">{t('stats.total_hours')}</span>
          </div>
          <p className="text-2xl font-bold text-on-background dark:text-on-surface">{stats.totalHours}h</p>
        </div>
        <div className="bg-surface dark:bg-surface rounded-xl p-5 border border-outline-variant dark:border-outline shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-tertiary-fixed dark:bg-tertiary-container flex items-center justify-center">
              <Timer size={18} className="text-tertiary dark:text-tertiary" />
            </div>
            <span className="text-sm font-medium text-on-surface-variant dark:text-on-surface-variant">{t('stats.overtime')}</span>
          </div>
          <p className="text-2xl font-bold text-on-background dark:text-on-surface">{stats.overtime}h</p>
        </div>
        <div className="bg-surface dark:bg-surface rounded-xl p-5 border border-outline-variant dark:border-outline shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-error-container dark:bg-error-container/30 flex items-center justify-center">
              <AlertTriangle size={18} className="text-error dark:text-error" />
            </div>
            <span className="text-sm font-medium text-on-surface-variant dark:text-on-surface-variant">{t('stats.late_arrivals')}</span>
          </div>
          <p className="text-2xl font-bold text-on-background dark:text-on-surface">{stats.lateArrivals}</p>
        </div>
        <div className="bg-surface dark:bg-surface rounded-xl p-5 border border-outline-variant dark:border-outline shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-secondary-fixed dark:bg-secondary-container flex items-center justify-center">
              <CheckCircle size={18} className="text-secondary dark:text-secondary" />
            </div>
            <span className="text-sm font-medium text-on-surface-variant dark:text-on-surface-variant">{t('stats.present_days')}</span>
          </div>
          <p className="text-2xl font-bold text-on-background dark:text-on-surface">{stats.presentDays}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <input
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value)}
          placeholder={t('filter_employee')}
          aria-label={t('filter_employee')}
          className="px-4 py-2 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm w-full sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AttendanceStatus | '')}
          aria-label={t('filter_all_statuses')}
          className="px-4 py-2 rounded-xl border border-outline-variant dark:border-outline bg-surface-container-lowest dark:bg-surface-container-lowest text-on-surface dark:text-on-surface focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all text-sm w-full sm:w-48"
        >
          <option value="">{t('filter_all_statuses')}</option>
          <option value="present">{t('status.present')}</option>
          <option value="absent">{t('status.absent')}</option>
          <option value="late">{t('status.late')}</option>
          <option value="half_day">{t('status.half_day')}</option>
          <option value="holiday">{t('status.holiday')}</option>
          <option value="leave">{t('status.leave')}</option>
        </select>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-surface-container-high dark:border-outline bg-surface-bright dark:bg-surface-container-low flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon_md" onClick={prevMonth} icon={<ChevronLeft size={18} />} aria-label={t('calendar.prev_month', 'Previous month')} />
            <CardTitle className="text-lg min-w-[160px] text-center">
              {currentDate.toLocaleString('en', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <Button variant="ghost" size="icon_md" onClick={nextMonth} icon={<ChevronRight size={18} />} aria-label={t('calendar.next_month', 'Next month')} />
          </div>
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {Object.entries(statusColors).map(([status, color]) => (
              <span key={status} className={cn('px-2 py-1 rounded-full font-medium whitespace-nowrap', color)}>
                {t(`status.${status}`)}
              </span>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <LoadingState variant="cards" rows={2} />
          ) : (
            <div className="grid grid-cols-7 border-b border-outline-variant dark:border-outline overflow-x-auto">
              {WEEKDAYS.map(day => (
                <div key={day} className="py-2 px-1 text-center text-[10px] sm:text-xs font-semibold text-on-surface-variant dark:text-on-surface-variant border-r border-outline-variant/50 dark:border-outline/50 last:border-r-0">
                  {t(`weekday.${day.toLowerCase()}`)}
                </div>
              ))}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="min-h-[60px] sm:min-h-[100px] border-r border-b border-outline-variant/50 dark:border-outline/50 last:border-r-0 bg-surface-container-lowest/50 dark:bg-surface-container/20" />
              ))}
              {calendarDays.map(({ day, date }) => {
                const dayRecords = recordsByDate[date] ?? []
                const isToday = date === new Date().toISOString().slice(0, 10)
                return (
                  <div
                    key={day}
                    className={cn(
                      'min-h-[60px] sm:min-h-[100px] p-1 sm:p-1.5 border-r border-b border-outline-variant/50 dark:border-outline/50 last:border-r-0 transition-colors hover:bg-surface-container-high/30 dark:hover:bg-surface-container/20',
                      isToday && 'bg-primary-fixed/20 dark:bg-primary/10'
                    )}
                  >
                    <span className={cn('text-[10px] sm:text-xs font-medium', isToday ? 'text-primary dark:text-accent-dim font-bold' : 'text-on-surface-variant dark:text-on-surface-variant')}>
                      {day}
                    </span>
                    <div className="mt-0.5 sm:mt-1 space-y-0.5">
                      {dayRecords.slice(0, 2).map(r => (
                        <div key={r.id} className={cn('text-[8px] sm:text-[10px] font-medium px-0.5 sm:px-1 py-0.5 rounded truncate', statusColors[r.status])}>
                          {r.check_in ? new Date(r.check_in).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : r.status}
                        </div>
                      ))}
                      {dayRecords.length > 2 && (
                        <span className="text-[8px] sm:text-[10px] text-on-surface-variant">+{dayRecords.length - 2}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-surface-container-high dark:border-outline bg-surface-bright dark:bg-surface-container-low">
          <CardTitle className="text-lg">{t('recent_records')}</CardTitle>
        </CardHeader>
        <div className="table-responsive overflow-x-auto -mx-6 px-6">
          <table role="table" className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="bg-surface-container dark:bg-surface-container/50 border-b border-outline-variant/50 dark:border-outline/50">
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('table.date')}</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('table.check_in')}</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('table.check_out')}</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('table.hours')}</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('table.status')}</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t('table.method')}</th>
              </tr>
            </thead>
            <tbody className="text-sm text-on-surface dark:text-on-surface">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-0">
                    <EmptyState icon={Calendar} title={t('empty.title')} description={t('empty.description')} />
                  </td>
                </tr>
              ) : (
                records.slice(0, 10).map(r => (
                  <tr key={r.id} className="border-b border-outline-variant/50 dark:border-outline/50 hover:bg-surface-container-high/50 dark:hover:bg-surface-container/30 transition-colors duration-150">
                    <td className="py-3 px-4 text-sm">{new Date(r.work_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-sm">{r.check_in ? new Date(r.check_in).toLocaleTimeString() : '-'}</td>
                    <td className="py-3 px-4 text-sm">{r.check_out ? new Date(r.check_out).toLocaleTimeString() : '-'}</td>
                    <td className="py-3 px-4 text-sm font-medium">{r.hours_worked ? `${r.hours_worked}h` : '-'}</td>
                    <td className="py-3 px-4">
                      <span className={cn('px-2 py-1 rounded text-xs font-semibold', statusColors[r.status])}>
                        {t(`status.${r.status}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-on-surface-variant capitalize">{r.method}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default AttendancePage

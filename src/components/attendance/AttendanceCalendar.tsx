import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../ui/Button'
import type { AttendanceRecord, AttendanceStatus } from '../../services/attendance/attendanceService'
import { cn } from '../../lib/utils'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const statusColors: Record<AttendanceStatus, string> = {
  present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  absent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  half_day: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  holiday: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  leave: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
}

interface AttendanceCalendarProps {
  records: AttendanceRecord[]
  onDateClick?: (date: string) => void
}

export function AttendanceCalendar({ records, onDateClick }: AttendanceCalendarProps) {
  const { t } = useTranslation(['attendance', 'common'])
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPadding = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const recordsByDate = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {}
    for (const r of records) {
      if (!map[r.work_date]) map[r.work_date] = []
      map[r.work_date].push(r)
    }
    return map
  }, [records])

  const calendarDays: Array<{ day: number; date: string }> = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    calendarDays.push({ day: d, date: dateStr })
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border bg-surface-raised dark:bg-surface-sunken">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon_md" onClick={prevMonth} icon={<ChevronLeft size={18} />} aria-label={t('calendar.prev_month', 'Previous month')} />
          <h3 className="text-lg font-semibold text-ink min-w-[160px] text-center">
            {currentDate.toLocaleString('en', { month: 'long', year: 'numeric' })}
          </h3>
          <Button variant="ghost" size="icon_md" onClick={nextMonth} icon={<ChevronRight size={18} />} aria-label={t('calendar.next_month', 'Next month')} />
        </div>
        <div className="flex items-center gap-2 text-xs flex-wrap">
          {Object.entries(statusColors).map(([status, color]) => (
            <span key={status} className={cn('px-2 py-1 rounded-full font-medium whitespace-nowrap', color)}>
              {t(`status.${status}`)}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7">
        {WEEKDAYS.map(day => (
          <div key={day} className="py-2 px-1 text-center text-[10px] sm:text-xs font-semibold text-ink-variant dark:text-ink-variant border-r border-b border-border/50 dark:border-border/50 last:border-r-0">
            {t(`weekday.${day.toLowerCase()}`)}
          </div>
        ))}
        {Array.from({ length: startPadding }).map((_, i) => (
          <div key={`pad-${i}`} className="min-h-[60px] sm:min-h-[80px] border-r border-b border-border/50 dark:border-border/50 last:border-r-0 bg-surface-sunken-lowest/50 dark:bg-surface-sunken/20" />
        ))}
        {calendarDays.map(({ day, date }) => {
          const dayRecords = recordsByDate[date] ?? []
          const isToday = date === today
          return (
            <button
              key={day}
              onClick={() => onDateClick?.(date)}
              className={cn(
                'min-h-[60px] sm:min-h-[80px] p-1 sm:p-1.5 border-r border-b border-border/50 dark:border-border/50 last:border-r-0 transition-colors hover:bg-surface-sunken/30 dark:hover:bg-surface-sunken/20 text-left w-full',
                isToday && 'bg-primary-fixed/20 dark:bg-primary/10'
              )}
            >
              <span className={cn('text-[10px] sm:text-xs font-medium', isToday ? 'text-primary dark:text-primary-muted font-bold' : 'text-ink-variant dark:text-ink-variant')}>
                {day}
              </span>
              <div className="mt-0.5 sm:mt-1 space-y-0.5">
                {dayRecords.slice(0, 2).map(r => (
                  <div key={r.id} className={cn('text-[8px] sm:text-[10px] font-medium px-0.5 sm:px-1 py-0.5 rounded truncate', statusColors[r.status])}>
                    {r.check_in ? new Date(r.check_in).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }) : r.status}
                  </div>
                ))}
                {dayRecords.length > 2 && (
                  <span className="text-[8px] sm:text-[10px] text-ink-variant">+{dayRecords.length - 2}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

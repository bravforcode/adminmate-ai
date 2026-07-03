import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../stores/authStore'
import { attendanceService, type AttendanceRecord } from '../../services/attendance/attendanceService'
import { Clock, Timer, MapPin, CheckCircle } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface CheckInOutProps {
  todayRecord?: AttendanceRecord
  onCheckIn?: () => void
  onCheckOut?: (recordId: string) => void
}

export function CheckInOut({ todayRecord, onCheckIn, onCheckOut }: CheckInOutProps) {
  const { t } = useTranslation(['attendance', 'common'])
  const company = useAuthStore(s => s.company)
  const profile = useAuthStore(s => s.profile)
  const queryClient = useQueryClient()

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const checkInMutation = useMutation({
    mutationFn: () => {
      if (!company?.id || !profile?.id) throw new Error('Missing auth')
      return attendanceService.checkIn(company.id, profile.id, {
        employee_id: profile.id,
        method: location ? 'gps' : 'manual',
        location_data: location ? { lat: location.lat, lng: location.lng } : undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      onCheckIn?.()
    },
  })

  const checkOutMutation = useMutation({
    mutationFn: (recordId: string) => attendanceService.checkOut(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      if (todayRecord) onCheckOut?.(todayRecord.id)
    },
  })

  const isCheckedIn = !!todayRecord
  const isCheckedOut = isCheckedIn && !!todayRecord.check_out

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation(null)
      )
    }
  }

  const checkedInTime = todayRecord?.check_in
    ? new Date(todayRecord.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const checkedOutTime = todayRecord?.check_out
    ? new Date(todayRecord.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const hoursWorked = todayRecord?.hours_worked
    ? `${todayRecord.hours_worked}h`
    : todayRecord?.check_in && todayRecord?.check_out
      ? (() => {
          const diff = new Date(todayRecord.check_out).getTime() - new Date(todayRecord.check_in).getTime()
          return `${Math.round((diff / (1000 * 60 * 60)) * 10) / 10}h`
        })()
      : null

  return (
    <div className="bg-surface dark:bg-surface rounded-xl border border-outline-variant dark:border-outline p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          isCheckedOut
            ? 'bg-success-container dark:bg-success-container/30'
            : isCheckedIn
              ? 'bg-primary-container dark:bg-primary-container/30'
              : 'bg-surface-container-high dark:bg-surface-container'
        )}>
          {isCheckedOut ? (
            <CheckCircle size={24} className="text-success dark:text-success" />
          ) : isCheckedIn ? (
            <Timer size={24} className="text-primary dark:text-accent-dim" />
          ) : (
            <Clock size={24} className="text-on-surface-variant dark:text-on-surface-variant" />
          )}
        </div>
        <div>
          <h3 className="text-title-sm font-semibold text-on-surface dark:text-on-surface">
            {isCheckedOut
              ? t('checkinout.checked_out')
              : isCheckedIn
                ? t('checkinout.working')
                : t('checkinout.not_checked_in')}
          </h3>
          {checkedInTime && (
            <p className="text-sm text-on-surface-variant dark:text-on-surface-variant">
              {t('checkinout.checked_in_at', { time: checkedInTime })}
              {checkedOutTime && ` · ${t('checkinout.checked_out_at', { time: checkedOutTime })}`}
              {hoursWorked && ` · ${hoursWorked}`}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        {!isCheckedIn && (
          <>
            <Button
              variant="default"
              size="sm"
              onClick={() => checkInMutation.mutate()}
              disabled={checkInMutation.isPending}
              icon={<Clock size={16} />}
              className="flex-1"
            >
              {checkInMutation.isPending ? t('checkinout.clocking_in') : t('checkinout.clock_in')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGetLocation}
              icon={<MapPin size={16} />}
            >
              {location ? t('checkinout.location_set') : t('checkinout.set_location')}
            </Button>
          </>
        )}
        {isCheckedIn && !isCheckedOut && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => checkOutMutation.mutate(todayRecord!.id)}
            disabled={checkOutMutation.isPending}
            icon={<Timer size={16} />}
            className="flex-1"
          >
            {checkOutMutation.isPending ? t('checkinout.clocking_out') : t('checkinout.clock_out')}
          </Button>
        )}
      </div>

      {location && (
        <p className="text-xs text-on-surface-variant dark:text-on-surface-variant mt-2 flex items-center gap-1">
          <MapPin size={12} />
          {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </p>
      )}
    </div>
  )
}

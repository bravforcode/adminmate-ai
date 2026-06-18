import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Interview } from '../../types/models'
import { calendarService } from '../../services/calendarService'
import { Download, ExternalLink, ChevronDown, Calendar } from 'lucide-react'

interface CalendarDropdownProps {
  interview: Interview
  compact?: boolean
}

export function CalendarDropdown({ interview, compact = false }: CalendarDropdownProps) {
  const { t } = useTranslation('calendar')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const handleDownloadIcs = () => {
    const ics = calendarService.generateInterviewCalendar(interview)
    const candidateName = interview.applications?.candidates?.full_name || 'interview'
    calendarService.downloadCalendarFile(ics, `interview-${candidateName}.ics`)
    setOpen(false)
  }

  const handleGoogleCalendar = () => {
    const url = calendarService.addToGoogleCalendarUrl(interview)
    window.open(url, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  const handleOutlook = () => {
    const url = calendarService.getOutlookWebUrl(interview)
    window.open(url, '_blank', 'noopener,noreferrer')
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-lg text-xs font-medium transition-colors ${
          compact
            ? 'px-2 py-1 text-on-surface-variant dark:text-on-surface-variant hover:text-primary dark:hover:text-accent-dim hover:bg-surface-container-low dark:hover:bg-surface-container-low'
            : 'px-3 py-1.5 border border-outline-variant dark:border-outline text-on-surface dark:text-on-surface hover:border-primary dark:hover:border-primary hover:bg-surface-container-low dark:hover:bg-surface-container-low'
        }`}
      >
        <Calendar size={compact ? 12 : 14} />
        {!compact && t('add_to_calendar')}
        <ChevronDown size={compact ? 10 : 12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-surface dark:bg-surface border border-outline-variant dark:border-outline rounded-xl shadow-lg py-1 min-w-[180px]">
          <button
            onClick={handleDownloadIcs}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface dark:text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container-low transition-colors"
          >
            <Download size={14} className="text-on-surface-variant dark:text-on-surface-variant" />
            {t('download_ics')}
          </button>
          <button
            onClick={handleGoogleCalendar}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface dark:text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container-low transition-colors"
          >
            <ExternalLink size={14} className="text-on-surface-variant dark:text-on-surface-variant" />
            {t('google_calendar')}
          </button>
          <button
            onClick={handleOutlook}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-on-surface dark:text-on-surface hover:bg-surface-container-low dark:hover:bg-surface-container-low transition-colors"
          >
            <ExternalLink size={14} className="text-on-surface-variant dark:text-on-surface-variant" />
            {t('outlook')}
          </button>
        </div>
      )}
    </div>
  )
}

export default CalendarDropdown

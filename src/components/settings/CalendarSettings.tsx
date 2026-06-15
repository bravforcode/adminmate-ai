import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { getCalendarSettings, saveCalendarSettings, CalendarSettings as CalSettings } from '../../services/calendarService'
import { Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const REMINDER_OPTIONS = [
  { value: 5, label: '5 min' },
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hr' },
  { value: 1440, label: '1 day' },
]

const FORMAT_OPTIONS = [
  { value: 'ics', label: 'iCal (.ics)' },
  { value: 'google', label: 'Google Calendar' },
  { value: 'outlook', label: 'Outlook' },
]

export function CalendarSettings() {
  const { t } = useTranslation('calendar')
  const [settings, setSettings] = useState<CalSettings>(getCalendarSettings())

  useEffect(() => {
    setSettings(getCalendarSettings())
  }, [])

  const handleReminderToggle = (minutes: number) => {
    setSettings(prev => {
      const current = prev.reminderMinutes || []
      const updated = current.includes(minutes)
        ? current.filter(m => m !== minutes)
        : [...current, minutes]
      return { ...prev, reminderMinutes: updated.length > 0 ? updated : [15] }
    })
  }

  const handleFormatChange = (format: CalSettings['defaultFormat']) => {
    setSettings(prev => ({ ...prev, defaultFormat: format }))
  }

  const handleSave = () => {
    saveCalendarSettings(settings)
    toast.success(t('settings_saved'))
  }

  return (
    <div className="bg-surface dark:bg-[#1e293b] rounded-xl border border-outline-variant dark:border-[#334155] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar size={20} className="text-primary dark:text-[#93c5fd]" />
        <h3 className="text-title-lg font-semibold text-on-surface dark:text-[#f1f5f9]">{t('settings_title')}</h3>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-on-surface dark:text-[#f1f5f9] mb-2">{t('reminder_time')}</label>
          <p className="text-xs text-on-surface-variant dark:text-[#94a3b8] mb-3">{t('reminder_time_desc')}</p>
          <div className="flex flex-wrap gap-2">
            {REMINDER_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleReminderToggle(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  settings.reminderMinutes.includes(opt.value)
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-low dark:bg-[#1e3a5f] text-on-surface dark:text-[#f1f5f9] border-outline-variant dark:border-[#334155] hover:border-primary dark:hover:border-[#3b82f6]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface dark:text-[#f1f5f9] mb-2">{t('default_format')}</label>
          <p className="text-xs text-on-surface-variant dark:text-[#94a3b8] mb-3">{t('default_format_desc')}</p>
          <div className="flex flex-wrap gap-2">
            {FORMAT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleFormatChange(opt.value as CalSettings['defaultFormat'])}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  settings.defaultFormat === opt.value
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container-low dark:bg-[#1e3a5f] text-on-surface dark:text-[#f1f5f9] border-outline-variant dark:border-[#334155] hover:border-primary dark:hover:border-[#3b82f6]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {t('save_settings')}
        </button>
      </div>
    </div>
  )
}

export default CalendarSettings

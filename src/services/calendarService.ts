import { Interview } from '../types/models'
import { interviewToICalEvent, generateICalFile } from '../utils/icalGenerator'

const CALENDAR_STORAGE_KEY = 'adminmate-calendar-settings'

export interface CalendarSettings {
  reminderMinutes: number[]
  defaultFormat: 'ics' | 'google' | 'outlook'
}

const defaultSettings: CalendarSettings = {
  reminderMinutes: [15],
  defaultFormat: 'ics',
}

export function getCalendarSettings(): CalendarSettings {
  try {
    const stored = localStorage.getItem(CALENDAR_STORAGE_KEY)
    if (stored) return { ...defaultSettings, ...JSON.parse(stored) }
  } catch { /* ignore */ }
  return defaultSettings
}

export function saveCalendarSettings(settings: CalendarSettings): void {
  localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(settings))
}

function formatDateForUrl(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return (
    date.getUTCFullYear().toString() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds())
  )
}

function getEventDetails(interview: Interview) {
  const start = new Date(interview.scheduled_at || new Date())
  const end = new Date(start.getTime() + (interview.duration_minutes || 60) * 60000)
  const candidateName = interview.applications?.candidates?.full_name || 'Candidate'
  const jobTitle = interview.applications?.jobs?.title || 'Position'
  const interviewType = interview.interview_type?.replace(/_/g, ' ') || 'Interview'
  const title = `${interviewType} - ${candidateName} (${jobTitle})`

  const details: string[] = [
    `Type: ${interviewType}`,
    `Interviewer: ${interview.interviewer_name || 'TBD'}`,
    `Position: ${jobTitle}`,
    `Candidate: ${candidateName}`,
  ]
  if (interview.meeting_link) {
    details.push(`Meeting: ${interview.meeting_link}`)
  }

  return { start, end, title, description: details.join('\n'), location: interview.location || '' }
}

export const calendarService = {
  generateInterviewCalendar(
    interview: Interview,
    reminderMinutes?: number[]
  ): string {
    const settings = getCalendarSettings()
    const event = interviewToICalEvent(interview, reminderMinutes || settings.reminderMinutes)
    return generateICalFile([event])
  },

  generateBulkCalendar(
    interviews: Interview[],
    reminderMinutes?: number[]
  ): string {
    const settings = getCalendarSettings()
    const events = interviews.map(iv =>
      interviewToICalEvent(iv, reminderMinutes || settings.reminderMinutes)
    )
    return generateICalFile(events)
  },

  downloadCalendarFile(icsString: string, filename: string): void {
    const blob = new Blob([icsString], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  addToGoogleCalendarUrl(interview: Interview): string {
    const { start, end, title, description, location } = getEventDetails(interview)
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: `${formatDateForUrl(start)}/${formatDateForUrl(end)}`,
      details: description,
      location: location,
    })
    return `https://calendar.google.com/calendar/render?${params.toString()}`
  },

  getOutlookWebUrl(interview: Interview): string {
    const { start, end, title, description, location } = getEventDetails(interview)
    const params = new URLSearchParams({
      path: '/calendar/action/compose',
      rru: 'addevent',
      subject: title,
      startdt: start.toISOString(),
      enddt: end.toISOString(),
      body: description,
      location: location,
    })
    return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
  },
}

import { Interview } from '../types/models'

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeICS(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function foldLine(line: string): string {
  const maxLen = 75
  if (line.length <= maxLen) return line
  let result = line.slice(0, maxLen)
  let remaining = line.slice(maxLen)
  while (remaining.length > 0) {
    result += '\r\n ' + remaining.slice(0, maxLen - 1)
    remaining = remaining.slice(maxLen - 1)
  }
  return result
}

function buildAttendeeBlock(email: string, name?: string): string {
  const cn = name ? `;CN=${escapeICS(name)}` : ''
  return `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION${cn}:mailto:${email}`
}

function buildAlarmBlock(minutes: number): string {
  return [
    'BEGIN:VALARM',
    'TRIGGER:-PT' + minutes + 'M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Interview reminder',
    'END:VALARM',
  ].join('\r\n')
}

function buildRecurrenceBlock(interval: number, frequency: string, count?: number): string {
  const parts = [`FREQ=${frequency}`, `INTERVAL=${interval}`]
  if (count) parts.push(`COUNT=${count}`)
  return 'RRULE:' + parts.join(';')
}

export interface ICalEventOptions {
  summary: string
  description?: string
  location?: string
  startAt: Date
  endAt: Date
  attendees?: { email: string; name?: string }[]
  reminderMinutes?: number[]
  uid?: string
  recurring?: { interval: number; frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY'; count?: number }
  timezone?: string
}

export function generateEvent(options: ICalEventOptions): string {
  const {
    summary,
    description = '',
    location,
    startAt,
    endAt,
    attendees = [],
    reminderMinutes = [15],
    uid = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}@adminmate.ai`,
    recurring,
  } = options

  const lines = [
    'BEGIN:VEVENT',
    foldLine(`UID:${uid}`),
    foldLine(`DTSTAMP:${formatICSDate(new Date())}`),
    foldLine(`DTSTART:${formatICSDate(startAt)}`),
    foldLine(`DTEND:${formatICSDate(endAt)}`),
    foldLine(`SUMMARY:${escapeICS(summary)}`),
  ]

  if (description) {
    lines.push(foldLine(`DESCRIPTION:${escapeICS(description)}`))
  }
  if (location) {
    lines.push(foldLine(`LOCATION:${escapeICS(location)}`))
  }

  for (const attendee of attendees) {
    lines.push(foldLine(buildAttendeeBlock(attendee.email, attendee.name)))
  }

  if (recurring) {
    lines.push(buildRecurrenceBlock(recurring.interval, recurring.frequency, recurring.count))
  }

  for (const mins of reminderMinutes) {
    lines.push(buildAlarmBlock(mins))
  }

  lines.push('END:VEVENT')
  return lines.join('\r\n')
}

export function generateICalFile(events: string[], prodId: string = 'AdminMate AI'): string {
  const parts = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    foldLine(`PRODID:-//${prodId}//EN`),
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  for (const event of events) {
    parts.push(event)
  }

  parts.push('END:VCALENDAR')
  return parts.join('\r\n') + '\r\n'
}

export function interviewToICalEvent(
  interview: Interview,
  reminderMinutes: number[] = [15]
): string {
  const start = new Date(interview.scheduled_at || new Date())
  const end = new Date(start.getTime() + (interview.duration_minutes || 60) * 60000)

  const candidateName = interview.applications?.candidates?.full_name || 'Candidate'
  const jobTitle = interview.applications?.jobs?.title || 'Position'
  const interviewType = interview.interview_type?.replace(/_/g, ' ') || 'Interview'

  const descriptionParts: string[] = [
    `Type: ${interviewType}`,
    `Interviewer: ${interview.interviewer_name || 'TBD'}`,
    `Position: ${jobTitle}`,
    `Candidate: ${candidateName}`,
  ]
  if (interview.meeting_link) {
    descriptionParts.push(`Meeting: ${interview.meeting_link}`)
  }

  return generateEvent({
    summary: `${interviewType} - ${candidateName} (${jobTitle})`,
    description: descriptionParts.join('\\n'),
    location: interview.location || interview.meeting_link || '',
    startAt: start,
    endAt: end,
    reminderMinutes,
    uid: `interview-${interview.id}@adminmate.ai`,
  })
}

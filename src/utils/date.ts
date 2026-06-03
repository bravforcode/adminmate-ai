import { format, addDays, addMonths, differenceInDays, parseISO } from 'date-fns'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'

export const TIMEZONES: Record<string, string> = {
  TH: 'Asia/Bangkok',
  VN: 'Asia/Ho_Chi_Minh',
  ID: 'Asia/Jakarta',
}

export function formatDateLocal(date: Date | string, fmt: string = 'dd/MM/yyyy', tz: string = 'Asia/Bangkok') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(toZonedTime(d, tz), fmt)
}

export function formatDateRange(start: Date | string, end: Date | string, tz: string = 'Asia/Bangkok') {
  const s = typeof start === 'string' ? parseISO(start) : start
  const e = typeof end === 'string' ? parseISO(end) : end
  return `${formatDateLocal(s, 'dd MMM yyyy', tz)} - ${formatDateLocal(e, 'dd MMM yyyy', tz)}`
}

export function daysBetween(a: Date | string, b: Date | string) {
  const d1 = typeof a === 'string' ? parseISO(a) : a
  const d2 = typeof b === 'string' ? parseISO(b) : b
  return differenceInDays(d2, d1)
}

export { addDays, addMonths, parseISO }

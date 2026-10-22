import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import { format, addMinutes, isAfter, isBefore, parseISO } from 'date-fns'

export const WAT_TIMEZONE = 'Africa/Lagos'

/**
 * Get current date/time in Africa/Lagos timezone
 */
export function nowInWAT(): Date {
  return toZonedTime(new Date(), WAT_TIMEZONE)
}

/**
 * Get today's date string in Africa/Lagos timezone (YYYY-MM-DD)
 */
export function todayInWAT(): string {
  return formatInTimeZone(new Date(), WAT_TIMEZONE, 'yyyy-MM-dd')
}

/**
 * Format a UTC date/timestamp for display in Africa/Lagos timezone
 */
export function formatWAT(date: Date | string, formatStr: string): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return formatInTimeZone(d, WAT_TIMEZONE, formatStr)
}

/**
 * Convert a local Africa/Lagos date+time to UTC Date
 */
export function watToUTC(dateStr: string, timeStr: string): Date {
  const localDateTimeStr = `${dateStr}T${timeStr}`
  return fromZonedTime(localDateTimeStr, WAT_TIMEZONE)
}

/**
 * Calculate the absence deadline (UTC) for a service occurrence
 * deadline = service end time + 2 hours, in Africa/Lagos
 */
export function calculateAbsenceDeadline(
  occurrenceDate: string,
  endTime: string,
  deadlineHours: number = 2
): Date {
  const endUTC = watToUTC(occurrenceDate, endTime)
  return addMinutes(endUTC, Math.round(deadlineHours * 60))
}

/**
 * Calculate accountability completion window
 * Window start = scheduled_start + duration_minutes
 * Window end = window_start + 60 minutes
 */
export function calculateCompletionWindow(
  accountabilityDate: string,
  startTime: string,
  durationMinutes: number
): { windowStart: Date; windowEnd: Date } {
  const scheduledStartUTC = watToUTC(accountabilityDate, startTime)
  const windowStart = addMinutes(scheduledStartUTC, durationMinutes)
  const windowEnd = addMinutes(windowStart, 60)
  return { windowStart, windowEnd }
}

/**
 * Check if the completion window is currently open
 */
export function isCompletionWindowOpen(
  windowStart: Date | string,
  windowEnd: Date | string
): boolean {
  const now = new Date()
  const start = typeof windowStart === 'string' ? parseISO(windowStart) : windowStart
  const end = typeof windowEnd === 'string' ? parseISO(windowEnd) : windowEnd
  return isAfter(now, start) && isBefore(now, end)
}

/**
 * Check if the completion window has expired
 */
export function isCompletionWindowExpired(windowEnd: Date | string): boolean {
  const now = new Date()
  const end = typeof windowEnd === 'string' ? parseISO(windowEnd) : windowEnd
  return isAfter(now, end)
}

/**
 * Get the service schedule for display
 */
export const SERVICE_SCHEDULE = [
  {
    type: 'tuesday',
    name: 'Tuesday Service',
    day: 'Tuesday',
    startTime: '5:00 PM',
    endTime: '6:30 PM',
    absenceDeadline: '8:30 PM',
  },
  {
    type: 'thursday',
    name: 'Thursday Meeting',
    day: 'Thursday',
    startTime: '4:00 PM',
    endTime: '6:00 PM',
    absenceDeadline: '8:00 PM',
  },
  {
    type: 'friday',
    name: 'Friday Service',
    day: 'Friday',
    startTime: '5:00 PM',
    endTime: '6:30 PM',
    absenceDeadline: '8:30 PM',
  },
  {
    type: 'sunday',
    name: 'Sunday Service',
    day: 'Sunday',
    startTime: '7:00 AM',
    endTime: '12:00 PM',
    absenceDeadline: '2:00 PM',
  },
] as const

/**
 * Format duration in minutes to human-readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours} hour${hours > 1 ? 's' : ''}`
  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`
}

/**
 * Format countdown to a target date
 */
export function formatCountdown(targetDate: Date | string): string {
  const target = typeof targetDate === 'string' ? parseISO(targetDate) : targetDate
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  
  if (diffMs <= 0) return '0:00'
  
  const totalSeconds = Math.floor(diffMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * Get upcoming dates for each service type
 */
export function getNextServiceDate(serviceType: string): Date {
  const dayMap: Record<string, number> = {
    tuesday: 2,
    thursday: 4,
    friday: 5,
    sunday: 0,
  }
  
  const targetDay = dayMap[serviceType]
  const now = nowInWAT()
  const currentDay = now.getDay()
  
  let daysUntil = targetDay - currentDay
  if (daysUntil <= 0) daysUntil += 7
  
  const nextDate = new Date(now)
  nextDate.setDate(now.getDate() + daysUntil)
  return nextDate
}

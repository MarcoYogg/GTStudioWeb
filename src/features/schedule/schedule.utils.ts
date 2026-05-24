import { getMonthLabel, getDaysInMonth, getMonthStartWeekday } from '../../lib/date/range';
import type { ScheduleEvent, AttendanceResponse } from '../../types';

/** Check if a date string matches today */
export function isToday(dateStr: string): boolean {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return dateStr === `${y}-${m}-${d}`;
}

/** Count 'yes' attendance for a given date */
export function countAttended(
  responses: AttendanceResponse[]
): number {
  return responses.filter((r) => r.response === 'yes').length;
}

/** Get events for a specific date from a list */
export function getEventsForDate(
  events: ScheduleEvent[],
  date: string
): ScheduleEvent[] {
  return events.filter((e) => e.date === date);
}

export { getMonthLabel, getDaysInMonth, getMonthStartWeekday };
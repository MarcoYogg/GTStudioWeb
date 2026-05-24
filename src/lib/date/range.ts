import { startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns';

/** Get all date strings (YYYY-MM-DD) in a given month */
export function getDaysInMonth(year: number, month: number): string[] {
  const start = startOfMonth(new Date(year, month));
  const end = endOfMonth(new Date(year, month));
  return eachDayOfInterval({ start, end }).map((d) => format(d, 'yyyy-MM-dd'));
}

/** Get the first day of month as weekday index (0=Sun) */
export function getMonthStartWeekday(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/** Get the number of days in a month */
export function getMonthLength(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Build a display label for a month */
export function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month);
  return format(date, 'yyyy 年 M 月');
}
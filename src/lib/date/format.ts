import { format, formatDistanceToNow } from 'date-fns';

/** Format a Date or timestamp to readable Chinese-style date */
export function formatDate(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(d, 'yyyy/MM/dd');
}

/** Format a Date to display time */
export function formatTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(d, 'HH:mm');
}

/** Format a Date to full datetime */
export function formatDateTime(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return format(d, 'yyyy/MM/dd HH:mm');
}

/** Human-readable relative time (e.g. "3 分鐘前") */
export function formatRelative(date: Date | string | number): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}
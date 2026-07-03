import { addDays, format, parseISO } from 'date-fns';

/** 'yyyy-MM-dd' → 'MMM d, yyyy' for display; passthrough on parse failure. */
export function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

/** Today as 'yyyy-MM-dd'. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

/** issueDate ('yyyy-MM-dd') + n days → 'yyyy-MM-dd'. */
export function addDaysISO(iso: string, days: number): string {
  try {
    return format(addDays(parseISO(iso), days), 'yyyy-MM-dd');
  } catch {
    return iso;
  }
}

/** True when an ISO date is strictly before today (ISO strings sort chronologically). */
export function isPastDue(iso: string): boolean {
  return iso < todayISO();
}

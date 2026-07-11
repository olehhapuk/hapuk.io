import { addDays, format, parseISO } from 'date-fns';
import { enUS, uk } from 'date-fns/locale';
import type { Locale } from '@/lib/i18n';

const dateFnsLocale = { en: enUS, uk } as const;

/**
 * 'yyyy-MM-dd' → localized display date; passthrough on parse failure.
 * English keeps 'MMM d, yyyy' (e.g. "Jul 11, 2026"); other languages use their
 * conventional order (e.g. Ukrainian "11 лип. 2026 р.").
 */
export function formatDate(iso: string, locale: Locale = 'en'): string {
  try {
    const pattern = locale === 'en' ? 'MMM d, yyyy' : 'd MMM yyyy';
    return format(parseISO(iso), pattern, { locale: dateFnsLocale[locale] });
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

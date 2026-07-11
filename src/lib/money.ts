/**
 * Money helpers. Amounts are stored as `numeric(12,2)` strings in Postgres and
 * handled as integer cents in app code — never as JS floats (see README data model).
 */

import { intlLocale, type Locale } from '@/lib/i18n';

/** Parse a "100" / "100.50" string to integer cents. Non-numeric => 0. */
export function toCents(value: string | null | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/** Format integer cents back to a "0.00" numeric string for storage. */
export function centsToString(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Line total in cents = qty × rate. qty may be fractional (e.g. hours); rate is
 * money. Multiplying qty by integer rate-cents and rounding keeps it exact to the
 * cent without float drift accumulating across a sum.
 */
export function lineTotalCents(qty: string, rate: string): number {
  const qtyNum = Number(qty);
  if (!Number.isFinite(qtyNum)) return 0;
  return Math.round(qtyNum * toCents(rate));
}

/**
 * Human-facing currency formatting; falls back gracefully for odd codes.
 * `locale` controls grouping/decimal separators and symbol placement (default English).
 */
export function formatMoney(
  value: string | number | null | undefined,
  currency: string,
  locale: Locale = 'en',
): string {
  const num = typeof value === 'string' ? Number(value) : (value ?? 0);
  const safe = Number.isFinite(num) ? (num as number) : 0;
  try {
    return new Intl.NumberFormat(intlLocale[locale], {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(safe);
  } catch {
    return `${currency.toUpperCase()} ${safe.toFixed(2)}`;
  }
}

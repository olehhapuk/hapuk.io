/**
 * Supported invoice/document languages. Set per project and snapshotted onto each
 * invoice at creation, so a project's language drives its invoice output while
 * historical invoices stay stable if the project language later changes.
 *
 * Keep this list in sync with the `locale` pgEnum in src/server/db/schema/app.ts.
 */
export const locales = ['en', 'uk'] as const;
export type Locale = (typeof locales)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Human-facing language names (shown in the project form), in the language itself. */
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  uk: 'Українська',
};

/** BCP-47 tags for Intl formatting (money, dates). */
export const intlLocale: Record<Locale, string> = {
  en: 'en-US',
  uk: 'uk-UA',
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

/** Narrow an untrusted string to a supported Locale, falling back to the default. */
export function toLocale(value: string | null | undefined): Locale {
  return value && isLocale(value) ? value : DEFAULT_LOCALE;
}

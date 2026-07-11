import { and, eq } from 'drizzle-orm';

import { db, schema } from '@/server/db';
import type { Locale } from '@/lib/i18n';

export type OrgLocaleRow = typeof schema.organizationLocale.$inferSelect;

/** All per-language receiver overrides for an org, keyed by locale. */
export async function getOrgLocaleOverrides(
  organizationId: string,
): Promise<Partial<Record<Locale, OrgLocaleRow>>> {
  const rows = await db
    .select()
    .from(schema.organizationLocale)
    .where(eq(schema.organizationLocale.organizationId, organizationId));

  const map: Partial<Record<Locale, OrgLocaleRow>> = {};
  for (const row of rows) map[row.locale] = row;
  return map;
}

/** A single language's override for an org, or null if none has been set. */
export async function getOrgLocaleOverride(
  organizationId: string,
  locale: Locale,
): Promise<OrgLocaleRow | null> {
  const [row] = await db
    .select()
    .from(schema.organizationLocale)
    .where(
      and(
        eq(schema.organizationLocale.organizationId, organizationId),
        eq(schema.organizationLocale.locale, locale),
      ),
    )
    .limit(1);
  return row ?? null;
}

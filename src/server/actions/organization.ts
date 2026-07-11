'use server';

import { revalidatePath } from 'next/cache';

import { db, schema } from '@/server/db';
import { assertRole, requireOrgContext } from '@/server/db/queries/context';
import {
  orgLocaleSchema,
  type OrgLocaleInput,
} from '@/lib/validations/organization';
import { isLocale, type Locale } from '@/lib/i18n';

const MANAGE_ROLES = ['owner', 'admin'];

type ActionResult = { error?: string };

/** '' | undefined => null, otherwise the trimmed value. */
function emptyToNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/**
 * Upserts an organization's receiver/signature details for one language. The base
 * `organization` columns hold the default-language values; this stores overrides for
 * another language. New invoices in a project of that language prefill from here.
 */
export async function updateOrgLocale(
  locale: Locale,
  input: OrgLocaleInput,
): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  if (!isLocale(locale)) return { error: 'Unsupported language.' };

  const parsed = orgLocaleSchema.safeParse(input);
  if (!parsed.success) return { error: 'Please check the form and try again.' };
  const v = parsed.data;

  const values = {
    receiverName: emptyToNull(v.receiverName),
    receiverAddress: emptyToNull(v.receiverAddress),
    signatureLabel: emptyToNull(v.signatureLabel),
  };

  await db
    .insert(schema.organizationLocale)
    .values({ organizationId: ctx.organizationId, locale, ...values })
    .onConflictDoUpdate({
      target: [
        schema.organizationLocale.organizationId,
        schema.organizationLocale.locale,
      ],
      set: { ...values, updatedAt: new Date() },
    });

  revalidatePath('/organization/settings');
  return {};
}

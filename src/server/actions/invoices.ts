'use server';

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db, schema } from '@/server/db';
import { assertRole, requireOrgContext } from '@/server/db/queries/context';
import { getActiveOrganization } from '@/server/auth/org';
import {
  invoiceNumberSchema,
  invoiceSchema,
  settleableStatuses,
  type InvoiceInput,
  type SettleableStatus,
} from '@/lib/validations/invoice';
import type { SignatureSnapshot } from '@/server/db/schema/app';
import { centsToString, lineTotalCents } from '@/lib/money';

const MANAGE_ROLES = ['owner', 'admin'];
const TEMPLATE_KEY = 'classic';

type ActionResult = { error?: string };
type CreateInvoiceResult = ActionResult & { invoiceId?: string };

function emptyToNull(value: string | undefined): string | null {
  const v = value?.trim();
  return v ? v : null;
}

/** Build party snapshot + notes + priced line items from validated input. */
function buildInvoiceData(v: InvoiceInput) {
  const items = v.items.map((item, index) => {
    const cents = lineTotalCents(item.qty, item.rate);
    return {
      serviceId: item.serviceId ? item.serviceId : null,
      description: item.description.trim(),
      qty: item.qty,
      rate: item.rate,
      lineTotal: centsToString(cents),
      position: index,
      cents,
    };
  });
  const subtotalCents = items.reduce((sum, i) => sum + i.cents, 0);
  const subtotal = centsToString(subtotalCents);

  return {
    fields: {
      issueDate: v.issueDate,
      dueDate: v.dueDate,
      currency: v.currency.toUpperCase(),
      notes: emptyToNull(v.notes),
      subtotal,
      total: subtotal, // v1: no tax; total === subtotal
      senderSnapshot: {
        name: v.senderName.trim(),
        address: emptyToNull(v.senderAddress) ?? undefined,
        taxId: emptyToNull(v.senderTaxId) ?? undefined,
        phone: emptyToNull(v.senderPhone) ?? undefined,
        email: emptyToNull(v.senderEmail) ?? undefined,
      },
      receiverSnapshot: {
        name: v.receiverName.trim(),
        address: emptyToNull(v.receiverAddress) ?? undefined,
        taxId: emptyToNull(v.receiverTaxId) ?? undefined,
        phone: emptyToNull(v.receiverPhone) ?? undefined,
        email: emptyToNull(v.receiverEmail) ?? undefined,
      },
    },
    items,
  };
}

/** Creates a draft invoice (no number) for a project in the active org. */
export async function createInvoice(
  projectId: string,
  input: InvoiceInput,
): Promise<CreateInvoiceResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: 'Please check the form and try again.' };

  // Project must belong to the active org.
  const [project] = await db
    .select({ id: schema.project.id })
    .from(schema.project)
    .where(
      and(
        eq(schema.project.id, projectId),
        eq(schema.project.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);
  if (!project) return { error: 'Project not found.' };

  const { fields, items } = buildInvoiceData(parsed.data);

  const invoiceId = await db.transaction(async (tx) => {
    const [inv] = await tx
      .insert(schema.invoice)
      .values({
        organizationId: ctx.organizationId,
        projectId,
        status: 'draft',
        templateKey: TEMPLATE_KEY,
        ...fields,
      })
      .returning({ id: schema.invoice.id });

    await tx.insert(schema.invoiceItem).values(
      items.map((i) => ({
        invoiceId: inv.id,
        serviceId: i.serviceId,
        description: i.description,
        qty: i.qty,
        rate: i.rate,
        lineTotal: i.lineTotal,
        position: i.position,
      })),
    );
    return inv.id;
  });

  revalidatePath('/invoices');
  return { invoiceId };
}

/** Updates a DRAFT invoice's data and replaces its line items. */
export async function updateInvoice(
  id: string,
  input: InvoiceInput,
): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const parsed = invoiceSchema.safeParse(input);
  if (!parsed.success) return { error: 'Please check the form and try again.' };

  const [existing] = await db
    .select({ id: schema.invoice.id, status: schema.invoice.status })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.id, id),
        eq(schema.invoice.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);
  if (!existing) return { error: 'Invoice not found.' };
  if (existing.status !== 'draft') {
    return { error: 'Only draft invoices can be edited.' };
  }

  const { fields, items } = buildInvoiceData(parsed.data);

  await db.transaction(async (tx) => {
    await tx
      .update(schema.invoice)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(schema.invoice.id, id));

    await tx
      .delete(schema.invoiceItem)
      .where(eq(schema.invoiceItem.invoiceId, id));

    await tx.insert(schema.invoiceItem).values(
      items.map((i) => ({
        invoiceId: id,
        serviceId: i.serviceId,
        description: i.description,
        qty: i.qty,
        rate: i.rate,
        lineTotal: i.lineTotal,
        position: i.position,
      })),
    );
  });

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  return {};
}

/**
 * Finalizes a draft: allocates the per-project number inside a transaction (the
 * project-row UPDATE ... RETURNING locks the row against concurrent finalizes),
 * moves it to `waiting`, and snapshots the org signature. See README numbering.
 */
export async function finalizeInvoice(id: string): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const [existing] = await db
    .select({
      id: schema.invoice.id,
      status: schema.invoice.status,
      projectId: schema.invoice.projectId,
    })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.id, id),
        eq(schema.invoice.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);
  if (!existing) return { error: 'Invoice not found.' };
  if (existing.status !== 'draft') {
    return { error: 'This invoice is already finalized.' };
  }

  // Snapshot the org's current signature at finalize time.
  const org = (await getActiveOrganization()) as
    | ({ signatureImageUrl?: string | null; signatureLabel?: string | null })
    | null;
  const signatureSnapshot: SignatureSnapshot | null = org?.signatureImageUrl
    ? {
        imageUrl: org.signatureImageUrl,
        label: org.signatureLabel ?? undefined,
      }
    : null;

  try {
    await db.transaction(async (tx) => {
      const [proj] = await tx
        .update(schema.project)
        .set({ invoiceCounter: sql`${schema.project.invoiceCounter} + 1` })
        .where(
          and(
            eq(schema.project.id, existing.projectId),
            eq(schema.project.organizationId, ctx.organizationId),
          ),
        )
        .returning({ counter: schema.project.invoiceCounter });
      if (!proj) throw new Error('Project not found.');

      const [inv] = await tx
        .update(schema.invoice)
        .set({
          number: proj.counter,
          status: 'waiting',
          finalizedAt: new Date(),
          signatureSnapshot,
          updatedAt: new Date(),
        })
        .where(
          and(eq(schema.invoice.id, id), eq(schema.invoice.status, 'draft')),
        )
        .returning({ id: schema.invoice.id });
      if (!inv) throw new Error('This invoice is already finalized.');
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not finalize.' };
  }

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  return {};
}

/**
 * Changes a finalized invoice's number. Drafts have no number yet (they get one at
 * finalize), so this only applies once finalized. The new number must be unique within
 * the project; the project counter is bumped so future auto-numbering stays ahead of it.
 */
export async function setInvoiceNumber(
  id: string,
  input: number,
): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const parsed = invoiceNumberSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter a valid number.' };
  }
  const number = parsed.data;

  const [existing] = await db
    .select({
      id: schema.invoice.id,
      status: schema.invoice.status,
      projectId: schema.invoice.projectId,
      number: schema.invoice.number,
    })
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.id, id),
        eq(schema.invoice.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);
  if (!existing) return { error: 'Invoice not found.' };
  if (existing.status === 'draft') {
    return { error: 'Draft invoices are numbered when you finalize them.' };
  }
  if (existing.number === number) return {}; // no-op

  try {
    await db.transaction(async (tx) => {
      const [clash] = await tx
        .select({ id: schema.invoice.id })
        .from(schema.invoice)
        .where(
          and(
            eq(schema.invoice.projectId, existing.projectId),
            eq(schema.invoice.number, number),
          ),
        )
        .limit(1);
      if (clash && clash.id !== id) {
        throw new Error(`Invoice #${number} already exists in this project.`);
      }

      await tx
        .update(schema.invoice)
        .set({ number, updatedAt: new Date() })
        .where(eq(schema.invoice.id, id));

      // Keep the per-project counter at or above the highest number in use so a later
      // finalize never auto-assigns a number that collides with this manual one.
      await tx
        .update(schema.project)
        .set({
          invoiceCounter: sql`greatest(${schema.project.invoiceCounter}, ${number})`,
        })
        .where(
          and(
            eq(schema.project.id, existing.projectId),
            eq(schema.project.organizationId, ctx.organizationId),
          ),
        );
    });
  } catch (e) {
    // Unique-index race (two concurrent renumbers to the same value).
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === '23505'
    ) {
      return { error: `Invoice #${number} already exists in this project.` };
    }
    return {
      error: e instanceof Error ? e.message : 'Could not update the number.',
    };
  }

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  return {};
}

/** Manual status change among waiting/paid/unpaid (never back to draft). */
export async function setInvoiceStatus(
  id: string,
  status: SettleableStatus,
): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  if (!settleableStatuses.includes(status)) {
    return { error: 'Invalid status.' };
  }

  const updated = await db
    .update(schema.invoice)
    .set({ status, updatedAt: new Date() })
    .where(
      and(
        eq(schema.invoice.id, id),
        eq(schema.invoice.organizationId, ctx.organizationId),
        // draft invoices must go through finalize, not a direct status set
        sql`${schema.invoice.status} <> 'draft'`,
      ),
    )
    .returning({ id: schema.invoice.id });

  if (updated.length === 0) {
    return { error: 'Invoice not found or still a draft.' };
  }

  revalidatePath('/invoices');
  revalidatePath(`/invoices/${id}`);
  return {};
}

export async function deleteInvoice(id: string): Promise<ActionResult> {
  const ctx = await requireOrgContext();
  assertRole(ctx, MANAGE_ROLES);

  const deleted = await db
    .delete(schema.invoice)
    .where(
      and(
        eq(schema.invoice.id, id),
        eq(schema.invoice.organizationId, ctx.organizationId),
      ),
    )
    .returning({ id: schema.invoice.id });

  if (deleted.length === 0) return { error: 'Invoice not found.' };

  revalidatePath('/invoices');
  return {};
}

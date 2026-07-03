import { and, asc, desc, eq, ilike, or } from 'drizzle-orm';
import { db, schema } from '@/server/db';
import { requireOrgContext } from './context';

/**
 * Org-scoped reads for invoices. Every query filters by the active organization.
 */

export type InvoiceRow = typeof schema.invoice.$inferSelect;
export type InvoiceItemRow = typeof schema.invoiceItem.$inferSelect;
export type InvoiceStatus = (typeof schema.invoiceStatus.enumValues)[number];

export type InvoiceListRow = {
  id: string;
  number: number | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: string;
  createdAt: Date;
  projectId: string;
  projectName: string;
};

/**
 * Invoices in the active org, newest first. Optionally filtered by status and/or a
 * free-text query `q` (matches project name, or an exact invoice number), and limited.
 */
export async function listInvoices(opts?: {
  status?: InvoiceStatus;
  q?: string;
  limit?: number;
}): Promise<InvoiceListRow[]> {
  const ctx = await requireOrgContext();

  const filters = [eq(schema.invoice.organizationId, ctx.organizationId)];
  if (opts?.status) filters.push(eq(schema.invoice.status, opts.status));

  const q = opts?.q?.trim();
  if (q) {
    const numeric = /^\d+$/.test(q) ? Number(q) : null;
    const search = or(
      ilike(schema.project.name, `%${q}%`),
      numeric != null ? eq(schema.invoice.number, numeric) : undefined,
    );
    if (search) filters.push(search);
  }

  const query = db
    .select({
      id: schema.invoice.id,
      number: schema.invoice.number,
      status: schema.invoice.status,
      issueDate: schema.invoice.issueDate,
      dueDate: schema.invoice.dueDate,
      currency: schema.invoice.currency,
      total: schema.invoice.total,
      createdAt: schema.invoice.createdAt,
      projectId: schema.invoice.projectId,
      projectName: schema.project.name,
    })
    .from(schema.invoice)
    .innerJoin(schema.project, eq(schema.project.id, schema.invoice.projectId))
    .where(and(...filters))
    .orderBy(desc(schema.invoice.createdAt));

  return opts?.limit ? query.limit(opts.limit) : query;
}

/** Count of invoices per status for the active org (for filter badges/dashboard). */
export async function invoiceStatusCounts(): Promise<
  Record<InvoiceStatus, number>
> {
  const ctx = await requireOrgContext();
  const rows = await db
    .select({
      status: schema.invoice.status,
      count: schema.invoice.id,
    })
    .from(schema.invoice)
    .where(eq(schema.invoice.organizationId, ctx.organizationId));

  const counts: Record<InvoiceStatus, number> = {
    draft: 0,
    waiting: 0,
    paid: 0,
    unpaid: 0,
  };
  for (const r of rows) counts[r.status] += 1;
  return counts;
}

/** A single invoice scoped to the active org, or null. */
export async function getInvoice(id: string): Promise<InvoiceRow | null> {
  const ctx = await requireOrgContext();
  const [row] = await db
    .select()
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.id, id),
        eq(schema.invoice.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export type InvoiceWithItems = {
  invoice: InvoiceRow;
  items: InvoiceItemRow[];
  project: { id: string; name: string; slug: string };
};

/** Invoice + its line items + minimal project context, scoped to the active org. */
export async function getInvoiceWithItems(
  id: string,
): Promise<InvoiceWithItems | null> {
  const ctx = await requireOrgContext();

  const [invoice] = await db
    .select()
    .from(schema.invoice)
    .where(
      and(
        eq(schema.invoice.id, id),
        eq(schema.invoice.organizationId, ctx.organizationId),
      ),
    )
    .limit(1);
  if (!invoice) return null;

  const [items, [project]] = await Promise.all([
    db
      .select()
      .from(schema.invoiceItem)
      .where(eq(schema.invoiceItem.invoiceId, invoice.id))
      .orderBy(asc(schema.invoiceItem.position)),
    db
      .select({
        id: schema.project.id,
        name: schema.project.name,
        slug: schema.project.slug,
      })
      .from(schema.project)
      .where(eq(schema.project.id, invoice.projectId))
      .limit(1),
  ]);

  return { invoice, items, project };
}

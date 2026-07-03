import { and, eq, lt, sql } from 'drizzle-orm';
import { db, schema } from '@/server/db';
import { requireOrgContext } from './context';
import {
  listInvoices,
  type InvoiceListRow,
  type InvoiceStatus,
} from './invoices';

/**
 * Aggregates for the dashboard. All scoped to the active org. Money is summed in the
 * database and returned as integer cents (parsed once) to keep the UI float-free.
 */
export type DashboardStats = {
  outstandingCents: number; // waiting + unpaid totals
  paidCents: number;
  statusCounts: Record<InvoiceStatus, number>;
  overdueCount: number; // waiting AND past due
  projectCount: number;
  recentInvoices: InvoiceListRow[];
  currency: string; // dominant invoice currency, for display
  mixedCurrencies: boolean; // true when invoices span >1 currency
};

function toCentsFromSum(value: string | number | null): number {
  const n = typeof value === 'string' ? Number(value) : (value ?? 0);
  return Number.isFinite(n) ? Math.round((n as number) * 100) : 0;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const ctx = await requireOrgContext();
  const orgId = ctx.organizationId;

  const [byStatus, overdue, projects, recentInvoices, currencies] =
    await Promise.all([
    // totals + counts grouped by status
    db
      .select({
        status: schema.invoice.status,
        count: sql<number>`count(*)::int`,
        total: sql<string>`coalesce(sum(${schema.invoice.total}), 0)`,
      })
      .from(schema.invoice)
      .where(eq(schema.invoice.organizationId, orgId))
      .groupBy(schema.invoice.status),
    // overdue = waiting and past due date
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.invoice)
      .where(
        and(
          eq(schema.invoice.organizationId, orgId),
          eq(schema.invoice.status, 'waiting'),
          lt(schema.invoice.dueDate, sql`CURRENT_DATE`),
        ),
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.project)
      .where(eq(schema.project.organizationId, orgId)),
    listInvoices({ limit: 5 }),
    // distinct currencies, most-used first
    db
      .select({
        currency: schema.invoice.currency,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.invoice)
      .where(eq(schema.invoice.organizationId, orgId))
      .groupBy(schema.invoice.currency)
      .orderBy(sql`count(*) desc`),
  ]);

  const statusCounts: Record<InvoiceStatus, number> = {
    draft: 0,
    waiting: 0,
    paid: 0,
    unpaid: 0,
  };
  let outstandingCents = 0;
  let paidCents = 0;
  for (const row of byStatus) {
    statusCounts[row.status] = row.count;
    const cents = toCentsFromSum(row.total);
    if (row.status === 'waiting' || row.status === 'unpaid') {
      outstandingCents += cents;
    } else if (row.status === 'paid') {
      paidCents += cents;
    }
  }

  return {
    outstandingCents,
    paidCents,
    statusCounts,
    overdueCount: overdue[0]?.count ?? 0,
    projectCount: projects[0]?.count ?? 0,
    recentInvoices,
    currency: currencies[0]?.currency ?? 'USD',
    mixedCurrencies: currencies.length > 1,
  };
}

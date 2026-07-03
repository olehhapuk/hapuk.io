import type { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Plus, Search } from 'lucide-react';

import { requireActiveOrg, canManage } from '@/server/auth/org';
import {
  listInvoices,
  invoiceStatusCounts,
  type InvoiceStatus,
} from '@/server/db/queries/invoices';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/date';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

export const metadata: Metadata = { title: 'Invoices — hapuk.io' };

const FILTERS: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Drafts' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'paid', label: 'Paid' },
  { value: 'unpaid', label: 'Unpaid' },
];

function isStatus(v: string | undefined): v is InvoiceStatus {
  return v === 'draft' || v === 'waiting' || v === 'paid' || v === 'unpaid';
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { role } = await requireActiveOrg();
  const manage = canManage(role);
  const { status, q } = await searchParams;
  const active = isStatus(status) ? status : 'all';
  const query = q?.trim() ?? '';

  const [invoices, counts] = await Promise.all([
    listInvoices({
      status: active === 'all' ? undefined : active,
      q: query || undefined,
    }),
    invoiceStatusCounts(),
  ]);

  const total = counts.draft + counts.waiting + counts.paid + counts.unpaid;
  const qParam = query ? `&q=${encodeURIComponent(query)}` : '';

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground">
            Drafts become numbered invoices when you finalize them.
          </p>
        </div>
        {manage ? (
          <Button asChild>
            <Link href="/invoices/new">
              <Plus />
              New invoice
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => {
            const count = f.value === 'all' ? total : counts[f.value];
            const href =
              f.value === 'all'
                ? `/invoices${query ? `?q=${encodeURIComponent(query)}` : ''}`
                : `/invoices?status=${f.value}${qParam}`;
            return (
              <Link
                key={f.value}
                href={href}
                className={cn(
                  'rounded-2xl px-3 py-1.5 text-sm font-medium transition-colors',
                  active === f.value
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {f.label}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        <form action="/invoices" className="flex items-center gap-2">
          {active !== 'all' ? (
            <input type="hidden" name="status" value={active} />
          ) : null}
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search number or project…"
              className="w-56 pl-8"
            />
          </div>
        </form>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <FileText className="size-6 text-muted-foreground" />
            <CardTitle className="text-base">
              {query ? 'No matches' : 'No invoices here'}
            </CardTitle>
            <CardDescription>
              {query
                ? `Nothing matches “${query}”. Try a different search.`
                : manage
                  ? 'Create a draft invoice to get started.'
                  : 'No invoices match this filter yet.'}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Number</th>
                <th className="px-4 py-2.5 font-medium">Project</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Issued</th>
                <th className="px-4 py-2.5 font-medium">Due</th>
                <th className="px-4 py-2.5 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-b transition-colors last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-0">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="block py-2.5 font-medium tabular-nums"
                    >
                      {inv.number != null
                        ? `#${String(inv.number).padStart(3, '0')}`
                        : 'Draft'}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {inv.projectName}
                  </td>
                  <td className="px-4 py-2.5">
                    <InvoiceStatusBadge
                      status={inv.status}
                      dueDate={inv.dueDate}
                    />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(inv.issueDate)}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {formatDate(inv.dueDate)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatMoney(inv.total, inv.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

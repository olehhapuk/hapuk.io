import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Plus } from 'lucide-react';

import { requireActiveOrg, canManage } from '@/server/auth/org';
import { getDashboardStats } from '@/server/db/queries/dashboard';
import { formatMoney } from '@/lib/money';
import { formatDate } from '@/lib/date';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

export const metadata: Metadata = { title: 'Dashboard — hapuk.io' };

function StatTile({
  label,
  value,
  hint,
  emphasis,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: 'default' | 'danger';
}) {
  return (
    <Card>
      <CardContent className="grid gap-1 py-4">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span
          className={cn(
            'text-2xl font-semibold tabular-nums',
            emphasis === 'danger' && 'text-destructive',
          )}
        >
          {value}
        </span>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const { organization, role } = await requireActiveOrg();
  const manage = canManage(role);
  const stats = await getDashboardStats();

  const unpaidWaiting = stats.statusCounts.waiting + stats.statusCounts.unpaid;

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {organization.name}
          </h1>
          <p className="text-muted-foreground">
            {stats.projectCount}{' '}
            {stats.projectCount === 1 ? 'project' : 'projects'} · You are{' '}
            {role === 'owner'
              ? 'the owner'
              : `a${role === 'admin' ? 'n' : ''} ${role}`}
            .
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Outstanding"
          value={formatMoney(stats.outstandingCents / 100, stats.currency)}
          hint={
            stats.mixedCurrencies
              ? `${unpaidWaiting} unpaid · across currencies`
              : `${unpaidWaiting} unpaid invoice${unpaidWaiting === 1 ? '' : 's'}`
          }
        />
        <StatTile
          label="Overdue"
          value={String(stats.overdueCount)}
          hint={stats.overdueCount > 0 ? 'Past due date' : 'All on track'}
          emphasis={stats.overdueCount > 0 ? 'danger' : 'default'}
        />
        <StatTile
          label="Paid"
          value={formatMoney(stats.paidCents / 100, stats.currency)}
          hint={`${stats.statusCounts.paid} invoice${
            stats.statusCounts.paid === 1 ? '' : 's'
          }`}
        />
        <StatTile
          label="Drafts"
          value={String(stats.statusCounts.draft)}
          hint="Not yet finalized"
        />
      </div>

      <Card>
        <CardContent className="grid gap-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium">Recent invoices</h2>
            <Link
              href="/invoices"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              View all
              <ArrowRight className="size-3.5" />
            </Link>
          </div>

          {stats.recentInvoices.length === 0 ? (
            <div className="grid gap-2 rounded-2xl border border-dashed px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No invoices yet.</p>
              {manage ? (
                <div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/invoices/new">
                      <Plus />
                      Create your first invoice
                    </Link>
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {stats.recentInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b transition-colors last:border-0 hover:bg-muted/50"
                    >
                      <td className="py-0">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="block py-2.5 font-medium tabular-nums"
                        >
                          {inv.number != null
                            ? `#${String(inv.number).padStart(3, '0')}`
                            : 'Draft'}
                        </Link>
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {inv.projectName}
                      </td>
                      <td className="py-2.5">
                        <InvoiceStatusBadge
                          status={inv.status}
                          dueDate={inv.dueDate}
                        />
                      </td>
                      <td className="hidden py-2.5 text-muted-foreground sm:table-cell">
                        {formatDate(inv.dueDate)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {formatMoney(inv.total, inv.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {stats.overdueCount > 0 ? (
        <Link href="/invoices?status=waiting">
          <Card className="border-destructive/30 transition-colors hover:border-destructive/50">
            <CardContent className="flex items-center gap-3 py-4 text-sm">
              <AlertTriangle className="size-5 text-destructive" />
              <span>
                <span className="font-medium text-destructive">
                  {stats.overdueCount} overdue
                </span>{' '}
                <span className="text-muted-foreground">
                  invoice{stats.overdueCount === 1 ? '' : 's'} past the due date —
                  review and follow up.
                </span>
              </span>
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      ) : null}
    </div>
  );
}

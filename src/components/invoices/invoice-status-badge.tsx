import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { isPastDue } from '@/lib/date';
import type { InvoiceStatus } from '@/server/db/queries/invoices';

const STATUS: Record<
  InvoiceStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  draft: { label: 'Draft', variant: 'outline' },
  waiting: { label: 'Waiting', variant: 'secondary' },
  paid: { label: 'Paid', variant: 'default' },
  unpaid: { label: 'Unpaid', variant: 'destructive' },
};

/**
 * Status pill. When `dueDate` is provided and a waiting invoice is past due, it renders
 * an "Overdue" state (a reserved status color with an icon + label, never color alone).
 */
export function InvoiceStatusBadge({
  status,
  dueDate,
}: {
  status: InvoiceStatus;
  dueDate?: string;
}) {
  if (status === 'waiting' && dueDate && isPastDue(dueDate)) {
    return (
      <Badge variant="destructive">
        <AlertTriangle />
        Overdue
      </Badge>
    );
  }
  const s = STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

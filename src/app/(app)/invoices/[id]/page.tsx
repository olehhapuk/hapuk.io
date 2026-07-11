import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Eye, FileDown } from 'lucide-react';

import { requireActiveOrg, canManage } from '@/server/auth/org';
import { Button } from '@/components/ui/button';
import { getInvoiceWithItems } from '@/server/db/queries/invoices';
import { getProject, listServices } from '@/server/db/queries/projects';
import type { InvoiceInput } from '@/lib/validations/invoice';
import { formatMoney } from '@/lib/money';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  InvoiceForm,
  type ServiceOption,
} from '@/components/invoices/invoice-form';
import { InvoicePreview } from '@/components/invoices/invoice-preview';
import { EditInvoiceNumber } from '@/components/invoices/edit-invoice-number';
import { InvoiceStatusActions } from '@/components/invoices/invoice-status-actions';
import { InvoiceStatusBadge } from '@/components/invoices/invoice-status-badge';

export const metadata: Metadata = { title: 'Invoice — hapuk.io' };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role } = await requireActiveOrg();
  const manage = canManage(role);

  const data = await getInvoiceWithItems(id);
  if (!data) notFound();
  const { invoice, items, project } = data;

  const heading =
    invoice.number != null
      ? `Invoice #${String(invoice.number).padStart(3, '0')}`
      : 'Draft invoice';

  return (
    <div className="grid max-w-4xl gap-6">
      <div className="grid gap-1">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Invoices
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{heading}</h1>
          <InvoiceStatusBadge
            status={invoice.status}
            dueDate={invoice.dueDate}
          />
          <span className="text-lg tabular-nums text-muted-foreground">
            {formatMoney(invoice.total, invoice.currency)}
          </span>
        </div>
        <p className="text-muted-foreground">
          <Link href={`/projects/${project.id}`} className="hover:text-foreground">
            {project.name}
          </Link>
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a
              href={`/print/invoice/${invoice.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Eye />
              Preview
            </a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FileDown />
              Download PDF
            </a>
          </Button>
          {manage && invoice.number != null ? (
            <EditInvoiceNumber
              invoiceId={invoice.id}
              currentNumber={invoice.number}
            />
          ) : null}
        </div>
      </div>

      {manage ? (
        <Card>
          <CardContent className="py-4">
            <InvoiceStatusActions
              invoiceId={invoice.id}
              status={invoice.status}
            />
          </CardContent>
        </Card>
      ) : null}

      {invoice.status === 'draft' && manage ? (
        <DraftEditor invoiceId={invoice.id} projectId={project.id} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Invoice</CardTitle>
            <CardDescription>
              Snapshotted at finalize — later edits to the project or
              organization won&apos;t change it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InvoicePreview invoice={invoice} items={items} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Loads project context/services and renders the editable form for a draft. */
async function DraftEditor({
  invoiceId,
  projectId,
}: {
  invoiceId: string;
  projectId: string;
}) {
  const data = await getInvoiceWithItems(invoiceId);
  const project = await getProject(projectId);
  if (!data || !project) notFound();
  const { invoice, items } = data;

  const services = (await listServices(projectId)).filter((s) => s.isActive);
  const serviceOptions: ServiceOption[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    rate: s.rate,
  }));

  const defaultValues: InvoiceInput = {
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    senderName: invoice.senderSnapshot?.name ?? '',
    senderAddress: invoice.senderSnapshot?.address ?? '',
    senderTaxId: invoice.senderSnapshot?.taxId ?? '',
    senderPhone: invoice.senderSnapshot?.phone ?? '',
    senderEmail: invoice.senderSnapshot?.email ?? '',
    receiverName: invoice.receiverSnapshot?.name ?? '',
    receiverAddress: invoice.receiverSnapshot?.address ?? '',
    receiverTaxId: invoice.receiverSnapshot?.taxId ?? '',
    receiverPhone: invoice.receiverSnapshot?.phone ?? '',
    receiverEmail: invoice.receiverSnapshot?.email ?? '',
    notes: invoice.notes ?? '',
    items: items.map((i) => ({
      serviceId: i.serviceId ?? '',
      description: i.description,
      qty: i.qty,
      rate: i.rate,
    })),
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit draft</CardTitle>
        <CardDescription>
          Freely editable until you finalize. Totals are computed from the line
          items.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InvoiceForm
          mode="edit"
          projectId={projectId}
          invoiceId={invoiceId}
          currency={project.currency}
          defaultRate={project.defaultRate}
          services={serviceOptions}
          defaultValues={defaultValues}
        />
      </CardContent>
    </Card>
  );
}

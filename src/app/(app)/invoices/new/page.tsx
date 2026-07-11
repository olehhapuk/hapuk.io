import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, FolderOpen } from 'lucide-react';

import { requireActiveOrg, canManage } from '@/server/auth/org';
import {
  getProject,
  listProjects,
  listServices,
} from '@/server/db/queries/projects';
import type { InvoiceInput } from '@/lib/validations/invoice';
import { todayISO, addDaysISO } from '@/lib/date';
import { DEFAULT_LOCALE } from '@/lib/i18n';
import { getOrgLocaleOverride } from '@/server/db/queries/organization';
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

export const metadata: Metadata = { title: 'New invoice — hapuk.io' };

type OrgReceiver = {
  receiverName?: string | null;
  receiverAddress?: string | null;
  receiverTaxId?: string | null;
  receiverPhone?: string | null;
  receiverEmail?: string | null;
};

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { organization, role } = await requireActiveOrg();
  if (!canManage(role)) redirect('/invoices');

  const { projectId } = await searchParams;

  // Step 1: no project chosen yet — pick one.
  if (!projectId) {
    const projects = await listProjects();
    return (
      <div className="grid max-w-2xl gap-6">
        <Header />
        <Card>
          <CardHeader>
            <CardTitle>Choose a project</CardTitle>
            <CardDescription>
              Invoices belong to a project (the sender) and are numbered per
              project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects yet.{' '}
                <Link href="/projects/new" className="underline">
                  Create one first
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y rounded-2xl border">
                {projects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/invoices/new?projectId=${p.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted"
                    >
                      <FolderOpen className="size-4 text-muted-foreground" />
                      <span className="flex-1 text-sm font-medium">
                        {p.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {p.currency}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Step 2: project chosen — build prefilled draft.
  const project = await getProject(projectId);
  if (!project) redirect('/invoices/new');

  const allServices = await listServices(project.id);
  const activeServices = allServices.filter((s) => s.isActive);

  const org = organization as typeof organization & OrgReceiver;

  // Prefill the receiver block from the org's details for the project's language.
  // Name/address are translatable (fall back to the default language when blank);
  // tax ID / phone / email are shared across languages and always come from the org.
  const override =
    project.locale === DEFAULT_LOCALE
      ? null
      : await getOrgLocaleOverride(org.id, project.locale);
  const receiver = {
    name: override?.receiverName ?? org.receiverName ?? org.name,
    address: override?.receiverAddress ?? org.receiverAddress ?? '',
    taxId: org.receiverTaxId ?? '',
    phone: org.receiverPhone ?? '',
    email: org.receiverEmail ?? '',
  };

  const issueDate = todayISO();
  const dueDate = addDaysISO(issueDate, project.defaultDueDays);

  const items: InvoiceInput['items'] =
    activeServices.length > 0
      ? activeServices.map((s) => ({
          serviceId: s.id,
          description: s.description ? `${s.name} — ${s.description}` : s.name,
          qty: '1',
          rate: s.rate ?? project.defaultRate ?? '0',
        }))
      : [
          {
            serviceId: '',
            description: '',
            qty: '1',
            rate: project.defaultRate ?? '0',
          },
        ];

  const defaultValues: InvoiceInput = {
    issueDate,
    dueDate,
    currency: project.currency,
    senderName: project.senderName ?? project.name,
    senderAddress: project.senderAddress ?? '',
    senderTaxId: project.senderTaxId ?? '',
    senderPhone: project.senderPhone ?? '',
    senderEmail: project.senderEmail ?? '',
    receiverName: receiver.name,
    receiverAddress: receiver.address,
    receiverTaxId: receiver.taxId,
    receiverPhone: receiver.phone,
    receiverEmail: receiver.email,
    notes: project.defaultNotes ?? '',
    items,
  };

  const serviceOptions: ServiceOption[] = activeServices.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    rate: s.rate,
  }));

  return (
    <div className="grid max-w-4xl gap-6">
      <Header projectName={project.name} />
      <Card>
        <CardHeader>
          <CardTitle>Invoice details</CardTitle>
          <CardDescription>
            Prefilled from {project.name} and your organization. Saved as a
            draft — numbering happens when you finalize.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InvoiceForm
            mode="create"
            projectId={project.id}
            currency={project.currency}
            defaultRate={project.defaultRate}
            services={serviceOptions}
            defaultValues={defaultValues}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Header({ projectName }: { projectName?: string }) {
  return (
    <div className="grid gap-1">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Invoices
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">New invoice</h1>
      {projectName ? (
        <p className="text-muted-foreground">{projectName}</p>
      ) : null}
    </div>
  );
}

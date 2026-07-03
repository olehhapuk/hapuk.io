import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { requireActiveOrg, canManage } from '@/server/auth/org';
import { getProject, listServices } from '@/server/db/queries/projects';
import type { ProjectInput } from '@/lib/validations/project';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProjectForm } from '@/components/projects/project-form';
import { ServiceManager } from '@/components/projects/service-manager';
import { DeleteProjectButton } from '@/components/projects/delete-project-button';

export const metadata: Metadata = { title: 'Project — hapuk.io' };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { role } = await requireActiveOrg();
  const manage = canManage(role);

  const project = await getProject(id);
  if (!project) notFound();

  const services = await listServices(project.id);

  const defaultValues: ProjectInput = {
    name: project.name,
    slug: project.slug,
    description: project.description ?? '',
    senderName: project.senderName ?? '',
    senderAddress: project.senderAddress ?? '',
    senderTaxId: project.senderTaxId ?? '',
    senderPhone: project.senderPhone ?? '',
    senderEmail: project.senderEmail ?? '',
    currency: project.currency,
    defaultRate: project.defaultRate ?? '',
    defaultNotes: project.defaultNotes ?? '',
    defaultDueDays: String(project.defaultDueDays),
  };

  return (
    <div className="grid max-w-3xl gap-6">
      <div className="grid gap-1">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Projects
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.name}
            </h1>
            <p className="text-muted-foreground">/{project.slug}</p>
          </div>
          {manage ? (
            <Button asChild>
              <Link href={`/invoices/new?projectId=${project.id}`}>
                <Plus />
                New invoice
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Services</CardTitle>
          <CardDescription>
            Billable items with per-service rates. Blank rates fall back to the
            project default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ServiceManager
            projectId={project.id}
            services={services}
            currency={project.currency}
            defaultRate={project.defaultRate}
            canManage={manage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>
            Sender defaults and invoice defaults for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            mode="edit"
            projectId={project.id}
            canManage={manage}
            defaultValues={defaultValues}
          />
        </CardContent>
      </Card>

      {manage ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Danger zone</CardTitle>
            <CardDescription>
              Deleting a project removes its services and invoices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeleteProjectButton
              projectId={project.id}
              projectName={project.name}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { FolderOpen, Plus } from 'lucide-react';

import { requireActiveOrg, canManage } from '@/server/auth/org';
import { listProjects } from '@/server/db/queries/projects';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Projects — hapuk.io' };

export default async function ProjectsPage() {
  const { role } = await requireActiveOrg();
  const manage = canManage(role);
  const projects = await listProjects();

  return (
    <div className="grid gap-6">
      <div className="flex items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Each project is an invoice sender with its own services and
            numbering.
          </p>
        </div>
        {manage ? (
          <Button asChild>
            <Link href="/projects/new">
              <Plus />
              New project
            </Link>
          </Button>
        ) : null}
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardHeader className="items-center text-center">
            <FolderOpen className="size-6 text-muted-foreground" />
            <CardTitle className="text-base">No projects yet</CardTitle>
            <CardDescription>
              {manage
                ? 'Create your first project to start billing clients.'
                : 'Ask an owner or admin to create the first project.'}
            </CardDescription>
            {manage ? (
              <Button asChild size="sm" className="mt-2">
                <Link href="/projects/new">
                  <Plus />
                  New project
                </Link>
              </Button>
            ) : null}
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-colors hover:border-foreground/20">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{project.name}</CardTitle>
                    <Badge variant="outline">{project.currency}</Badge>
                  </div>
                  <CardDescription className="truncate">
                    {project.description || `/${project.slug}`}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground">
                    {project.serviceCount}{' '}
                    {project.serviceCount === 1 ? 'service' : 'services'} ·{' '}
                    {project.invoiceCounter}{' '}
                    {project.invoiceCounter === 1 ? 'invoice' : 'invoices'}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

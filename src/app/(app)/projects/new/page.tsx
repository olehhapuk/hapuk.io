import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { requireActiveOrg, canManage } from '@/server/auth/org';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProjectForm, emptyProject } from '@/components/projects/project-form';

export const metadata: Metadata = { title: 'New project — hapuk.io' };

export default async function NewProjectPage() {
  const { role } = await requireActiveOrg();
  // Only owners/admins may create projects.
  if (!canManage(role)) redirect('/projects');

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
        <h1 className="text-2xl font-semibold tracking-tight">New project</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project details</CardTitle>
          <CardDescription>
            Sender defaults and invoice defaults for this client.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            mode="create"
            canManage
            defaultValues={emptyProject}
          />
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from 'next';
import { requireUser } from '@/server/auth/session';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreateOrgForm } from '@/components/org/create-org-form';

export const metadata: Metadata = { title: 'New organization — hapuk.io' };

export default async function NewOrganizationPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>New organization</CardTitle>
          <CardDescription>
            Create another organization and switch to it.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrgForm redirectTo="/dashboard" />
        </CardContent>
      </Card>
    </div>
  );
}

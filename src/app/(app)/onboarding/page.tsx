import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/session';
import { getActiveOrganization } from '@/server/auth/org';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CreateOrgForm } from '@/components/org/create-org-form';

export const metadata: Metadata = { title: 'Create organization — hapuk.io' };

export default async function OnboardingPage() {
  await requireUser();
  // If they already have an active org, skip onboarding.
  const active = await getActiveOrganization();
  if (active) redirect('/dashboard');

  return (
    <div className="mx-auto max-w-md py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create your organization</CardTitle>
          <CardDescription>
            Your organization holds your invoice &quot;receiver&quot; details
            and signature. You can add teammates later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateOrgForm redirectTo="/dashboard" />
        </CardContent>
      </Card>
    </div>
  );
}

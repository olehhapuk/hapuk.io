import type { Metadata } from 'next';
import Link from 'next/link';
import { Building2, Users } from 'lucide-react';
import { requireActiveOrg } from '@/server/auth/org';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const metadata: Metadata = { title: 'Dashboard — hapuk.io' };

export default async function DashboardPage() {
  const { organization, role } = await requireActiveOrg();

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {organization.name}
        </h1>
        <p className="text-muted-foreground">
          You are{' '}
          {role === 'owner'
            ? 'the owner'
            : `a${role === 'admin' ? 'n' : ''} ${role}`}{' '}
          of this organization. Projects and invoices arrive in the next phases.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/organization/settings">
          <Card className="transition-colors hover:border-foreground/20">
            <CardHeader>
              <Building2 className="size-5 text-muted-foreground" />
              <CardTitle className="text-base">Organization settings</CardTitle>
              <CardDescription>
                Receiver details used on invoices, plus your signature.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/organization/members">
          <Card className="transition-colors hover:border-foreground/20">
            <CardHeader>
              <Users className="size-5 text-muted-foreground" />
              <CardTitle className="text-base">Members</CardTitle>
              <CardDescription>
                Invite teammates and manage their roles.
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}

import type { Metadata } from 'next';
import { requireActiveOrg, canManage } from '@/server/auth/org';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MembersManager } from '@/components/org/members-manager';

export const metadata: Metadata = { title: 'Members — hapuk.io' };

export default async function MembersPage() {
  const { organization, role, userId } = await requireActiveOrg();

  const members = (organization.members ?? []).map((m) => ({
    id: m.id,
    role: m.role,
    userId: m.userId,
    user: {
      name: m.user?.name ?? null,
      email: m.user?.email ?? '',
      image: m.user?.image ?? null,
    },
  }));
  const invitations = (organization.invitations ?? []).map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role ?? null,
    status: i.status,
  }));

  return (
    <div className="grid max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-muted-foreground">
          Invite teammates and manage their roles in {organization.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team</CardTitle>
          <CardDescription>
            Owners and admins can manage members. Members have read/write access
            to invoices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MembersManager
            organizationId={organization.id}
            currentUserId={userId}
            canManage={canManage(role)}
            members={members}
            invitations={invitations}
          />
        </CardContent>
      </Card>
    </div>
  );
}

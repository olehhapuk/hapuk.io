'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2, Mail, X } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import {
  inviteMemberSchema,
  type InviteMemberInput,
} from '@/lib/validations/organization';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

type Member = {
  id: string;
  role: string;
  userId: string;
  user: { name?: string | null; email: string; image?: string | null };
};
type Invitation = {
  id: string;
  email: string;
  role?: string | null;
  status: string;
};

const roleSelectClass =
  'h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:opacity-50';

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

export function MembersManager({
  organizationId,
  currentUserId,
  canManage,
  members,
  invitations,
}: {
  organizationId: string;
  currentUserId: string;
  canManage: boolean;
  members: Member[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  const form = useForm<InviteMemberInput>({
    resolver: standardSchemaResolver(inviteMemberSchema),
    defaultValues: { email: '', role: 'member' },
  });

  async function invite(values: InviteMemberInput) {
    const { error } = await authClient.organization.inviteMember({
      email: values.email,
      role: values.role,
      organizationId,
    });
    if (error) {
      toast.error(error.message ?? 'Could not send invitation');
      return;
    }
    toast.success(`Invitation sent to ${values.email}`);
    form.reset();
    router.refresh();
  }

  async function changeRole(memberId: string, role: 'admin' | 'member') {
    setBusyId(memberId);
    const { error } = await authClient.organization.updateMemberRole({
      memberId,
      role,
      organizationId,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message ?? 'Could not update role');
      return;
    }
    toast.success('Role updated');
    router.refresh();
  }

  async function removeMember(memberId: string) {
    setBusyId(memberId);
    const { error } = await authClient.organization.removeMember({
      memberIdOrEmail: memberId,
      organizationId,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message ?? 'Could not remove member');
      return;
    }
    toast.success('Member removed');
    router.refresh();
  }

  async function cancelInvitation(invitationId: string) {
    setBusyId(invitationId);
    const { error } = await authClient.organization.cancelInvitation({
      invitationId,
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message ?? 'Could not cancel invitation');
      return;
    }
    toast.success('Invitation cancelled');
    router.refresh();
  }

  const pending = invitations.filter((i) => i.status === 'pending');

  return (
    <div className="grid gap-6">
      {canManage ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(invite)}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Invite by email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="teammate@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <select className={roleSelectClass} {...field}>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="animate-spin" />
              )}
              Send invite
            </Button>
          </form>
        </Form>
      ) : null}

      <div className="grid gap-2">
        <h3 className="text-sm font-medium">Members</h3>
        <div className="rounded-md border divide-y">
          {members.map((m) => {
            const name = m.user.name || m.user.email;
            const isOwner = m.role === 'owner';
            const isSelf = m.userId === currentUserId;
            return (
              <div key={m.id} className="flex items-center gap-3 p-3">
                <Avatar className="size-8">
                  {m.user.image ? (
                    <AvatarImage src={m.user.image} alt={name} />
                  ) : null}
                  <AvatarFallback>{initials(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {name}
                    {isSelf ? (
                      <span className="text-muted-foreground"> (you)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.user.email}
                  </p>
                </div>
                {canManage && !isOwner && !isSelf ? (
                  <>
                    <select
                      className={roleSelectClass}
                      value={m.role}
                      disabled={busyId === m.id}
                      onChange={(e) =>
                        changeRole(m.id, e.target.value as 'admin' | 'member')
                      }
                    >
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={busyId === m.id}
                      onClick={() => removeMember(m.id)}
                    >
                      <X />
                    </Button>
                  </>
                ) : (
                  <span className="text-sm capitalize text-muted-foreground">
                    {m.role}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {pending.length > 0 ? (
        <div className="grid gap-2">
          <Separator />
          <h3 className="text-sm font-medium">Pending invitations</h3>
          <div className="rounded-md border divide-y">
            {pending.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 p-3">
                <Mail className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{inv.email}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {inv.role ?? 'member'} · {inv.status}
                  </p>
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busyId === inv.id}
                    onClick={() => cancelInvitation(inv.id)}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

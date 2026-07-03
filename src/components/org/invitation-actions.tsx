'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import { Button } from '@/components/ui/button';

export function InvitationActions({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<'accept' | 'reject' | null>(null);

  async function accept() {
    setBusy('accept');
    const { data, error } = await authClient.organization.acceptInvitation({
      invitationId,
    });
    if (error || !data) {
      setBusy(null);
      toast.error(error?.message ?? 'Could not accept invitation');
      return;
    }
    await authClient.organization.setActive({
      organizationId: data.invitation.organizationId,
    });
    toast.success('Invitation accepted');
    router.push('/dashboard');
    router.refresh();
  }

  async function reject() {
    setBusy('reject');
    const { error } = await authClient.organization.rejectInvitation({
      invitationId,
    });
    setBusy(null);
    if (error) {
      toast.error(error.message ?? 'Could not decline invitation');
      return;
    }
    toast.success('Invitation declined');
    router.push('/dashboard');
  }

  return (
    <div className="flex gap-2">
      <Button onClick={accept} disabled={busy !== null} className="flex-1">
        {busy === 'accept' && <Loader2 className="animate-spin" />}
        Accept
      </Button>
      <Button
        onClick={reject}
        disabled={busy !== null}
        variant="outline"
        className="flex-1"
      >
        {busy === 'reject' && <Loader2 className="animate-spin" />}
        Decline
      </Button>
    </div>
  );
}

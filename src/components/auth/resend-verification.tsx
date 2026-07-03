'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import { Button } from '@/components/ui/button';

export function ResendVerification({ email }: { email: string | null }) {
  const [pending, setPending] = useState(false);

  async function resend() {
    if (!email) {
      toast.error('No email to resend to. Try signing in again.');
      return;
    }
    setPending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: '/dashboard',
    });
    setPending(false);

    if (error) {
      toast.error(error.message ?? 'Could not resend verification email');
      return;
    }
    toast.success('Verification email sent.');
  }

  return (
    <Button
      onClick={resend}
      variant="outline"
      className="w-full"
      disabled={pending || !email}
    >
      {pending && <Loader2 className="animate-spin" />}
      Resend verification email
    </Button>
  );
}

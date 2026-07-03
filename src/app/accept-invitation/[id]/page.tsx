import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { requireUser } from '@/server/auth/session';
import { auth } from '@/server/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InvitationActions } from '@/components/org/invitation-actions';

export const metadata: Metadata = { title: 'Accept invitation — hapuk.io' };

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();

  let invitation: Awaited<ReturnType<typeof auth.api.getInvitation>> | null =
    null;
  try {
    invitation = await auth.api.getInvitation({
      query: { id },
      headers: await headers(),
    });
  } catch {
    invitation = null;
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-sm">
        {invitation ? (
          <>
            <CardHeader>
              <CardTitle>You&apos;re invited</CardTitle>
              <CardDescription>
                Join <b>{invitation.organizationName}</b> as{' '}
                {invitation.role ?? 'member'}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InvitationActions invitationId={id} />
            </CardContent>
          </>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Invitation unavailable</CardTitle>
              <CardDescription>
                This invitation is invalid, expired, or was sent to a different
                email than the one you&apos;re signed in with.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

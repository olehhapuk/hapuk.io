import type { Metadata } from 'next';
import Link from 'next/link';
import { MailCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ResendVerification } from '@/components/auth/resend-verification';

export const metadata: Metadata = { title: 'Verify your email — hapuk.io' };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Card>
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-muted">
          <MailCheck className="size-6 text-muted-foreground" />
        </div>
        <CardTitle>Check your inbox</CardTitle>
        <CardDescription>
          We sent a verification link{email ? ` to ${email}` : ''}. Click it to
          activate your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResendVerification email={email ?? null} />
      </CardContent>
      <CardFooter className="justify-center">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

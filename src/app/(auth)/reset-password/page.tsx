import type { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Set new password — hapuk.io' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  // Better Auth redirects here with ?error=INVALID_TOKEN when a link is bad/expired.
  const validToken = error ? null : (token ?? null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set a new password</CardTitle>
        <CardDescription>
          Choose a strong password you don&apos;t use elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={validToken} />
      </CardContent>
    </Card>
  );
}

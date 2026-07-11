import type { Metadata } from 'next';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RegisterForm } from '@/components/auth/register-form';
import { redirectIfAuthenticated } from '@/server/auth/session';

export const metadata: Metadata = { title: 'Create account — hapuk.io' };

export default async function RegisterPage() {
  await redirectIfAuthenticated();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Start managing invoices in minutes.</CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm />
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import {
  resetPasswordSchema,
  type ResetPasswordInput,
} from '@/lib/validations/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export function ResetPasswordForm({ token }: { token: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<ResetPasswordInput>({
    resolver: standardSchemaResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) {
      toast.error('This reset link is invalid or has expired.');
      return;
    }
    setPending(true);
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    setPending(false);

    if (error) {
      toast.error(error.message ?? 'Could not reset password');
      return;
    }
    toast.success('Password updated — you can sign in now.');
    router.push('/login');
  }

  if (!token) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          This reset link is invalid or has expired.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Update password
        </Button>
      </form>
    </Form>
  );
}

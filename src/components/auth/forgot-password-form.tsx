'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
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

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: '/reset-password',
    });
    setPending(false);

    if (error) {
      toast.error(error.message ?? 'Could not send reset email');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="grid gap-4 text-center">
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, we&apos;ve sent a link to reset
          your password.
        </p>
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Send reset link
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}

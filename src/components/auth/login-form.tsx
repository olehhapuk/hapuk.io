'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import { loginSchema, type LoginInput } from '@/lib/validations/auth';
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

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<LoginInput>({
    resolver: standardSchemaResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setPending(true);
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });
    setPending(false);

    if (error) {
      if (error.code === 'EMAIL_NOT_VERIFIED') {
        toast.info('Please verify your email to continue.');
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`);
        return;
      }
      toast.error(error.message ?? 'Invalid email or password');
      return;
    }
    router.push('/dashboard');
    router.refresh();
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Password</FormLabel>
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Sign in
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          No account?{' '}
          <Link
            href="/register"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </form>
    </Form>
  );
}

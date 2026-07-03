'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import {
  createOrgSchema,
  slugify,
  type CreateOrgInput,
} from '@/lib/validations/organization';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

export function CreateOrgForm({
  redirectTo = '/dashboard',
}: {
  redirectTo?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const form = useForm<CreateOrgInput>({
    resolver: standardSchemaResolver(createOrgSchema),
    defaultValues: { name: '', slug: '' },
  });

  async function onSubmit(values: CreateOrgInput) {
    setPending(true);
    const { data, error } = await authClient.organization.create({
      name: values.name,
      slug: values.slug,
    });
    if (error || !data) {
      setPending(false);
      toast.error(error?.message ?? 'Could not create organization');
      return;
    }
    await authClient.organization.setActive({ organizationId: data.id });
    toast.success('Organization created');
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization name</FormLabel>
              <FormControl>
                <Input
                  placeholder="Acme Inc."
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    if (!slugEdited) {
                      form.setValue('slug', slugify(e.target.value), {
                        shouldValidate: true,
                      });
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug</FormLabel>
              <FormControl>
                <Input
                  placeholder="acme"
                  {...field}
                  onChange={(e) => {
                    setSlugEdited(true);
                    field.onChange(e);
                  }}
                />
              </FormControl>
              <FormDescription>
                Used in URLs. Lowercase, hyphens.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Create organization
        </Button>
      </form>
    </Form>
  );
}

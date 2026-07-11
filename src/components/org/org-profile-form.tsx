'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { authClient } from '@/server/auth/client';
import {
  orgProfileSchema,
  type OrgProfileInput,
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

export function OrgProfileForm({
  organizationId,
  canManage,
  defaultValues,
}: {
  organizationId: string;
  canManage: boolean;
  defaultValues: OrgProfileInput;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<OrgProfileInput>({
    resolver: standardSchemaResolver(orgProfileSchema),
    defaultValues,
  });

  async function onSubmit(values: OrgProfileInput) {
    setPending(true);
    const { error } = await authClient.organization.update({
      organizationId,
      data: values,
    });
    setPending(false);
    if (error) {
      toast.error(error.message ?? 'Could not save changes');
      return;
    }
    toast.success('Organization updated');
    router.refresh();
  }

  return (
    <Form {...form}>
      <fieldset disabled={!canManage} className="contents">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="receiverName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receiver name</FormLabel>
                <FormControl>
                  <Input placeholder="Legal name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="receiverAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Street, city, country" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="receiverTaxId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tax ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receiverPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="receiverEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="signatureLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signature label</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Printed name under the signature"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Shown beneath the signature image on invoices.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {canManage ? (
            <div>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                Save changes
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Only owners and admins can edit these settings.
            </p>
          )}
        </form>
      </fieldset>
    </Form>
  );
}

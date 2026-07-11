'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  orgLocaleSchema,
  type OrgLocaleInput,
} from '@/lib/validations/organization';
import { updateOrgLocale } from '@/server/actions/organization';
import type { Locale } from '@/lib/i18n';
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

/** Placeholder = the org's default-language value, so empty fields visibly fall back. */
export type OrgLocaleFallback = {
  receiverName?: string;
  receiverAddress?: string;
  signatureLabel?: string;
};

export function OrgLocaleForm({
  locale,
  canManage,
  defaultValues,
  fallback,
}: {
  locale: Locale;
  canManage: boolean;
  defaultValues: OrgLocaleInput;
  fallback: OrgLocaleFallback;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<OrgLocaleInput>({
    resolver: standardSchemaResolver(orgLocaleSchema),
    defaultValues,
  });

  async function onSubmit(values: OrgLocaleInput) {
    setPending(true);
    const result = await updateOrgLocale(locale, values);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Language details saved');
    router.refresh();
  }

  return (
    <Form {...form}>
      <fieldset disabled={!canManage} className="contents">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
          <FormField
            control={form.control}
            name="receiverName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Receiver name</FormLabel>
                <FormControl>
                  <Input
                    placeholder={fallback.receiverName || 'Legal name'}
                    {...field}
                  />
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
                  <Input
                    placeholder={
                      fallback.receiverAddress || 'Street, city, country'
                    }
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="signatureLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signature label</FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      fallback.signatureLabel ||
                      'Printed name under the signature'
                    }
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Shown beneath the signature image on invoices in this
                  language.
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

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { invoiceSchema, type InvoiceInput } from '@/lib/validations/invoice';
import { createInvoice, updateInvoice } from '@/server/actions/invoices';
import { centsToString, formatMoney, lineTotalCents } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ServiceOption = {
  id: string;
  name: string;
  description: string | null;
  rate: string | null;
};

export function InvoiceForm({
  mode,
  projectId,
  invoiceId,
  currency,
  defaultRate,
  services,
  defaultValues,
}: {
  mode: 'create' | 'edit';
  projectId: string;
  invoiceId?: string;
  currency: string;
  defaultRate: string | null;
  services: ServiceOption[];
  defaultValues: InvoiceInput;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm<InvoiceInput>({
    resolver: standardSchemaResolver(invoiceSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  // Live totals — recomputed from watched items (display only; server is authoritative).
  const watchedItems = form.watch('items');
  const subtotalCents = (watchedItems ?? []).reduce(
    (sum, i) => sum + lineTotalCents(i?.qty ?? '0', i?.rate ?? '0'),
    0,
  );

  function addBlankLine() {
    append({
      serviceId: '',
      description: '',
      qty: '1',
      rate: defaultRate ?? '0',
    });
  }

  function addServiceLine(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    append({
      serviceId: svc.id,
      description: svc.description ? `${svc.name} — ${svc.description}` : svc.name,
      qty: '1',
      rate: svc.rate ?? defaultRate ?? '0',
    });
  }

  async function onSubmit(values: InvoiceInput) {
    setPending(true);
    if (mode === 'create') {
      const result = await createInvoice(projectId, values);
      setPending(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success('Draft invoice created');
      router.push(`/invoices/${result.invoiceId}`);
      router.refresh();
      return;
    }
    const result = await updateInvoice(invoiceId!, values);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success('Invoice saved');
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="issueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Issue date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <FormControl>
                  <Input maxLength={3} className="uppercase" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        <div className="grid gap-6 sm:grid-cols-2">
          <PartyFields
            form={form}
            legend="Sender"
            hint="Who is billing (this project's client)."
            prefix="sender"
          />
          <PartyFields
            form={form}
            legend="Receiver"
            hint="Who is billed (your organization)."
            prefix="receiver"
          />
        </div>

        <Separator />

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">Line items</h3>
            <div className="flex items-center gap-2">
              {services.length > 0 ? (
                <Select value="" onValueChange={addServiceLine}>
                  <SelectTrigger size="sm" className="w-44">
                    <SelectValue placeholder="Add from service…" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBlankLine}
              >
                <Plus />
                Add line
              </Button>
            </div>
          </div>

          {fields.length === 0 ? (
            <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              No line items yet. Add a service or a blank line.
            </p>
          ) : (
            <div className="grid gap-3">
              {fields.map((field, index) => {
                const item = watchedItems?.[index];
                const cents = lineTotalCents(
                  item?.qty ?? '0',
                  item?.rate ?? '0',
                );
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-[1fr_auto] items-start gap-3 rounded-2xl border p-3 sm:grid-cols-[1fr_5rem_7rem_7rem_auto]"
                  >
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem className="col-span-2 sm:col-span-1">
                          <FormLabel className="sr-only">Description</FormLabel>
                          <FormControl>
                            <Input placeholder="Description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.qty`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="sr-only">Qty</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Qty"
                              inputMode="decimal"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`items.${index}.rate`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="sr-only">Rate</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Rate"
                              inputMode="decimal"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex h-8 items-center justify-end text-sm tabular-nums">
                      {formatMoney(centsToString(cents), currency)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Remove line"
                      onClick={() => remove(index)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {form.formState.errors.items?.root ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.items.root.message}
            </p>
          ) : null}

          <div className="flex justify-end gap-8 pr-10 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium tabular-nums">
              {formatMoney(centsToString(subtotalCents), currency)}
            </span>
          </div>
        </div>

        <Separator />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Payment terms, bank details, thank-you note…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {mode === 'create' ? 'Create draft' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

function PartyFields({
  form,
  legend,
  hint,
  prefix,
}: {
  form: ReturnType<typeof useForm<InvoiceInput>>;
  legend: string;
  hint: string;
  prefix: 'sender' | 'receiver';
}) {
  const cap = (s: string) => `${prefix}${s}` as keyof InvoiceInput;
  return (
    <div className="grid gap-3">
      <div className="grid gap-0.5">
        <h3 className="text-sm font-medium">{legend}</h3>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <FormField
        control={form.control}
        name={cap('Name') as `senderName`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name={cap('Address') as `senderAddress`}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          control={form.control}
          name={cap('TaxId') as `senderTaxId`}
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
          name={cap('Phone') as `senderPhone`}
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
      </div>
      <FormField
        control={form.control}
        name={cap('Email') as `senderEmail`}
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
  );
}

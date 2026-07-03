'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { serviceSchema, type ServiceInput } from '@/lib/validations/project';
import type { ServiceRow } from '@/server/db/queries/projects';
import {
  createService,
  deleteService,
  updateService,
} from '@/server/actions/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

function formatRate(
  rate: string | null,
  currency: string,
  fallbackRate: string | null,
) {
  if (rate) return `${currency} ${rate}`;
  if (fallbackRate) return `${currency} ${fallbackRate} (default)`;
  return 'Project default';
}

export function ServiceManager({
  projectId,
  services,
  currency,
  defaultRate,
  canManage,
}: {
  projectId: string;
  services: ServiceRow[];
  currency: string;
  defaultRate: string | null;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [open, setOpen] = useState(false);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(service: ServiceRow) {
    setEditing(service);
    setOpen(true);
  }

  return (
    <div className="grid gap-4">
      {canManage ? (
        <div>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus />
            Add service
          </Button>
        </div>
      ) : null}

      {services.length === 0 ? (
        <p className="rounded-2xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          No services yet. Add the work items you bill on this project.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border">
          {services.map((service) => (
            <li
              key={service.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {service.name}
                  </span>
                  {!service.isActive ? (
                    <Badge variant="secondary">Inactive</Badge>
                  ) : null}
                </div>
                {service.description ? (
                  <p className="truncate text-sm text-muted-foreground">
                    {service.description}
                  </p>
                ) : null}
              </div>
              <div className="text-right text-sm whitespace-nowrap text-muted-foreground">
                {formatRate(service.rate, currency, defaultRate)}
                <span className="text-xs"> / {service.unit}</span>
              </div>
              {canManage ? (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Edit service"
                    onClick={() => openEdit(service)}
                  >
                    <Pencil />
                  </Button>
                  <DeleteServiceButton serviceId={service.id} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ServiceDialog
        key={editing?.id ?? 'new'}
        projectId={projectId}
        service={editing}
        open={open}
        onOpenChange={setOpen}
      />
    </div>
  );
}

function ServiceDialog({
  projectId,
  service,
  open,
  onOpenChange,
}: {
  projectId: string;
  service: ServiceRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const isEdit = Boolean(service);

  const form = useForm<ServiceInput>({
    resolver: standardSchemaResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? '',
      description: service?.description ?? '',
      rate: service?.rate ?? '',
      unit: service?.unit ?? 'h',
      isActive: service?.isActive ?? true,
    },
  });

  async function onSubmit(values: ServiceInput) {
    setPending(true);
    const result = isEdit
      ? await updateService(service!.id, values)
      : await createService(projectId, values);
    setPending(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(isEdit ? 'Service updated' : 'Service added');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit service' : 'Add service'}</DialogTitle>
          <DialogDescription>
            A billable work item. Leave the rate blank to use the project
            default.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Development" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional detail" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Default"
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
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="h" {...field} />
                    </FormControl>
                    <FormDescription>e.g. h, day, item</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) =>
                          field.onChange(checked === true)
                        }
                        onBlur={field.onBlur}
                      />
                      Active (selectable on new invoices)
                    </label>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="animate-spin" />}
                {isEdit ? 'Save' : 'Add service'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteServiceButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onDelete() {
    setPending(true);
    const result = await deleteService(serviceId);
    if (result.error) {
      setPending(false);
      toast.error(result.error);
      return;
    }
    toast.success('Service deleted');
    router.refresh();
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label="Delete service"
      disabled={pending}
      onClick={onDelete}
      className="text-muted-foreground hover:text-destructive"
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}
